import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, AUTH_DOMAIN, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { UserProfile } from '@/src/types';
import { AppError } from '@/src/lib/errors';

export async function loginWithUsername(usernameRaw: string, passwordRaw: string): Promise<{
  user: FirebaseUser;
  profile: UserProfile;
}> {
  const username = usernameRaw.trim().toLowerCase();
  if (!username) {
    throw new AppError('Username is required.', 'auth/empty-username');
  }

  const syntheticEmail = `${username}@${AUTH_DOMAIN}`;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, passwordRaw);
    const user = userCredential.user;

    // Fetch user profile from Firestore
    const profile = await getUserProfile(user.uid);
    if (!profile) {
      await fbSignOut(auth);
      throw new AppError(
        'User account profile not found. Please contact an administrator.',
        'auth/profile-not-found'
      );
    }

    if (profile.status === 'inactive') {
      await fbSignOut(auth);
      throw new AppError(
        'Your account has been deactivated. Please contact your school administrator.',
        'auth/account-inactive'
      );
    }

    // Update lastLoginAt
    await updateLastLogin(user.uid);

    return { user, profile };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    const err = error as { code?: string; message?: string };
    if (
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/invalid-email'
    ) {
      throw new AppError('Invalid username or password.', 'auth/invalid-credentials');
    }
    if (err.code === 'auth/too-many-requests') {
      throw new AppError(
        'Too many failed attempts. Please try again in a few minutes or contact your administrator.',
        'auth/too-many-requests'
      );
    }
    throw new AppError(
      err.message || 'Unable to sign in. Please verify your credentials or server connection.',
      err.code
    );
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  try {
    const snapshot = await getDoc(userDocRef);
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function updateLastLogin(uid: string): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  const now = new Date().toISOString();
  try {
    await updateDoc(userDocRef, {
      lastLoginAt: now,
    });
  } catch (error) {
    // Non-fatal if firestore is restricted or offline
    console.warn('Failed to update last login timestamp:', error);
  }
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}
