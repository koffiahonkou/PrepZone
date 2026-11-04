import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseAppletConfig from '@/firebase-applet-config.json';

export const AUTH_DOMAIN = 'eduform.local';

export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: firebaseAppletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'eduform-app.firebaseapp.com',
  projectId: firebaseAppletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0986164683',
  firestoreDatabaseId:
    (import.meta.env.VITE_FIREBASE_DATABASE_ID && import.meta.env.VITE_FIREBASE_DATABASE_ID !== '(default)')
      ? import.meta.env.VITE_FIREBASE_DATABASE_ID
      : (firebaseAppletConfig.firestoreDatabaseId || 'ai-studio-prepzone-aa3c7d88-f6dc-41ae-a20b-c6ca87ada9f5'),
  storageBucket: firebaseAppletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0986164683.firebasestorage.app',
  messagingSenderId: firebaseAppletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '116647386178',
  appId: firebaseAppletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '1:116647386178:web:411ca7a87424ee9124a1db',
};

// Primary App
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId to connect to the provisioned database
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage: FirebaseStorage = getStorage(app);

// Validate Connection to Firestore on startup as mandated by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Secondary App factory to avoid signing out the active admin during user creation
const SECONDARY_APP_NAME = 'admin-secondary';

export function getSecondaryApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  if (existing) {
    return existing;
  }
  return initializeApp(firebaseConfig, SECONDARY_APP_NAME);
}

export function getSecondaryAuth(): Auth {
  return getAuth(getSecondaryApp());
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively removes unsupported `undefined` field values from objects and arrays,
 * preventing FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => (item === undefined ? null : sanitizeForFirestore(item))) as unknown as T;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (val !== undefined) {
      cleaned[key] = sanitizeForFirestore(val);
    }
  }
  return cleaned as T;
}

/**
 * Ensures that any document written to Firestore does not exceed the hard 1 MiB limit (1,048,576 bytes).
 * Intelligently compacts and strips oversized base64 strings if they exceed the 850,000-byte safe threshold.
 */
export function enforceFirestoreSizeLimit<T>(data: T, maxBytes: number = 850_000): T {
  const sanitized = sanitizeForFirestore(data);
  try {
    const jsonStr = JSON.stringify(sanitized);
    const size = new TextEncoder().encode(jsonStr).length;
    if (size <= maxBytes) {
      return sanitized;
    }

    console.warn(`Firestore payload exceeds safe threshold (${size} bytes > ${maxBytes} bytes). Compacting oversized fields...`);

    function pruneOversizedFields(obj: unknown): unknown {
      if (typeof obj === 'string') {
        if (obj.startsWith('data:') && obj.length > 50_000) {
          return '[Data omitted: file exceeds Firestore 1MB document limit]';
        }
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(pruneOversizedFields);
      }
      if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
        const res: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          // Drop redundant attachment dataUrl if present
          if (k === 'dataUrl') continue;
          res[k] = pruneOversizedFields(v);
        }
        return res;
      }
      return obj;
    }

    return pruneOversizedFields(sanitized) as T;
  } catch {
    return sanitized;
  }
}

