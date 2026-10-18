import { createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db, AUTH_DOMAIN, getSecondaryAuth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { UserProfile, UserRole } from '@/src/types';
import { AppError } from '@/src/lib/errors';
import { logAuditEvent } from '@/src/services/auditService';

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
    const newProfile: UserProfile = {
      uid: createdUid,
      username: input.username.trim(),
      usernameLower,
      authEmail: syntheticEmail,
      fullName: input.fullName.trim(),
      role: input.role,
      status: 'active',
      classIds: input.classIds,
      levelIds: input.levelIds,
      createdBy: input.adminActorId,
      createdAt: now,
      lastLoginAt: null,
    };

    // 4. Save username lock doc and user profile using admin's primary session
    await setDoc(usernameLockRef, {
      uid: createdUid,
      reservedAt: now,
      reservedBy: input.adminActorId,
    });

    const userProfileRef = doc(db, 'users', createdUid);
    await setDoc(userProfileRef, newProfile);

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
