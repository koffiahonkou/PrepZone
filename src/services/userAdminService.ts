import { createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
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
import { dataStore } from '@/src/services/dataStore';
import {
  evaluateAccountLifecycle,
  getDeactivationThreshold,
  getReactivationThreshold,
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
  reactivationDate?: string | null;
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
    const normalizedReactivationDate = isDev ? null : input.reactivationDate ?? null;
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
      reactivationDate: normalizedReactivationDate,
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

    // 5. Audit Log (User Created + Initial Class Assignments)
    const allClasses = dataStore.getClasses();
    const classNames = (input.classIds || []).map(
      (cid) => allClasses.find((c) => c.id === cid)?.name || cid
    );

    dataStore.addAuditLog({
      actorId: input.adminActorId,
      action: 'USER_CREATED',
      targetType: 'user',
      targetId: createdUid,
      meta: {
        username: usernameLower,
        role: input.role,
        fullName: input.fullName.trim(),
        status: newProfile.status,
        classIds: input.classIds,
        classNames,
        levelIds: input.levelIds,
        reactivationDate: normalizedReactivationDate,
        deactivationDate: normalizedDeactivationDate,
      },
    });

    if (input.classIds.length > 0) {
      dataStore.addAuditLog({
        actorId: input.adminActorId,
        action: 'USER_CLASS_ASSIGNMENTS_UPDATED',
        targetType: 'class_assignment',
        targetId: createdUid,
        meta: {
          username: usernameLower,
          fullName: input.fullName.trim(),
          role: input.role,
          classIds: input.classIds,
          classNames,
          addedClassIds: input.classIds,
          addedClassNames: classNames,
          removedClassIds: [],
          removedClassNames: [],
        },
      });
    }

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
 * Updates both scheduled reactivationDate and deactivationDate for an existing non-developer user.
 */
export async function updateUserLifecycleDates(
  uid: string,
  schedule: {
    reactivationDate?: string | null;
    deactivationDate?: string | null;
  },
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
    throw new AppError('The developer superuser account is permanently active and cannot be scheduled.');
  }

  const nextReactInput =
    schedule.reactivationDate !== undefined
      ? schedule.reactivationDate || null
      : getReactivationThreshold(target);
  const nextDeactInput =
    schedule.deactivationDate !== undefined
      ? schedule.deactivationDate || null
      : getDeactivationThreshold(target);

  const candidate: UserProfile = {
    ...target,
    reactivationDate: nextReactInput,
    deactivationDate: nextDeactInput,
    autoDeactivateAt: nextDeactInput,
  };

  const lifecycle = evaluateAccountLifecycle(candidate);

  const updated: UserProfile = {
    ...candidate,
    status: lifecycle.nextStatus,
    reactivationDate: lifecycle.nextReactivationDate,
    deactivationDate: lifecycle.nextDeactivationDate,
    autoDeactivateAt: lifecycle.nextDeactivationDate,
  };

  dataStore.saveUser(updated, actorId);

  try {
    await setDoc(
      doc(db, 'users', uid),
      sanitizeForFirestore({
        reactivationDate: updated.reactivationDate ?? null,
        deactivationDate: updated.deactivationDate ?? null,
        autoDeactivateAt: updated.deactivationDate ?? null,
        status: updated.status,
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore lifecycle schedule sync deferred:', err);
  }

  dataStore.addAuditLog({
    actorId,
    action: 'USER_LIFECYCLE_SCHEDULE_UPDATED',
    targetType: 'user',
    targetId: uid,
    meta: {
      username: target.username,
      fullName: target.fullName,
      previousStatus: target.status,
      status: updated.status,
      reactivationDate: updated.reactivationDate ?? null,
      previousReactivationDate: getReactivationThreshold(target),
      deactivationDate: updated.deactivationDate ?? null,
      previousDeactivationDate: getDeactivationThreshold(target),
    },
  });

  return updated;
}

/**
 * Updates the scheduled deactivationDate threshold for an existing non-developer user.
 */
export async function updateUserDeactivationDate(
  uid: string,
  deactivationDate: string | null,
  actorId: string
): Promise<UserProfile> {
  return updateUserLifecycleDates(uid, { deactivationDate }, actorId);
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
  reactivationDate?: string | null;
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
  const reactivationThreshold = isDev
    ? null
    : input.reactivationDate !== undefined
    ? input.reactivationDate ?? null
    : getReactivationThreshold(existing);

  const candidate: UserProfile = {
    ...existing,
    fullName: input.fullName.trim(),
    username: isDev ? 'developer' : input.username.trim(),
    usernameLower: isDev ? 'developer' : cleanUsername,
    authEmail: isDev ? existing.authEmail : `${cleanUsername}@${AUTH_DOMAIN}`,
    role: isDev ? 'developer' : input.role === 'developer' ? existing.role : input.role,
    status: isDev ? 'active' : input.status,
    reactivationDate: reactivationThreshold,
    deactivationDate: threshold,
    autoDeactivateAt: threshold,
    levelIds: input.levelIds,
    classIds: input.classIds,
    subjectIds: input.subjectIds ?? existing.subjectIds,
    password: input.password?.trim() || existing.password || 'Eduform123!',
  };

  const lifecycle = evaluateAccountLifecycle(candidate);
  const updated: UserProfile = {
    ...candidate,
    status: isDev ? 'active' : lifecycle.nextStatus,
    reactivationDate: isDev ? null : lifecycle.nextReactivationDate,
    deactivationDate: isDev ? null : lifecycle.nextDeactivationDate,
    autoDeactivateAt: isDev ? null : lifecycle.nextDeactivationDate,
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

  const allClasses = dataStore.getClasses();
  const resolveClassName = (cid: string) => allClasses.find((c) => c.id === cid)?.name || cid;
  const prevClassSet = new Set(existing.classIds || []);
  const nextClassSet = new Set(updated.classIds || []);
  const addedClassIds = (updated.classIds || []).filter((cid) => !prevClassSet.has(cid));
  const removedClassIds = (existing.classIds || []).filter((cid) => !nextClassSet.has(cid));
  const classNames = (updated.classIds || []).map(resolveClassName);

  const changedFields: string[] = [];
  if (existing.fullName !== updated.fullName) changedFields.push('fullName');
  if (existing.usernameLower !== updated.usernameLower) changedFields.push('username');
  if (existing.role !== updated.role) changedFields.push('role');
  if (existing.status !== updated.status) changedFields.push('status');
  if (getReactivationThreshold(existing) !== updated.reactivationDate) {
    changedFields.push('reactivationDate');
  }
  if (getDeactivationThreshold(existing) !== updated.deactivationDate) {
    changedFields.push('deactivationDate');
  }
  if (addedClassIds.length > 0 || removedClassIds.length > 0) {
    changedFields.push('classIds');
  }
  if (JSON.stringify([...(existing.levelIds || [])].sort()) !== JSON.stringify([...(updated.levelIds || [])].sort())) {
    changedFields.push('levelIds');
  }
  if (JSON.stringify([...(existing.subjectIds || [])].sort()) !== JSON.stringify([...(updated.subjectIds || [])].sort())) {
    changedFields.push('subjectIds');
  }
  if (input.password?.trim() && input.password.trim() !== (existing.password || 'Eduform123!')) {
    changedFields.push('password');
  }

  dataStore.addAuditLog({
    actorId,
    action: 'USER_UPDATED',
    targetType: 'user',
    targetId: updated.uid,
    meta: {
      username: updated.username,
      previousUsername: existing.username !== updated.username ? existing.username : undefined,
      fullName: updated.fullName,
      role: updated.role,
      previousRole: existing.role !== updated.role ? existing.role : undefined,
      status: updated.status,
      previousStatus: existing.status !== updated.status ? existing.status : undefined,
      reactivationDate: updated.reactivationDate ?? null,
      deactivationDate: updated.deactivationDate ?? null,
      classIds: updated.classIds,
      classNames,
      changedFields,
    },
  });

  if (addedClassIds.length > 0 || removedClassIds.length > 0) {
    dataStore.addAuditLog({
      actorId,
      action: 'USER_CLASS_ASSIGNMENTS_UPDATED',
      targetType: 'class_assignment',
      targetId: updated.uid,
      meta: {
        username: updated.username,
        fullName: updated.fullName,
        role: updated.role,
        classIds: updated.classIds,
        classNames,
        addedClassIds,
        addedClassNames: addedClassIds.map(resolveClassName),
        removedClassIds,
        removedClassNames: removedClassIds.map(resolveClassName),
      },
    });
  }

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
      classIds: target.classIds || [],
    },
  });
}

/**
 * Evaluates a user account during login; automatically reactivates inactive accounts whose
 * reactivationDate has arrived, and disables active accounts whose deactivationDate has elapsed.
 */
export async function checkAndEnforceUserDeactivationOnLogin(
  user: UserProfile,
  nowMs: number = Date.now()
): Promise<{ deactivated: boolean; reactivated?: boolean; profile: UserProfile }> {
  if (isDeveloperAccount(user)) {
    return { deactivated: false, reactivated: false, profile: user };
  }

  const lifecycle = evaluateAccountLifecycle(user, nowMs);

  if (!lifecycle.changed) {
    return {
      deactivated: lifecycle.nextStatus === 'inactive',
      reactivated: false,
      profile: user,
    };
  }

  const updated: UserProfile = {
    ...user,
    status: lifecycle.nextStatus,
    reactivationDate: lifecycle.nextReactivationDate,
    deactivationDate: lifecycle.nextDeactivationDate,
    autoDeactivateAt: lifecycle.nextDeactivationDate,
  };

  dataStore.saveUser(updated);

  try {
    await updateDoc(doc(db, 'users', user.uid), {
      status: updated.status,
      reactivationDate: updated.reactivationDate ?? null,
      deactivationDate: updated.deactivationDate ?? null,
      autoDeactivateAt: updated.deactivationDate ?? null,
    });
  } catch {
    // Non-fatal if user is in local demo store or offline
  }

  if (lifecycle.event === 'activated') {
    dataStore.addAuditLog({
      actorId: 'system-login-check',
      action: 'USER_AUTO_REACTIVATED',
      targetType: 'user',
      targetId: user.uid,
      meta: {
        username: user.username,
        fullName: user.fullName,
        reactivationDate: getReactivationThreshold(user),
        deactivationDate: updated.deactivationDate ?? null,
        trigger: 'login_check',
      },
    });
    return { deactivated: false, reactivated: true, profile: updated };
  }

  if (lifecycle.event === 'deactivated') {
    dataStore.addAuditLog({
      actorId: 'system-login-check',
      action: 'USER_AUTO_DEACTIVATED',
      targetType: 'user',
      targetId: user.uid,
      meta: {
        username: user.username,
        fullName: user.fullName,
        deactivationDate: getDeactivationThreshold(user),
        trigger: 'login_check',
      },
    });
  }

  return {
    deactivated: updated.status === 'inactive',
    reactivated: false,
    profile: updated,
  };
}

/**
 * Scheduled job runner: scans accounts in Firestore and local dataStore and applies both
 * automatic deactivations (when deactivationDate is reached) and automatic reactivations
 * (when an inactive/old account reaches its scheduled reactivationDate).
 */
export async function deactivateExpiredAccounts(
  actorId: string = 'system-scheduler',
  nowMs: number = Date.now()
): Promise<UserProfile[]> {
  const candidatesMap = new Map<string, UserProfile>();

  // 1. Collect users from local store (also triggers local normalization)
  for (const localUser of dataStore.getUsers()) {
    candidatesMap.set(localUser.uid, localUser);
  }

  // 2. Collect users from Firestore cloud (both active and inactive so reactivationDates are checked too)
  try {
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach((d) => {
      const remote = d.data() as UserProfile;
      if (remote?.uid) {
        candidatesMap.set(remote.uid, remote);
      }
    });
  } catch {
    // Fallback gracefully to local store when offline or unconfigured
  }

  const transitioned: UserProfile[] = [];

  for (const user of candidatesMap.values()) {
    if (isDeveloperAccount(user)) continue;
    const lifecycle = evaluateAccountLifecycle(user, nowMs);
    if (!lifecycle.changed) continue;

    const updated: UserProfile = {
      ...user,
      status: lifecycle.nextStatus,
      reactivationDate: lifecycle.nextReactivationDate,
      deactivationDate: lifecycle.nextDeactivationDate,
      autoDeactivateAt: lifecycle.nextDeactivationDate,
    };

    dataStore.saveUser(updated);
    transitioned.push(updated);

    try {
      await setDoc(
        doc(db, 'users', updated.uid),
        sanitizeForFirestore({
          status: updated.status,
          reactivationDate: updated.reactivationDate ?? null,
          deactivationDate: updated.deactivationDate ?? null,
          autoDeactivateAt: updated.deactivationDate ?? null,
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn(`Firestore lifecycle sync deferred for ${updated.uid}:`, err);
    }

    if (lifecycle.event === 'deactivated') {
      dataStore.addAuditLog({
        actorId,
        action: 'USER_AUTO_DEACTIVATED',
        targetType: 'user',
        targetId: updated.uid,
        meta: {
          username: updated.username,
          fullName: updated.fullName,
          deactivationDate: getDeactivationThreshold(user),
          trigger: 'scheduled_job',
        },
      });
    } else if (lifecycle.event === 'activated') {
      dataStore.addAuditLog({
        actorId,
        action: 'USER_AUTO_REACTIVATED',
        targetType: 'user',
        targetId: updated.uid,
        meta: {
          username: updated.username,
          fullName: updated.fullName,
          reactivationDate: getReactivationThreshold(user),
          deactivationDate: updated.deactivationDate ?? null,
          trigger: 'scheduled_job',
        },
      });
    }
  }

  if (transitioned.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eduform_users_updated'));
  }

  return transitioned;
}

export const processScheduledAccountLifecycle = deactivateExpiredAccounts;

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
