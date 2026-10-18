import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'eduform-app.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'eduform-app',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'eduform-app.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

const AUTH_DOMAIN = 'eduform.local';
const DEFAULT_PASSWORD = 'Eduform123!';

export async function runSeed() {
  console.log('🌱 Starting EduForm seed process...');

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 1. Levels (3 Levels)
  const levels = [
    { id: 'level-jss1', name: 'Junior Secondary 1 (JSS 1)', order: 1 },
    { id: 'level-jss2', name: 'Junior Secondary 2 (JSS 2)', order: 2 },
    { id: 'level-ss1', name: 'Senior Secondary 1 (SS 1)', order: 3 },
  ];

  console.log('Inserting 3 Academic Levels...');
  for (const lvl of levels) {
    const ref = doc(db, 'levels', lvl.id);
    batch.set(ref, lvl);
  }

  // 2. Subjects (6 Subjects)
  const subjects = [
    { id: 'subj-mth', name: 'Mathematics', code: 'MTH101' },
    { id: 'subj-eng', name: 'English Language', code: 'ENG101' },
    { id: 'subj-sci', name: 'Basic Science', code: 'SCI101' },
    { id: 'subj-tec', name: 'Basic Technology', code: 'TEC101' },
    { id: 'subj-sos', name: 'Social Studies', code: 'SOS101' },
    { id: 'subj-csc', name: 'Computer Studies', code: 'CSC101' },
  ];

  console.log('Inserting 6 Subjects...');
  for (const sub of subjects) {
    const ref = doc(db, 'subjects', sub.id);
    batch.set(ref, sub);
  }

  // 3. Classes (4 Classes)
  const classes = [
    {
      id: 'class-jss1-a',
      name: 'JSS 1 Alpha',
      levelId: 'level-jss1',
      subjectIds: ['subj-mth', 'subj-eng', 'subj-sci', 'subj-csc'],
      createdAt: now,
    },
    {
      id: 'class-jss1-b',
      name: 'JSS 1 Beta',
      levelId: 'level-jss1',
      subjectIds: ['subj-mth', 'subj-eng', 'subj-sci', 'subj-sos'],
      createdAt: now,
    },
    {
      id: 'class-jss2-a',
      name: 'JSS 2 Gold',
      levelId: 'level-jss2',
      subjectIds: ['subj-mth', 'subj-eng', 'subj-sci', 'subj-tec', 'subj-csc'],
      createdAt: now,
    },
    {
      id: 'class-ss1-sci',
      name: 'SS 1 Science',
      levelId: 'level-ss1',
      subjectIds: ['subj-mth', 'subj-eng', 'subj-sci', 'subj-csc'],
      createdAt: now,
    },
  ];

  console.log('Inserting 4 Classes...');
  for (const cls of classes) {
    const ref = doc(db, 'classes', cls.id);
    batch.set(ref, cls);
  }

  // 4. Global Settings
  const settingsRef = doc(db, 'settings', 'global');
  batch.set(settingsRef, {
    appName: 'EduForm',
    defaultPassMarkPercent: 50,
    academicTermLabel: '2026/2027 Term 1',
    updatedAt: now,
  });

  await batch.commit();
  console.log('✅ Base collections (Levels, Subjects, Classes, Settings) created.');

  // 5. Seed Users (1 Admin, 5 Students)
  const usersToCreate = [
    {
      username: 'admin',
      fullName: 'Dr. Evelyn Reed (Head of Academics)',
      role: 'admin' as const,
      status: 'active' as const,
      classIds: ['class-jss1-a', 'class-jss1-b', 'class-jss2-a', 'class-ss1-sci'],
      levelIds: ['level-jss1', 'level-jss2', 'level-ss1'],
    },
    {
      username: 'alex.smith',
      fullName: 'Alex Smith',
      role: 'student' as const,
      status: 'active' as const,
      classIds: ['class-jss1-a'],
      levelIds: ['level-jss1'],
    },
    {
      username: 'sarah.jenkins',
      fullName: 'Sarah Jenkins',
      role: 'student' as const,
      status: 'active' as const,
      classIds: ['class-jss1-b'],
      levelIds: ['level-jss1'],
    },
    {
      username: 'david.okafor',
      fullName: 'David Okafor',
      role: 'student' as const,
      status: 'active' as const,
      classIds: ['class-jss2-a'],
      levelIds: ['level-jss2'],
    },
    {
      username: 'emily.chen',
      fullName: 'Emily Chen',
      role: 'student' as const,
      status: 'active' as const,
      classIds: ['class-ss1-sci'],
      levelIds: ['level-ss1'],
    },
    {
      username: 'michael.brown',
      fullName: 'Michael Brown',
      role: 'student' as const,
      status: 'active' as const,
      classIds: ['class-jss1-a'],
      levelIds: ['level-jss1'],
    },
  ];

  console.log('Creating users in Auth & Firestore...');
  for (const u of usersToCreate) {
    const email = `${u.username}@${AUTH_DOMAIN}`;
    let uid = `seeded-${u.username}`;

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
      uid = userCred.user.uid;
      console.log(` Created auth record for: ${u.username} (${uid})`);
    } catch (err: unknown) {
      console.log(` Note: Auth user ${u.username} already exists or using local fallback: ${(err as Error).message}`);
    }

    // Write profile
    await setDoc(doc(db, 'users', uid), {
      uid,
      username: u.username,
      usernameLower: u.username.toLowerCase(),
      authEmail: email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      classIds: u.classIds,
      levelIds: u.levelIds,
      createdBy: 'system',
      createdAt: now,
      lastLoginAt: null,
    });

    // Write username lock
    await setDoc(doc(db, 'usernames', u.username.toLowerCase()), {
      uid,
      reservedAt: now,
      reservedBy: 'system',
    });
  }

  console.log('🎉 Seed completed successfully!');
}

// Auto-run when executed directly via tsx
if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
