import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as fbSignOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, firebaseConfig } from '@/src/lib/firebase';
import { UserProfile } from '@/src/types';
import { loginWithUsername, getUserProfile } from '@/src/services/authService';
import { dataStore } from '@/src/services/dataStore';
import { AppError } from '@/src/lib/errors';

export const DEMO_USERS: Record<string, UserProfile> = {
  admin: {
    uid: 'demo-admin-uid',
    username: 'admin',
    usernameLower: 'admin',
    authEmail: 'admin@eduform.local',
    fullName: 'Dr. Evelyn Reed (Head of Academics)',
    role: 'admin',
    status: 'active',
    classIds: ['class-jss1-a', 'class-jss1-b', 'class-jss2-a', 'class-ss1-sci'],
    levelIds: ['level-basic', 'level-jhs', 'level-shs'],
    subjectIds: ['subj-mth', 'subj-eng', 'subj-sci', 'subj-tec', 'subj-sos', 'subj-csc'],
    password: 'Eduform123!',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  teacher1: {
    uid: 'demo-teacher-clara',
    username: 'mrs.adebayo',
    usernameLower: 'mrs.adebayo',
    authEmail: 'mrs.adebayo@eduform.local',
    fullName: 'Mrs. Clara Adebayo (STEM Lead)',
    role: 'teacher',
    status: 'active',
    classIds: ['class-jss1-a', 'class-jss1-b', 'class-jss2-a'],
    levelIds: ['level-basic', 'level-jhs'],
    subjectIds: ['subj-mth', 'subj-sci', 'subj-csc'],
    password: 'Eduform123!',
    createdBy: 'demo-admin-uid',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  student1: {
    uid: 'demo-student-alex',
    username: 'alex.smith',
    usernameLower: 'alex.smith',
    authEmail: 'alex.smith@eduform.local',
    fullName: 'Alex Smith',
    role: 'student',
    status: 'active',
    classIds: ['class-jss1-a'],
    levelIds: ['level-basic'],
    subjectIds: ['subj-mth', 'subj-eng', 'subj-sci', 'subj-csc'],
    password: 'Eduform123!',
    createdBy: 'demo-admin-uid',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  student2: {
    uid: 'demo-student-sarah',
    username: 'sarah.jenkins',
    usernameLower: 'sarah.jenkins',
    authEmail: 'sarah.jenkins@eduform.local',
    fullName: 'Sarah Jenkins',
    role: 'student',
    status: 'active',
    classIds: ['class-jss1-b'],
    levelIds: ['level-basic'],
    subjectIds: ['subj-mth', 'subj-eng', 'subj-sci', 'subj-sos'],
    password: 'Eduform123!',
    createdBy: 'demo-admin-uid',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  inactive_user: {
    uid: 'demo-student-inactive',
    username: 'jordan.inactive',
    usernameLower: 'jordan.inactive',
    authEmail: 'jordan.inactive@eduform.local',
    fullName: 'Jordan Doe (Deactivated)',
    role: 'student',
    status: 'inactive',
    classIds: ['class-jss1-a'],
    levelIds: ['level-basic'],
    subjectIds: ['subj-mth', 'subj-eng'],
    password: 'Eduform123!',
    createdBy: 'demo-admin-uid',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
};

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoUser: (key: 'admin' | 'teacher1' | 'student1' | 'student2' | 'inactive_user') => void;
  isPlaceholderMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_STORAGE_DEMO_KEY = 'eduform_demo_profile_key';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaceholderMode, setIsPlaceholderMode] = useState<boolean>(false);

  useEffect(() => {
    // Check if running with placeholder config
    const isPlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'placeholder-api-key';
    setIsPlaceholderMode(isPlaceholder);

    // If active profile is preserved in localStorage, restore it from dataStore or DEMO_USERS
    const savedUserId = localStorage.getItem(LOCAL_STORAGE_DEMO_KEY);
    if (savedUserId) {
      const storedUser = dataStore.getUserById(savedUserId) || DEMO_USERS[savedUserId];
      if (storedUser) {
        if (storedUser.status === 'active') {
          setProfile(storedUser);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
        }
      }
    }

    // Fallback timeout to guarantee UI always renders immediately
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 250);

    try {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        clearTimeout(fallbackTimer);
        if (fbUser) {
          setUser(fbUser);
          try {
            const userProfile = await getUserProfile(fbUser.uid);
            if (userProfile) {
              if (userProfile.status === 'inactive') {
                await fbSignOut(auth);
                setUser(null);
                setProfile(null);
              } else {
                setProfile(userProfile);
              }
            }
          } catch {
            // Profile fetch error
          }
        } else {
          setUser(null);
          if (!localStorage.getItem(LOCAL_STORAGE_DEMO_KEY)) {
            setProfile(null);
          }
        }
        setLoading(false);
      });

      return () => {
        clearTimeout(fallbackTimer);
        unsubscribe();
      };
    } catch {
      clearTimeout(fallbackTimer);
      setLoading(false);
    }
  }, []);

  const signIn = async (username: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const uname = username.trim().toLowerCase();
      if (!uname) {
        throw new AppError('Username is required.', 'auth/empty-username');
      }
      if (!password) {
        throw new AppError('Password is required for verification.', 'auth/empty-password');
      }

      // Check registered accounts in dataStore
      const registeredUser = dataStore.getUserByUsername(uname);
      if (registeredUser) {
        const expectedPassword = registeredUser.password || 'Eduform123!';
        // Password verification check
        if (password !== expectedPassword) {
          throw new AppError(
            'Password verification failed. Incorrect password for user @' + registeredUser.username + '.',
            'auth/wrong-password'
          );
        }

        if (registeredUser.status === 'inactive') {
          throw new AppError(
            'Your account has been deactivated. Please contact your school administrator.',
            'auth/account-inactive'
          );
        }

        const now = new Date().toISOString();
        const updatedUser: UserProfile = {
          ...registeredUser,
          lastLoginAt: now,
        };
        dataStore.saveUser(updatedUser);
        localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, updatedUser.uid);
        setProfile(updatedUser);
        setLoading(false);
        return;
      }

      // Check demo accounts fallback
      const demoMatch = Object.entries(DEMO_USERS).find(
        ([, p]) => p.usernameLower === uname
      );

      if (demoMatch) {
        const [demoKey, demoProf] = demoMatch;
        const expectedPassword = demoProf.password || 'Eduform123!';
        // Password verification check
        if (password !== expectedPassword) {
          throw new AppError(
            'Password verification failed. Incorrect password for demo user @' + demoProf.username + '.',
            'auth/wrong-password'
          );
        }

        if (demoProf.status === 'inactive') {
          throw new AppError(
            'Your account has been deactivated. Please contact your school administrator.',
            'auth/account-inactive'
          );
        }

        localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, demoKey);
        setProfile({
          ...demoProf,
          lastLoginAt: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      // Live Firebase Sign-In if account not in local dataStore
      try {
        const { user: fbUser, profile: fbProfile } = await loginWithUsername(username, password);
        localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
        setUser(fbUser);
        setProfile(fbProfile);
      } catch (fbErr: any) {
        throw new AppError(
          fbErr.message || 'No active account found for username @' + uname + '. Please verify your credentials.',
          fbErr.code || 'auth/invalid-credentials'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      setUser(fbUser);

      // Fetch or auto-provision profile in Firestore and local state
      let userProfile = await getUserProfile(fbUser.uid);
      if (!userProfile) {
        const isSuper = fbUser.email === 'saltechmultimedia@gmail.com';
        const role: 'admin' | 'student' = isSuper ? 'admin' : 'student';
        const username = fbUser.email ? fbUser.email.split('@')[0] : `user_${fbUser.uid.slice(0, 6)}`;
        userProfile = {
          uid: fbUser.uid,
          username,
          usernameLower: username.toLowerCase(),
          authEmail: fbUser.email || `${username}@eduform.local`,
          fullName: fbUser.displayName || 'Google User',
          role,
          status: 'active',
          classIds: ['class-jss1-a'],
          levelIds: ['level-basic'],
          subjectIds: ['subj-mth', 'subj-eng', 'subj-sci'],
          createdBy: 'google-oauth',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        dataStore.saveUser(userProfile);
      }
      setProfile(userProfile);
      localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, userProfile.uid);
    } catch (err: unknown) {
      console.error('Google Sign-In error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
      sessionStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
      setUser(null);
      setProfile(null);
      setLoading(false);

      // Attempt Firebase signOut with safe timeout so placeholder or offline mode never hangs
      try {
        await Promise.race([
          fbSignOut(auth),
          new Promise((resolve) => setTimeout(resolve, 300)),
        ]);
      } catch {
        // Safe to ignore in placeholder / offline mode
      }
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const switchDemoUser = (key: 'admin' | 'teacher1' | 'student1' | 'student2' | 'inactive_user') => {
    const demoProf = DEMO_USERS[key] || dataStore.getUsers().find((u) => u.usernameLower === key);
    if (!demoProf) {
      throw new AppError('Demo account not found.');
    }
    if (demoProf.status === 'inactive') {
      localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
      setProfile(null);
      setUser(null);
      throw new AppError('Your account has been deactivated. Please contact your school administrator.');
    }
    localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, demoProf.uid || key);
    setProfile({
      ...demoProf,
      lastLoginAt: new Date().toISOString(),
    });
  };

  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
  const isTeacher = profile?.role === 'teacher' && profile?.status === 'active';
  const isStudent = profile?.role === 'student' && profile?.status === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isTeacher,
        isStudent,
        signIn,
        signInWithGoogle,
        signOut,
        switchDemoUser,
        isPlaceholderMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
