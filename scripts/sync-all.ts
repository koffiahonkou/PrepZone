import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import cfg from '../firebase-applet-config.json' assert { type: 'json' };
import {
  INITIAL_USERS,
  INITIAL_LEVELS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_LESSONS,
  INITIAL_QUIZZES,
  INITIAL_SUBMISSIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
  INITIAL_INQUIRIES,
  INITIAL_CANNED_RESPONSES,
  DEVELOPER_USER,
} from '../src/services/sampleData';

const app = initializeApp({
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  appId: cfg.appId,
});
const db = getFirestore(app, cfg.firestoreDatabaseId);

function cleanForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = cleanForFirestore(v);
  }
  return out;
}

async function runSync() {
  console.log('🚀 Pushing full system seed to Firestore:', cfg.firestoreDatabaseId);
  let total = 0;

  // 1. Settings
  await setDoc(doc(db, 'settings', 'global'), cleanForFirestore(INITIAL_SETTINGS), { merge: true });
  total++;
  console.log('✅ Settings global synced');

  // 2. Levels
  for (const lvl of INITIAL_LEVELS) {
    await setDoc(doc(db, 'levels', lvl.id), cleanForFirestore(lvl), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_LEVELS.length} Levels synced`);

  // 3. Classes
  for (const cls of INITIAL_CLASSES) {
    await setDoc(doc(db, 'classes', cls.id), cleanForFirestore(cls), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_CLASSES.length} Classes synced`);

  // 4. Subjects
  for (const sub of INITIAL_SUBJECTS) {
    await setDoc(doc(db, 'subjects', sub.id), cleanForFirestore(sub), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_SUBJECTS.length} Subjects synced`);

  // 5. Lessons
  for (const l of INITIAL_LESSONS) {
    await setDoc(doc(db, 'lessons', l.id), cleanForFirestore(l), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_LESSONS.length} Lessons synced`);

  // 6. Quizzes
  for (const q of INITIAL_QUIZZES) {
    await setDoc(doc(db, 'quizzes', q.id), cleanForFirestore(q), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_QUIZZES.length} Quizzes synced`);

  // 7. Users (including Developer Superuser)
  const allUsers = [DEVELOPER_USER, ...INITIAL_USERS.filter((u) => u.uid !== DEVELOPER_USER.uid)];
  for (const u of allUsers) {
    await setDoc(doc(db, 'users', u.uid), cleanForFirestore(u), { merge: true });
    total++;
  }
  console.log(`✅ ${allUsers.length} Users synced`);

  // 8. Submissions
  for (const s of INITIAL_SUBMISSIONS) {
    await setDoc(doc(db, 'submissions', s.id), cleanForFirestore(s), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_SUBMISSIONS.length} Submissions synced`);

  // 9. Inquiries
  for (const inq of INITIAL_INQUIRIES) {
    await setDoc(doc(db, 'inquiries', inq.id), cleanForFirestore(inq), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_INQUIRIES.length} Inquiries synced`);

  // 10. Canned Responses
  for (const cr of INITIAL_CANNED_RESPONSES) {
    await setDoc(doc(db, 'cannedResponses', cr.id), cleanForFirestore(cr), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_CANNED_RESPONSES.length} Canned Responses synced`);

  // 11. Notifications
  for (const n of INITIAL_NOTIFICATIONS) {
    await setDoc(doc(db, 'notifications', n.id), cleanForFirestore(n), { merge: true });
    total++;
  }
  console.log(`✅ ${INITIAL_NOTIFICATIONS.length} Notifications synced`);

  console.log(`🎉 Complete sync to Firestore finished! Total ${total} documents pushed.`);
  process.exit(0);
}

runSync().catch((err) => {
  console.error('❌ Sync script failed:', err);
  process.exit(1);
});
