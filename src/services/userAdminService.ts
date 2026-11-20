import { createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  db,
  AUTH_DOMAIN,
  getSecondaryAuth,
  handleFirestoreError,
  OperationType,
  sanitizeForFirestore,
} from '@/src/lib/firebase';
import { UserProfile, UserRole } from '@/src/types';
import { AppError } from '@/src/lib/errors';
import { logAuditEvent } from '@/src/services/auditService';
import { dataStore } from '@/src/services/dataStore';
import {
  getDeactivationThreshold,
  isAutoDeactivationDue,
  isDeveloperAccount,
} from '@/src/utils/accountLifecycle';

export const USERNAME_REGEX = /^[a-z0-9._-]+$/;

export function validateUsernameFormat(username: string): { isValid: boolean; message?: string } {
  const normalized = username.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 20) {
    return { isValid: false, message: 'Username must be between 3 and 20 characters.' };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      isValid: false,
      message: 'Username may only contain lowercase letters, numbers, dots, hyphens, and underscores.',
    };
  }
  return { isValid: true };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const usernameLower = username.trim().toLowerCase();
  const formatCheck = validateUsernameFormat(usernameLower);
  if (!formatCheck.isValid) {
    return false;
  }
  try {
    const lockRef = doc(db, 'usernames', usernameLower);
    const lockDoc = await getDoc(lockRef);
    return !lockDoc.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `usernames/${usernameLower}`);
  }
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  classIds: string[];
  levelIds: string[];
  adminActorId: string;
  deactivationDate?: string | null;
}

export async function createUserAsAdmin(input: CreateUserInput): Promise<UserProfile> {
  const usernameLower = input.username.trim().toLowerCase();
  const validation = validateUsernameFormat(usernameLower);
  if (!validation.isValid) {
    throw new AppError(validation.message || 'Invalid username format.');
  }

  if (input.password.length < 6) {
    throw new AppError('Password must be at least 6 characters long.');
  }

  const syntheticEmail = `${usernameLower}@${AUTH_DOMAIN}`;
  const secondaryAuth = getSecondaryAuth();

  let createdUid: string | null = null;

  try {
    // 1. Transactionally verify and reserve username lock
    const usernameLockRef = doc(db, 'usernames', usernameLower);
    await runTransaction(db, async (transaction) => {
      const lockDoc = await transaction.get(usernameLockRef);
      if (lockDoc.exists()) {
        throw new AppError(`Username "${usernameLower}" is already taken.`);
      }
    });

    // 2. Create the user using isolated secondary Firebase auth instance
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      syntheticEmail,
      input.password
    );
    createdUid = credential.user.uid;

    // 3. Immediately sign out the secondary auth instance so admin session remains clean
    await secondarySignOut(secondaryAuth);

    const now = new Date().toISOString();
    const isDev = input.role === 'developer' || usernameLower === 'developer';
    const normalizedDeactivationDate = isDev ? null : input.deactivationDate ?? null;
    const shouldDeactivateImmediately =
      !isDev &&
      isAutoDeactivationDue({
        uid: createdUid,
        usernameLower,
        role: input.role,
        deactivationDate: normalizedDeactivationDate,
      });

    const newProfile: UserProfile = {
      uid: createdUid,
      username: input.username.trim(),
      usernameLower,
      authEmail: syntheticEmail,
      fullName: input.fullName.trim(),
      role: input.role,
      status: shouldDeactivateImmediately ? 'inactive' : 'active',
      classIds: input.classIds,
      levelIds: input.levelIds,
      createdBy: input.adminActorId,
      createdAt: now,
      lastLoginAt: null,
      deactivationDate: normalizedDeactivationDate,
      autoDeactivateAt: normalizedDeactivationDate,
    };

    // 4. Save username lock doc and user profile using admin's primary session
    await setDoc(usernameLockRef, {
      uid: createdUid,
      reservedAt: now,
      reservedBy: input.adminActorId,
    });

    const userProfileRef = doc(db, 'users', createdUid);
    await setDoc(userProfileRef, sanitizeForFirestore(newProfile));
    dataStore.saveUser(newProfile, input.adminActorId);

    // 5. Audit Log
    await logAuditEvent({
      actorId: input.adminActorId,
      action: 'USER_CREATED',
      targetType: 'user',
      targetId: createdUid,
      meta: {
        username: usernameLower,
        role: input.role,
        fullName: input.fullName,
        deactivationDate: normalizedDeactivationDate,
      },
    });

    return newProfile;
  } catch (error: unknown) {
    // If secondary auth was created but profile failed, ensure secondary is signed out
    try {
      await secondarySignOut(secondaryAuth);
    } catch {
      // ignore secondary signout errors
    }

    if (error instanceof AppError) {
      throw error;
    }
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/email-already-in-use') {
      throw new AppError(`Username "${usernameLower}" is already taken in authentication.`);
    }
    throw new AppError(err.message || 'Failed to create user account.', err.code);
  }
}

/**
 * Updates the scheduled deactivationDate threshold for an existing non-developer user.
 */
export async function updateUserDeactivationDate(
  uid: string,
  deactivationDate: string | null,
  actorId: string
): Promise<UserProfile> {
  const existing = dataStore.getUserById(uid);
  const userSnap = existing ? null : await getDoc(doc(db, 'users', uid));
  const target: UserProfile | undefined =
    existing || (userSnap?.exists() ? (userSnap.data() as UserProfile) : undefined);

  if (!target) {
    throw new AppError('User account not found.');
  }

  if (isDeveloperAccount(target)) {
    throw new AppError('The developer superuser account is permanently active and cannot be deactivated.');
  }

  const normalizedDate = deactivationDate || null;
  const expired = isAutoDeactivationDue({
    ...target,
    deactivationDate: normalizedDate,
    autoDeactivateAt: normalizedDate,
  });

  const updated: UserProfile = {
    ...target,
    deactivationDate: normalizedDate,
    autoDeactivateAt: normalizedDate,
    status: expired ? 'inactive' : target.status,
  };

  dataStore.saveUser(updated, actorId);

  try {
    await setDoc(
      doc(db, 'users', uid),
      sanitizeForFirestore({
        deactivationDate: normalizedDate,
        autoDeactivateAt: normalizedDate,
        status: updated.status,
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore deactivationDate sync deferred:', err);
  }

  await logAuditEvent({
    actorId,
    action: 'USER_DEACTIVATION_SCHEDULE_UPDATED',
    targetType: 'user',
    targetId: uid,
    meta: {
      username: target.username,
      deactivationDate: normalizedDate,
      status: updated.status,
    },
  });

  return updated;
}

export interface UpdateUserInput {
  fullName: string;
  username: string;
  role: UserRole;
  status: 'active' | 'inactive';
  levelIds: string[];
  classIds: string[];
  subjectIds?: string[];
  password?: string;
  deactivationDate?: string | null;
}

/**
 * Updates an existing user account in local store and Firestore, preserving developer protections
 * and updating username locks if the username changed.
 */
export async function updateUserAsAdmin(
  uid: string,
  input: UpdateUserInput,
  actorId: string
): Promise<UserProfile> {
  const existing = dataStore.getUserById(uid);
  if (!existing) {
    throw new AppError('User account not found.');
  }

  if (isDeveloperAccount(existing) && actorId !== existing.uid) {
    throw new AppError('The developer superuser account is protected and cannot be edited by other users.');
  }

  const cleanUsername = input.username.trim().toLowerCase();
  const validation = validateUsernameFormat(cleanUsername);
  if (!validation.isValid) {
    throw new AppError(validation.message || 'Invalid username format.');
  }

  if (cleanUsername === 'developer' && !isDeveloperAccount(existing)) {
    throw new AppError('The username "@developer" is strictly reserved for the system developer account.');
  }

  if (existing.usernameLower !== cleanUsername) {
    const duplicate = dataStore.getUsers().find(
      (u) => u.uid !== uid && u.usernameLower === cleanUsername
    );
    if (duplicate) {
      throw new AppError(`Username "@${cleanUsername}" is already taken.`);
    }
  }

  const isDev = isDeveloperAccount(existing);
  const threshold = isDev ? null : input.deactivationDate ?? null;

  const updated: UserProfile = {
    ...existing,
    fullName: input.fullName.trim(),
    username: isDev ? 'developer' : input.username.trim(),
    usernameLower: isDev ? 'developer' : cleanUsername,
    authEmail: isDev ? existing.authEmail : `${cleanUsername}@${AUTH_DOMAIN}`,
    role: isDev ? 'developer' : input.role === 'developer' ? existing.role : input.role,
    status: isDev ? 'active' : input.status,
    deactivationDate: threshold,
    autoDeactivateAt: threshold,
    levelIds: input.levelIds,
    classIds: input.classIds,
    subjectIds: input.subjectIds ?? existing.subjectIds,
    password: input.password?.trim() || existing.password || 'Eduform123!',
  };

  const saved = dataStore.saveUser(updated, actorId);
  if (!saved) {
    throw new AppError('Unable to update this protected account.');
  }

  // Sync username reservation lock in Firestore if username changed
  if (!isDev && existing.usernameLower !== cleanUsername) {
    try {
      await deleteDoc(doc(db, 'usernames', existing.usernameLower));
      await setDoc(doc(db, 'usernames', cleanUsername), {
        uid: updated.uid,
        reservedAt: new Date().toISOString(),
        reservedBy: actorId,
      });
    } catch {
      // Non-fatal in offline/placeholder mode
    }
  }

  dataStore.addAuditLog({
    actorId,
    action: 'USER_UPDATED',
    targetType: 'user',
    targetId: updated.uid,
    meta: {
      username: updated.username,
      role: updated.role,
      status: updated.status,
      deactivationDate: updated.deactivationDate,
    },
  });

  void logAuditEvent({
    actorId,
    action: 'USER_UPDATED',
    targetType: 'user',
    targetId: updated.uid,
    meta: {
      username: updated.username,
      role: updated.role,
      status: updated.status,
      deactivationDate: updated.deactivationDate,
    },
  });

  return updated;
}

/**
 * Permanently deletes a non-developer user account from local store, Firestore users, and username locks.
 */
export async function deleteUserAsAdmin(uid: string, actorId: string): Promise<void> {
  const target = dataStore.getUserById(uid);
  if (!target) {
    throw new AppError('User account not found.');
  }

  if (isDeveloperAccount(target)) {
    throw new AppError('The developer superuser account is protected and cannot be deleted.');
  }

  if (uid === actorId) {
    throw new AppError('You cannot delete your own account while signed in.');
  }

  const deleted = dataStore.deleteUser(uid);
  if (!deleted) {
    throw new AppError('Failed to delete user account.');
  }

  try {
    if (target.usernameLower) {
      await deleteDoc(doc(db, 'usernames', target.usernameLower));
    }
  } catch {
    // Non-fatal in offline/placeholder mode
  }

  dataStore.addAuditLog({
    actorId,
    action: 'USER_DELETED',
    targetType: 'user',
    targetId: uid,
    meta: {
      username: target.username,
      fullName: target.fullName,
      role: target.role,
    },
  });

  void logAuditEvent({
    actorId,
    action: 'USER_DELETED',
    targetType: 'user',
    targetId: uid,
    meta: {
      username: target.username,
      fullName: target.fullName,
      role: target.role,
    },
  });
}

/**
 * Evaluates a user account during login; if current date exceeds the deactivationDate
 * threshold, disables the account in Firestore and local store before blocking access.
 */
export async function checkAndEnforceUserDeactivationOnLogin(
  user: UserProfile,
  nowMs: number = Date.now()
): Promise<{ deactivated: boolean; profile: UserProfile }> {
  if (isDeveloperAccount(user)) {
    return { deactivated: false, profile: user };
  }

  const threshold = getDeactivationThreshold(user);
  const due = isAutoDeactivationDue(user, nowMs);

  if (user.status === 'inactive') {
    return { deactivated: true, profile: user };
  }

  if (!due) {
    return { deactivated: false, profile: user };
  }

  const updated: UserProfile = {
    ...user,
    status: 'inactive',
    deactivationDate: threshold,
    autoDeactivateAt: threshold,
  };

  dataStore.saveUser(updated);

  try {
    await updateDoc(doc(db, 'users', user.uid), {
      status: 'inactive',
      deactivationDate: threshold,
      autoDeactivateAt: threshold,
    });
  } catch {
    // Non-fatal if user is in local demo store or offline
  }

  await logAuditEvent({
    actorId: 'system-login-check',
    action: 'USER_AUTO_DEACTIVATED',
    targetType: 'user',
    targetId: user.uid,
    meta: {
      username: user.username,
      deactivationDate: threshold,
      trigger: 'login_check',
    },
  });

  return { deactivated: true, profile: updated };
}

/**
 * Scheduled job runner: scans active accounts in Firestore and local dataStore and disables
 * any non-developer account whose current date exceeds its configured deactivationDate.
 */
export async function deactivateExpiredAccounts(
  actorId: string = 'system-scheduler',
  nowMs: number = Date.now()
): Promise<UserProfile[]> {
  const candidatesMap = new Map<string, UserProfile>();

  // 1. Collect active users from local store (also triggers local normalization)
  for (const localUser of dataStore.getUsers()) {
    candidatesMap.set(localUser.uid, localUser);
  }

  // 2. Collect active users from Firestore cloud
  try {
    const activeQuery = query(collection(db, 'users'), where('status', '==', 'active'));
    const snap = await getDocs(activeQuery);
    snap.forEach((d) => {
      const remote = d.data() as UserProfile;
      if (remote?.uid) {
        candidatesMap.set(remote.uid, remote);
      }
    });
  } catch {
    // Fallback gracefully to local store when offline or unconfigured
  }

  const newlyDeactivated: UserProfile[] = [];

  for (const user of candidatesMap.values()) {
    if (isDeveloperAccount(user)) continue;
    if (user.status !== 'active') continue;
    if (!isAutoDeactivationDue(user, nowMs)) continue;

    const threshold = getDeactivationThreshold(user);
    const updated: UserProfile = {
      ...user,
      status: 'inactive',
      deactivationDate: threshold,
      autoDeactivateAt: threshold,
    };

    dataStore.saveUser(updated);
    newlyDeactivated.push(updated);

    try {
      await setDoc(
        doc(db, 'users', updated.uid),
        sanitizeForFirestore({
          status: 'inactive',
          deactivationDate: threshold,
          autoDeactivateAt: threshold,
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn(`Firestore auto-deactivation sync deferred for ${updated.uid}:`, err);
    }

    await logAuditEvent({
      actorId,
      action: 'USER_AUTO_DEACTIVATED',
      targetType: 'user',
      targetId: updated.uid,
      meta: {
        username: updated.username,
        deactivationDate: threshold,
        trigger: 'scheduled_job',
      },
    });
  }

  if (newlyDeactivated.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eduform_users_updated'));
  }

  return newlyDeactivated;
}

let scheduledJobTimer: ReturnType<typeof setInterval> | null = null;
let jobRunning = false;

/**
 * Starts the recurring client-side scheduled job for account auto-deactivation.
 * Runs immediately once and then every `intervalMs` milliseconds.
 */
export function startScheduledDeactivationJob(intervalMs: number = 60_000): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const runTick = async () => {
    if (jobRunning) return;
    jobRunning = true;
    try {
      await deactivateExpiredAccounts('system-scheduler');
    } catch (err) {
      console.warn('Scheduled deactivation job tick error:', err);
    } finally {
      jobRunning = false;
    }
  };

  if (scheduledJobTimer) {
    clearInterval(scheduledJobTimer);
  }

  void runTick();
  scheduledJobTimer = setInterval(() => {
    void runTick();
  }, intervalMs);

  return () => stopScheduledDeactivationJob();
}

export function stopScheduledDeactivationJob(): void {
  if (scheduledJobTimer) {
    clearInterval(scheduledJobTimer);
    scheduledJobTimer = null;
  }
}
