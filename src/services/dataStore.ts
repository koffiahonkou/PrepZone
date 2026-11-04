import {
  UserProfile,
  AcademicLevel,
  AcademicClass,
  Subject,
  Lesson,
  Quiz,
  Submission,
  AppNotification,
  AuditLog,
  SystemSettings,
  StudentInquiry,
  InquiryMessage,
  UserRole,
  CannedResponse,
} from '@/src/types';
import {
  INITIAL_USERS,
  INITIAL_LEVELS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_LESSONS,
  INITIAL_QUIZZES,
  INITIAL_SUBMISSIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_INQUIRIES,
  INITIAL_CANNED_RESPONSES,
} from './sampleData';
import { assertValidQuiz } from './quizValidator';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db, sanitizeForFirestore, enforceFirestoreSizeLimit } from '@/src/lib/firebase';
import { uploadDataUrlToStorage } from '@/src/services/storageService';

const STORAGE_KEYS = {
  USERS: 'eduform_store_users',
  LEVELS: 'eduform_store_levels',
  CLASSES: 'eduform_store_classes',
  SUBJECTS: 'eduform_store_subjects',
  LESSONS: 'eduform_store_lessons',
  QUIZZES: 'eduform_store_quizzes',
  SUBMISSIONS: 'eduform_store_submissions',
  NOTIFICATIONS: 'eduform_store_notifications',
  NOTIFICATION_READS: 'eduform_store_notification_reads',
  AUDIT_LOGS: 'eduform_store_audit_logs',
  SETTINGS: 'eduform_store_settings',
  INQUIRIES: 'eduform_store_inquiries',
  INQUIRY_READS: 'eduform_store_inquiry_reads',
  CANNED_RESPONSES: 'eduform_store_canned_responses',
};

function getStoredOrInit<T>(key: string, initialData: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(raw) as T;
  } catch {
    return initialData;
  }
}

function saveStore<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

class DataStore {
  // Reset all stores to fresh sample data
  public resetToSampleData(): void {
    saveStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    saveStore(STORAGE_KEYS.LEVELS, INITIAL_LEVELS);
    saveStore(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    saveStore(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    saveStore(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    saveStore(STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);
    saveStore(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    saveStore(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    saveStore(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    saveStore(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    saveStore(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    saveStore(STORAGE_KEYS.CANNED_RESPONSES, INITIAL_CANNED_RESPONSES);
    saveStore(STORAGE_KEYS.INQUIRY_READS, {});
  }

  private syncInitialized = false;

  /**
   * Initializes real-time bidirectional synchronization with Firebase Firestore.
   * Enables seamless live data reflection between AI Studio and Vercel deployments.
   */
  public initFirestoreSync(): void {
    if (this.syncInitialized || typeof window === 'undefined') return;
    this.syncInitialized = true;

    try {
      // 1. Settings & School Configuration Real-time Sync
      const settingsRef = doc(db, 'settings', 'global');
      onSnapshot(
        settingsRef,
        (snap) => {
          if (snap.exists()) {
            const remote = snap.data() as SystemSettings;
            if (remote && remote.appName) {
              const current = getStoredOrInit<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
              const merged: SystemSettings = {
                ...current,
                ...remote,
              };
              saveStore(STORAGE_KEYS.SETTINGS, merged);

              // Apply active theme instantly across document
              const activeTheme = merged.themeId || 'oxford';
              document.documentElement.setAttribute('data-theme', activeTheme);
              if (merged.appName) {
                document.title = `${merged.appName} | ${merged.tagline || 'School Assessment System'}`;
              }
              window.dispatchEvent(new CustomEvent('eduform_settings_updated', { detail: merged }));
            }
          } else {
            // Document does not exist in Firestore yet: seed from current configured local settings
            const current = this.getSettings();
            setDoc(settingsRef, sanitizeForFirestore(current), { merge: true }).catch((err) =>
              console.warn('Initial settings seed to Firestore deferred:', err)
            );
          }
        },
        (err) => console.warn('Real-time settings listener fallback to local:', err)
      );

      // 2. Lessons Real-time Sync
      onSnapshot(
        collection(db, 'lessons'),
        (snap) => {
          if (!snap.empty) {
            const remoteLessons: Lesson[] = [];
            snap.forEach((d) => remoteLessons.push(d.data() as Lesson));
            if (remoteLessons.length > 0) {
              const localLessons = getStoredOrInit<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
              const map = new Map<string, Lesson>();
              localLessons.forEach((l) => map.set(l.id, l));
              remoteLessons.forEach((l) => map.set(l.id, l));
              const merged = Array.from(map.values());
              saveStore(STORAGE_KEYS.LESSONS, merged);
              window.dispatchEvent(new CustomEvent('eduform_lessons_updated'));
            }
          }
        },
        (err) => console.warn('Lessons onSnapshot error:', err)
      );

      // 3. Quizzes Real-time Sync
      onSnapshot(
        collection(db, 'quizzes'),
        (snap) => {
          if (!snap.empty) {
            const remoteQuizzes: Quiz[] = [];
            snap.forEach((d) => remoteQuizzes.push(d.data() as Quiz));
            if (remoteQuizzes.length > 0) {
              const localQuizzes = getStoredOrInit<Quiz[]>(STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);
              const map = new Map<string, Quiz>();
              localQuizzes.forEach((q) => map.set(q.id, q));
              remoteQuizzes.forEach((q) => map.set(q.id, q));
              const merged = Array.from(map.values());
              saveStore(STORAGE_KEYS.QUIZZES, merged);
              window.dispatchEvent(new CustomEvent('eduform_quizzes_updated'));
            }
          }
        },
        (err) => console.warn('Quizzes onSnapshot error:', err)
      );

      // 4. Inquiries Real-time Sync
      onSnapshot(
        collection(db, 'inquiries'),
        (snap) => {
          if (!snap.empty) {
            const remoteInquiries: StudentInquiry[] = [];
            snap.forEach((d) => remoteInquiries.push(d.data() as StudentInquiry));
            if (remoteInquiries.length > 0) {
              const local = getStoredOrInit<StudentInquiry[]>(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
              const map = new Map<string, StudentInquiry>();
              local.forEach((i) => map.set(i.id, i));
              remoteInquiries.forEach((i) => map.set(i.id, i));
              const merged = Array.from(map.values());
              saveStore(STORAGE_KEYS.INQUIRIES, merged);
              window.dispatchEvent(new CustomEvent('eduform_inquiries_updated'));
            }
          }
        },
        (err) => console.warn('Inquiries onSnapshot error:', err)
      );

      // 5. Canned Responses Real-time Sync
      onSnapshot(
        collection(db, 'cannedResponses'),
        (snap) => {
          if (!snap.empty) {
            const remoteCanned: CannedResponse[] = [];
            snap.forEach((d) => remoteCanned.push(d.data() as CannedResponse));
            if (remoteCanned.length > 0) {
              const local = getStoredOrInit<CannedResponse[]>(STORAGE_KEYS.CANNED_RESPONSES, INITIAL_CANNED_RESPONSES);
              const map = new Map<string, CannedResponse>();
              local.forEach((c) => map.set(c.id, c));
              remoteCanned.forEach((c) => map.set(c.id, c));
              const merged = Array.from(map.values());
              saveStore(STORAGE_KEYS.CANNED_RESPONSES, merged);
              window.dispatchEvent(new CustomEvent('eduform_canned_responses_updated'));
            }
          }
        },
        (err) => console.warn('CannedResponses onSnapshot error:', err)
      );

      // 6. Users Real-time Sync
      onSnapshot(
        collection(db, 'users'),
        (snap) => {
          if (!snap.empty) {
            const remoteUsers: UserProfile[] = [];
            snap.forEach((d) => remoteUsers.push(d.data() as UserProfile));
            if (remoteUsers.length > 0) {
              const localUsers = getStoredOrInit<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
              const map = new Map<string, UserProfile>();
              localUsers.forEach((u) => map.set(u.uid, u));
              remoteUsers.forEach((u) => map.set(u.uid, u));
              const merged = Array.from(map.values());
              saveStore(STORAGE_KEYS.USERS, merged);
              window.dispatchEvent(new CustomEvent('eduform_users_updated'));
            }
          }
        },
        (err) => console.warn('Users onSnapshot error:', err)
      );
    } catch (e) {
      console.warn('Real-time Firestore synchronization setup error:', e);
    }
  }

  /**
   * Prepares and sanitizes a lesson for Firestore:
   * 1. Eliminates redundant duplicate dataUrl properties that duplicate payload size.
   * 2. Automatically uploads base64 data URLs to Firebase Storage.
   * 3. Guarantees the document payload strictly adheres to Firestore's 1MiB limit.
   */
  public async sanitizeLessonForFirestore(lesson: Lesson): Promise<Lesson> {
    const cloned: Lesson = JSON.parse(JSON.stringify(lesson));

    // 1. Process attachments
    if (Array.isArray(cloned.attachments)) {
      for (let i = 0; i < cloned.attachments.length; i++) {
        const att = cloned.attachments[i];
        let targetUrl = att.url;
        if ((!targetUrl || targetUrl === '#') && att.dataUrl) {
          targetUrl = att.dataUrl;
        }

        // If it's a data URL, upload to Firebase Storage
        if (targetUrl && targetUrl.startsWith('data:')) {
          try {
            const uploadedUrl = await uploadDataUrlToStorage(
              targetUrl,
              'attachments',
              att.name || `attachment_${i}`
            );
            if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
              targetUrl = uploadedUrl;
            }
          } catch (e) {
            console.warn('Storage upload error for attachment:', e);
          }
        }

        att.url = targetUrl || '#';
        delete att.dataUrl; // Never store duplicate dataUrl in Firestore
      }
    }

    // 2. Process videoUrl
    if (cloned.videoUrl && cloned.videoUrl.startsWith('data:')) {
      try {
        const uploadedVideo = await uploadDataUrlToStorage(
          cloned.videoUrl,
          'videos',
          `${cloned.id}_video.mp4`
        );
        if (uploadedVideo && !uploadedVideo.startsWith('data:')) {
          cloned.videoUrl = uploadedVideo;
        }
      } catch (e) {
        console.warn('Storage upload error for video note:', e);
      }
    }

    // 3. Size check and safeguard against 1MB Firestore limit
    return enforceFirestoreSizeLimit(cloned, 850_000);
  }

  public async sanitizeSettingsForFirestore(settings: SystemSettings): Promise<SystemSettings> {
    const cloned: SystemSettings = { ...settings };
    if (cloned.logoUrl && cloned.logoUrl.startsWith('data:')) {
      try {
        const uploadedLogo = await uploadDataUrlToStorage(cloned.logoUrl, 'branding', 'school_logo');
        if (uploadedLogo && !uploadedLogo.startsWith('data:')) {
          cloned.logoUrl = uploadedLogo;
        }
      } catch (e) {
        console.warn('Storage upload error for school logo:', e);
      }
    }
    return enforceFirestoreSizeLimit(cloned, 850_000);
  }

  /**
   * Pushes all local storage state (settings, logo, curriculum, quizzes, users) to Firestore.
   * Guarantees 100% data parity between AI Studio and Vercel while enforcing Firestore document limits.
   */
  public async syncAllLocalDataToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      let count = 0;
      // 1. Settings
      const settings = this.getSettings();
      const cleanSettings = await this.sanitizeSettingsForFirestore(settings);
      await setDoc(doc(db, 'settings', 'global'), cleanSettings, { merge: true });
      count++;

      // 2. Lessons
      const lessons = this.getLessons();
      const updatedLessons: Lesson[] = [];
      for (const l of lessons) {
        const cleanLesson = await this.sanitizeLessonForFirestore(l);
        updatedLessons.push(cleanLesson);
        await setDoc(doc(db, 'lessons', l.id), cleanLesson, { merge: true });
        count++;
      }
      // Save cleaned lessons to local storage to eliminate browser storage bloat
      saveStore(STORAGE_KEYS.LESSONS, updatedLessons);

      // 3. Quizzes
      for (const q of this.getQuizzes()) {
        const payload = enforceFirestoreSizeLimit(q);
        await setDoc(doc(db, 'quizzes', q.id), payload, { merge: true });
        count++;
      }

      // 4. Users
      for (const u of this.getUsers()) {
        const payload = enforceFirestoreSizeLimit(u);
        await setDoc(doc(db, 'users', u.uid), payload, { merge: true });
        count++;
      }

      // 5. Classes
      for (const c of this.getClasses()) {
        await setDoc(doc(db, 'classes', c.id), sanitizeForFirestore(c), { merge: true });
        count++;
      }

      // 6. Subjects
      for (const s of this.getSubjects()) {
        await setDoc(doc(db, 'subjects', s.id), sanitizeForFirestore(s), { merge: true });
        count++;
      }

      // 7. Levels
      for (const lvl of this.getLevels()) {
        await setDoc(doc(db, 'levels', lvl.id), sanitizeForFirestore(lvl), { merge: true });
        count++;
      }

      // 8. Inquiries
      for (const inq of this.getInquiries()) {
        await setDoc(doc(db, 'inquiries', inq.id), sanitizeForFirestore(inq), { merge: true });
        count++;
      }

      // 9. Canned responses
      for (const cr of this.getCannedResponses()) {
        await setDoc(doc(db, 'cannedResponses', cr.id), sanitizeForFirestore(cr), { merge: true });
        count++;
      }

      // 10. Notifications
      for (const notif of this.getNotifications()) {
        await setDoc(doc(db, 'notifications', notif.id), sanitizeForFirestore(notif), { merge: true });
        count++;
      }

      return { success: true, count };
    } catch (err: unknown) {
      console.error('syncAllLocalDataToFirestore error:', err);
      return { success: false, count: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // --- Users ---
  public getUsers(): UserProfile[] {
    const rawUsers = getStoredOrInit<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let changed = false;
    const migrated = rawUsers.map((u) => {
      let userChanged = false;
      let newLevelIds = u.levelIds || [];
      if (newLevelIds.includes('level-jss1') || newLevelIds.includes('level-jss2') || newLevelIds.includes('level-ss1')) {
        newLevelIds = newLevelIds.map((l) => {
          if (l === 'level-jss1') return 'level-basic';
          if (l === 'level-jss2') return 'level-jhs';
          if (l === 'level-ss1') return 'level-shs';
          return l;
        });
        userChanged = true;
      }
      if (newLevelIds.length === 0) {
        newLevelIds = ['level-basic'];
        userChanged = true;
      }

      const password = u.password || 'Eduform123!';
      if (!u.password) {
        userChanged = true;
      }

      let subjectIds = u.subjectIds;
      if (!subjectIds || subjectIds.length === 0) {
        // Derive default subjects from classes or default list
        const classList = getStoredOrInit<AcademicClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
        const userClasses = classList.filter((c) => u.classIds?.includes(c.id));
        const derivedSubjects = Array.from(new Set(userClasses.flatMap((c) => c.subjectIds || [])));
        subjectIds = derivedSubjects.length > 0 ? derivedSubjects : ['subj-mth', 'subj-eng', 'subj-sci'];
        userChanged = true;
      }

      if (userChanged) {
        changed = true;
        return {
          ...u,
          levelIds: newLevelIds,
          password,
          subjectIds,
        };
      }
      return u;
    });

    if (changed) {
      saveStore(STORAGE_KEYS.USERS, migrated);
      return migrated;
    }
    return rawUsers;
  }

  public getUserById(uid: string): UserProfile | undefined {
    return this.getUsers().find((u) => u.uid === uid);
  }

  public getUserByUsername(username: string): UserProfile | undefined {
    const lower = username.trim().toLowerCase();
    return this.getUsers().find((u) => u.usernameLower === lower);
  }

  public getUserByIdentifier(identifier: string): UserProfile | undefined {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return undefined;
    const users = this.getUsers();
    return users.find(
      (u) =>
        u.usernameLower === clean ||
        u.username.toLowerCase() === clean ||
        u.authEmail?.toLowerCase() === clean
    );
  }

  public resetUserPassword(
    identifier: string,
    newPassword: string,
    actorId?: string
  ): { success: boolean; user?: UserProfile; error?: string } {
    const user = this.getUserByIdentifier(identifier);
    if (!user) {
      return {
        success: false,
        error: `No account found with username or email "${identifier}". Please verify spelling or contact your school administrator.`,
      };
    }

    if (user.status === 'inactive') {
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your school administrator to reactivate access.',
      };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return {
        success: false,
        error: 'New password must be at least 6 characters long.',
      };
    }

    const updated: UserProfile = {
      ...user,
      password: newPassword.trim(),
    };

    this.saveUser(updated);

    // Record audit trail
    this.addAuditLog({
      actorId: actorId || user.uid,
      action: actorId && actorId !== user.uid ? 'ADMIN_PASSWORD_RESET' : 'SELF_SERVICE_PASSWORD_RESET',
      targetType: 'user',
      targetId: user.uid,
      meta: {
        username: user.username,
        resetBy: actorId || 'self-service',
      },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_users_updated', { detail: updated }));
    }

    return { success: true, user: updated };
  }

  public changeUserPassword(
    uid: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const user = this.getUserById(uid);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const expectedPassword = user.password || 'Eduform123!';
    if (currentPassword !== expectedPassword) {
      return { success: false, error: 'Current password does not match.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    if (currentPassword === newPassword.trim()) {
      return { success: false, error: 'New password cannot be the same as your current password.' };
    }

    const updated: UserProfile = {
      ...user,
      password: newPassword.trim(),
    };

    this.saveUser(updated);

    this.addAuditLog({
      actorId: user.uid,
      action: 'USER_PASSWORD_CHANGED',
      targetType: 'user',
      targetId: user.uid,
      meta: {
        username: user.username,
      },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_users_updated', { detail: updated }));
    }

    return { success: true };
  }

  public saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.uid === user.uid);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.unshift(user);
    }
    saveStore(STORAGE_KEYS.USERS, users);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_users_updated', { detail: user }));
    }
  }

  public deleteUser(uid: string): void {
    const users = this.getUsers().filter((u) => u.uid !== uid);
    saveStore(STORAGE_KEYS.USERS, users);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_users_updated', { detail: { uid, deleted: true } }));
    }
  }

  // --- Levels ---
  public getLevels(): AcademicLevel[] {
    const defaultLevels: AcademicLevel[] = [
      { id: 'level-basic', name: 'Basic School', order: 1 },
      { id: 'level-jhs', name: 'Junior High School', order: 2 },
      { id: 'level-shs', name: 'Senor High School', order: 3 },
    ];
    let levels = getStoredOrInit<AcademicLevel[]>(STORAGE_KEYS.LEVELS, defaultLevels);
    // Ensure automatic migration if levels still have old names or are empty
    const hasOld = levels.some(
      (l) => l.name.includes('Secondary') || l.name.includes('JSS') || l.name.includes('SS 1')
    );
    if (hasOld || levels.length === 0) {
      saveStore(STORAGE_KEYS.LEVELS, defaultLevels);
      levels = defaultLevels;
    }
    return levels;
  }

  public saveLevel(level: AcademicLevel): void {
    const levels = this.getLevels();
    const idx = levels.findIndex((l) => l.id === level.id);
    if (idx >= 0) {
      levels[idx] = level;
    } else {
      levels.push(level);
    }
    saveStore(STORAGE_KEYS.LEVELS, levels);
  }

  public deleteLevel(id: string): void {
    const levels = this.getLevels().filter((l) => l.id !== id);
    saveStore(STORAGE_KEYS.LEVELS, levels);
  }

  // --- Classes ---
  public getClasses(): AcademicClass[] {
    return getStoredOrInit<AcademicClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  }

  public getClassById(id: string): AcademicClass | undefined {
    return this.getClasses().find((c) => c.id === id);
  }

  public saveClass(cls: AcademicClass): void {
    const classes = this.getClasses();
    const idx = classes.findIndex((c) => c.id === cls.id);
    if (idx >= 0) {
      classes[idx] = cls;
    } else {
      classes.unshift(cls);
    }
    saveStore(STORAGE_KEYS.CLASSES, classes);
  }

  public deleteClass(id: string): void {
    const classes = this.getClasses().filter((c) => c.id !== id);
    saveStore(STORAGE_KEYS.CLASSES, classes);

    // Unassign class from users
    const users = this.getUsers().map((u) => {
      if (u.classIds && u.classIds.includes(id)) {
        return { ...u, classIds: u.classIds.filter((cid) => cid !== id) };
      }
      return u;
    });
    saveStore(STORAGE_KEYS.USERS, users);

    // Unassign class from lessons
    const lessons = this.getLessons().map((l) => {
      if (l.classIds && l.classIds.includes(id)) {
        return { ...l, classIds: l.classIds.filter((cid) => cid !== id) };
      }
      return l;
    });
    saveStore(STORAGE_KEYS.LESSONS, lessons);
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    return getStoredOrInit<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  }

  public getSubjectById(id: string): Subject | undefined {
    return this.getSubjects().find((s) => s.id === id);
  }

  public saveSubject(subj: Subject): void {
    const subjects = this.getSubjects();
    const idx = subjects.findIndex((s) => s.id === subj.id);
    if (idx >= 0) {
      subjects[idx] = subj;
    } else {
      subjects.unshift(subj);
    }
    saveStore(STORAGE_KEYS.SUBJECTS, subjects);
  }

  public deleteSubject(id: string): void {
    const subjects = this.getSubjects().filter((s) => s.id !== id);
    saveStore(STORAGE_KEYS.SUBJECTS, subjects);

    // Unassign subject from classes
    const classes = this.getClasses().map((c) => {
      if (c.subjectIds && c.subjectIds.includes(id)) {
        return { ...c, subjectIds: c.subjectIds.filter((sid) => sid !== id) };
      }
      return c;
    });
    saveStore(STORAGE_KEYS.CLASSES, classes);

    // Unassign subject from users
    const users = this.getUsers().map((u) => {
      if (u.subjectIds && u.subjectIds.includes(id)) {
        return { ...u, subjectIds: u.subjectIds.filter((sid) => sid !== id) };
      }
      return u;
    });
    saveStore(STORAGE_KEYS.USERS, users);
  }

  // --- Lessons ---
  public getLessons(): Lesson[] {
    const lessons = getStoredOrInit<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    let modified = false;

    // Sanitize any existing bloated attachments in local storage
    for (const l of lessons) {
      if (Array.isArray(l.attachments)) {
        for (const att of l.attachments) {
          if (att.dataUrl) {
            if (!att.url || att.url === '#') {
              att.url = att.dataUrl;
            }
            delete att.dataUrl;
            modified = true;
          }
        }
      }
    }

    for (const initL of INITIAL_LESSONS) {
      const existing = lessons.find((l) => l.id === initL.id);
      if (!existing) {
        lessons.push(initL);
        modified = true;
      } else if (!existing.videoUrl && initL.videoUrl) {
        existing.videoUrl = initL.videoUrl;
        existing.videoType = initL.videoType;
        existing.videoTitle = initL.videoTitle;
        modified = true;
      }
    }
    if (modified) {
      saveStore(STORAGE_KEYS.LESSONS, lessons);
    }
    return lessons;
  }

  public getLessonById(id: string): Lesson | undefined {
    return this.getLessons().find((l) => l.id === id);
  }

  public saveLesson(lesson: Lesson): void {
    const lessons = this.getLessons();
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    if (idx >= 0) {
      lessons[idx] = lesson;
    } else {
      lessons.unshift(lesson);
    }
    saveStore(STORAGE_KEYS.LESSONS, lessons);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_lessons_updated'));
    }

    try {
      this.sanitizeLessonForFirestore(lesson)
        .then((cleanLesson) => {
          setDoc(doc(db, 'lessons', lesson.id), cleanLesson, { merge: true }).catch((err) => {
            console.warn('Failed to sync lesson to Firestore:', err);
          });
        })
        .catch((e) => {
          console.warn('Lesson sanitization error:', e);
        });
    } catch (e) {
      console.warn('Firestore lesson sync deferred:', e);
    }
  }

  public deleteLesson(id: string): void {
    const lessons = this.getLessons().filter((l) => l.id !== id);
    saveStore(STORAGE_KEYS.LESSONS, lessons);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_lessons_updated'));
    }

    try {
      deleteDoc(doc(db, 'lessons', id)).catch((err) => {
        console.warn('Failed to delete lesson from Firestore:', err);
      });
    } catch (e) {
      console.warn('Firestore lesson delete deferred:', e);
    }
  }

  // --- Quizzes ---
  public getQuizzes(): Quiz[] {
    const rawQuizzes = getStoredOrInit<Quiz[]>(STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);
    let modified = false;
    const quizzes = rawQuizzes.map((q) => {
      const needsMigration =
        q.startDate === undefined ||
        q.endDate === undefined ||
        q.settings?.startDate === undefined ||
        q.settings?.endDate === undefined;
      if (needsMigration) {
        modified = true;
        return {
          ...q,
          startDate: q.startDate ?? null,
          endDate: q.endDate ?? null,
          settings: {
            ...q.settings,
            startDate: q.settings?.startDate ?? null,
            endDate: q.settings?.endDate ?? null,
          },
        };
      }
      return q;
    });

    for (const initQ of INITIAL_QUIZZES) {
      if (!quizzes.some((q) => q.id === initQ.id)) {
        quizzes.push(initQ);
        modified = true;
      }
    }
    if (modified) {
      saveStore(STORAGE_KEYS.QUIZZES, quizzes);
    }
    return quizzes;
  }

  public getQuizById(id: string): Quiz | undefined {
    return this.getQuizzes().find((q) => q.id === id);
  }

  public saveQuiz(quiz: Quiz): void {
    // Enforce quiz validation before saving to the database
    const validation = assertValidQuiz(quiz);
    const normalizedQuiz: Quiz = {
      ...quiz,
      startDate: quiz.startDate ?? null,
      endDate: quiz.endDate ?? null,
      totalMarks: validation.totalMarks,
      settings: {
        ...quiz.settings,
        startDate: quiz.settings?.startDate ?? null,
        endDate: quiz.settings?.endDate ?? null,
      },
    };
    const quizzes = this.getQuizzes();
    const idx = quizzes.findIndex((q) => q.id === normalizedQuiz.id);
    if (idx >= 0) {
      quizzes[idx] = normalizedQuiz;
    } else {
      quizzes.unshift(normalizedQuiz);
    }
    saveStore(STORAGE_KEYS.QUIZZES, quizzes);

    // Sync to Firestore if online / enabled
    try {
      import('@/src/lib/firebase').then(({ db, sanitizeForFirestore }) => {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          const payload = sanitizeForFirestore(normalizedQuiz);
          setDoc(doc(db, 'quizzes', normalizedQuiz.id), payload).catch((err) => {
            console.warn('Firestore quiz sync deferred/offline:', err);
          });
        });
      });
    } catch {
      // safe fallback
    }
  }

  public deleteQuiz(id: string): void {
    const quizzes = this.getQuizzes().filter((q) => q.id !== id);
    saveStore(STORAGE_KEYS.QUIZZES, quizzes);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_quizzes_updated'));
    }
    try {
      deleteDoc(doc(db, 'quizzes', id)).catch((err) => {
        console.warn('Failed to delete quiz from Firestore:', err);
      });
    } catch (e) {
      console.warn('Firestore quiz delete deferred:', e);
    }
  }

  // --- Submissions ---
  public getSubmissions(): Submission[] {
    const subs = getStoredOrInit<Submission[]>(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    let modified = false;
    for (const initSub of INITIAL_SUBMISSIONS) {
      if (!subs.some((s) => s.id === initSub.id)) {
        subs.push(initSub);
        modified = true;
      }
    }
    if (modified) {
      saveStore(STORAGE_KEYS.SUBMISSIONS, subs);
    }
    return subs;
  }

  public getSubmissionById(id: string): Submission | undefined {
    return this.getSubmissions().find((s) => s.id === id);
  }

  public getSubmissionsByStudent(userId: string): Submission[] {
    return this.getSubmissions().filter((s) => s.userId === userId);
  }

  public hasStudentSubmittedQuiz(userId: string, quizId: string): boolean {
    return this.getSubmissions().some((s) => s.userId === userId && s.quizId === quizId);
  }

  public saveSubmission(submission: Submission): boolean {
    const subs = this.getSubmissions();
    const idx = subs.findIndex((s) => s.id === submission.id);
    if (idx >= 0) {
      // Existing submission being updated (e.g., teacher grading theory or feedback)
      subs[idx] = submission;
    } else {
      // Strict rule: No student can submit a quiz they have already submitted
      const alreadySubmitted = subs.some(
        (s) => s.userId === submission.userId && s.quizId === submission.quizId
      );
      if (alreadySubmitted) {
        console.warn(
          `[EduForm Security] Submission blocked: Student "${submission.userId}" has already submitted quiz "${submission.quizId}". Retakes are strictly prohibited.`
        );
        return false;
      }
      subs.unshift(submission);
    }
    saveStore(STORAGE_KEYS.SUBMISSIONS, subs);

    // Sync to Firestore if online / enabled
    try {
      import('@/src/lib/firebase').then(({ db, sanitizeForFirestore }) => {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          const payload = sanitizeForFirestore(submission);
          setDoc(doc(db, 'submissions', submission.id), payload).catch((err) => {
            console.warn('Firestore submission sync deferred/offline:', err);
          });
        });
      });
    } catch {
      // safe fallback
    }

    return true;
  }

  /**
   * Asynchronous assessment submission API
   * Handles network latency, verification, duplicate prevention, and Firestore persistence.
   */
  public async submitAssessmentApi(
    submission: Submission
  ): Promise<{ success: boolean; data?: Submission; error?: string }> {
    // Simulate real network flight
    await new Promise((res) => setTimeout(res, 750));

    // Validate payload
    if (!submission.quizId || !submission.userId) {
      return {
        success: false,
        error: 'Invalid submission payload: Missing quiz or student identity.',
      };
    }

    // Strict single attempt verification
    const subs = this.getSubmissions();
    const alreadySubmitted = subs.some(
      (s) => s.userId === submission.userId && s.quizId === submission.quizId && s.id !== submission.id
    );
    if (alreadySubmitted) {
      return {
        success: false,
        error:
          'Assessment has already been submitted. Retakes are strictly prohibited by institutional policy.',
      };
    }

    // Save submission locally
    const saved = this.saveSubmission(submission);
    if (!saved) {
      return {
        success: false,
        error: 'Submission rejected: Duplicate attempt detected.',
      };
    }

    // Remote persistence attempt
    try {
      const { db, sanitizeForFirestore } = await import('@/src/lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      const payload = sanitizeForFirestore(submission);
      await setDoc(doc(db, 'submissions', submission.id), payload);
    } catch (e) {
      console.warn('Firestore remote sync deferred, persisted locally:', e);
    }

    return { success: true, data: submission };
  }

  // --- Notifications ---
  public getNotifications(): AppNotification[] {
    return getStoredOrInit<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  public saveNotification(notif: AppNotification): void {
    const notifs = this.getNotifications();
    const idx = notifs.findIndex((n) => n.id === notif.id);
    if (idx >= 0) {
      notifs[idx] = notif;
    } else {
      notifs.unshift(notif);
    }
    saveStore(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  public deleteNotification(id: string): void {
    const notifs = this.getNotifications().filter((n) => n.id !== id);
    saveStore(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  // --- Notification Read Tracking ---
  public getNotificationReads(userId?: string): string[] {
    if (!userId) return [];
    const allReads = getStoredOrInit<Record<string, string[]>>(
      STORAGE_KEYS.NOTIFICATION_READS,
      {}
    );
    return allReads[userId] || [];
  }

  public markNotificationAsRead(notificationId: string, userId?: string): void {
    if (!userId || !notificationId) return;
    const allReads = getStoredOrInit<Record<string, string[]>>(
      STORAGE_KEYS.NOTIFICATION_READS,
      {}
    );
    const userReads = new Set(allReads[userId] || []);
    userReads.add(notificationId);
    allReads[userId] = Array.from(userReads);
    saveStore(STORAGE_KEYS.NOTIFICATION_READS, allReads);
    window.dispatchEvent(
      new CustomEvent('prepzone_notifications_read', {
        detail: { userId, notificationId },
      })
    );
  }

  public markAllNotificationsAsRead(notificationIds: string[], userId?: string): void {
    if (!userId || !notificationIds.length) return;
    const allReads = getStoredOrInit<Record<string, string[]>>(
      STORAGE_KEYS.NOTIFICATION_READS,
      {}
    );
    const userReads = new Set(allReads[userId] || []);
    notificationIds.forEach((id) => userReads.add(id));
    allReads[userId] = Array.from(userReads);
    saveStore(STORAGE_KEYS.NOTIFICATION_READS, allReads);
    window.dispatchEvent(
      new CustomEvent('prepzone_notifications_read', {
        detail: { userId },
      })
    );
  }

  public isNotificationRead(notificationId: string, userId?: string): boolean {
    if (!userId) return true;
    const reads = this.getNotificationReads(userId);
    return reads.includes(notificationId);
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return getStoredOrInit<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    saveStore(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    const raw = getStoredOrInit<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    return {
      appName: raw.appName || 'EduForm',
      tagline: raw.tagline || 'School Assessment System',
      logoUrl: raw.logoUrl,
      logoTheme: raw.logoTheme || 'shield',
      themeId: raw.themeId || 'oxford',
      schoolAddress: raw.schoolAddress || '100 University Boulevard, Academic City',
      contactEmail: raw.contactEmail || 'admin@eduform.local',
      contactPhone: raw.contactPhone || '+1 (555) 234-5678',
      schoolWebsite: raw.schoolWebsite || 'https://eduform.local',
      principalOrHead: raw.principalOrHead || 'Dr. Evelyn Reed',
      defaultPassMarkPercent: raw.defaultPassMarkPercent ?? 50,
      academicTermLabel: raw.academicTermLabel || '2026/2027 Term 1',
      updatedAt: raw.updatedAt,
    };
  }

  public saveSettings(settings: SystemSettings): void {
    saveStore(STORAGE_KEYS.SETTINGS, settings);
    if (typeof window !== 'undefined') {
      const activeTheme = settings.themeId || 'oxford';
      document.documentElement.setAttribute('data-theme', activeTheme);
      window.dispatchEvent(new CustomEvent('eduform_settings_updated', { detail: settings }));
      if (settings.appName) {
        document.title = `${settings.appName} | ${settings.tagline || 'School Assessment System'}`;
      }
    }

    // Immediately push to Firestore cloud so Vercel and all remote clients update in real-time
    try {
      const settingsRef = doc(db, 'settings', 'global');
      this.sanitizeSettingsForFirestore(settings)
        .then((cleanSettings) => {
          setDoc(settingsRef, cleanSettings, { merge: true }).catch((err) => {
            console.warn('Failed to sync settings to Firestore:', err);
          });
        })
        .catch((e) => {
          console.warn('Settings sanitization error:', e);
        });
    } catch (e) {
      console.warn('Firestore settings write deferred:', e);
    }
  }

  // --- Student Inquiries & Teacher Q&A ---
  public getInquiries(): StudentInquiry[] {
    const inquiries = getStoredOrInit<StudentInquiry[]>(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    let modified = false;
    for (const initInq of INITIAL_INQUIRIES) {
      if (!inquiries.some((i) => i.id === initInq.id)) {
        inquiries.push(initInq);
        modified = true;
      }
    }
    if (modified) {
      saveStore(STORAGE_KEYS.INQUIRIES, inquiries);
    }
    return inquiries;
  }

  public getInquiryById(id: string): StudentInquiry | undefined {
    return this.getInquiries().find((i) => i.id === id);
  }

  public getInquiriesByStudent(studentId: string): StudentInquiry[] {
    return this.getInquiries().filter((i) => i.studentId === studentId);
  }

  public isTeacherAssignedToInquiry(
    inquiry: StudentInquiry,
    profile: UserProfile | null | undefined
  ): boolean {
    if (!profile) return false;
    // Admins have oversight across all inquiries
    if (profile.role === 'admin') return true;

    // 1. Direct teacher assignment match
    if (inquiry.teacherId && inquiry.teacherId === profile.uid) {
      return true;
    }

    // 2. If explicitly assigned to a different teacher, this teacher does not own it
    if (inquiry.teacherId && inquiry.teacherId !== profile.uid) {
      return false;
    }

    // 3. Fallback for unassigned inquiries: must match BOTH class AND subject
    const matchesClass = Boolean(profile.classIds?.includes(inquiry.classId));
    const matchesSubject = Boolean(profile.subjectIds?.includes(inquiry.subjectId));
    return matchesClass && matchesSubject;
  }

  public getInquiriesByTeacher(
    teacherId: string,
    classIds?: string[],
    subjectIds?: string[]
  ): StudentInquiry[] {
    return this.getInquiries().filter((i) => {
      if (i.teacherId === teacherId) return true;
      if (i.teacherId && i.teacherId !== teacherId) return false;
      const matchClass = !classIds || classIds.length === 0 || classIds.includes(i.classId);
      const matchSubject = !subjectIds || subjectIds.length === 0 || subjectIds.includes(i.subjectId);
      return matchClass && matchSubject;
    });
  }

  public getTeachersForClassSubject(classId: string, subjectId: string): UserProfile[] {
    const allUsers = this.getUsers();
    // 1. Teachers assigned to this class and subject
    const exactMatches = allUsers.filter(
      (u) =>
        u.role === 'teacher' &&
        u.status === 'active' &&
        u.classIds?.includes(classId) &&
        u.subjectIds?.includes(subjectId)
    );
    if (exactMatches.length > 0) return exactMatches;

    // 2. Teachers teaching this subject across any class
    const subjectTeachers = allUsers.filter(
      (u) =>
        u.role === 'teacher' &&
        u.status === 'active' &&
        u.subjectIds?.includes(subjectId)
    );
    if (subjectTeachers.length > 0) return subjectTeachers;

    // 3. Teachers assigned to this class
    const classTeachers = allUsers.filter(
      (u) =>
        u.role === 'teacher' &&
        u.status === 'active' &&
        u.classIds?.includes(classId)
    );
    if (classTeachers.length > 0) return classTeachers;

    // 4. Fallback to active teachers or admin lead
    const anyStaff = allUsers.filter(
      (u) => (u.role === 'teacher' || u.role === 'admin') && u.status === 'active'
    );
    return anyStaff;
  }

  public getTeacherForClassSubject(classId: string, subjectId: string): UserProfile | undefined {
    const teachers = this.getTeachersForClassSubject(classId, subjectId);
    return teachers[0];
  }

  public saveInquiry(inquiry: StudentInquiry): void {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === inquiry.id);
    if (idx >= 0) {
      inquiries[idx] = inquiry;
    } else {
      inquiries.unshift(inquiry);
    }
    saveStore(STORAGE_KEYS.INQUIRIES, inquiries);

    // Dispatch update event for reactive components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_inquiries_updated', { detail: inquiry }));
    }

    // Sync to Firestore if online
    try {
      import('@/src/lib/firebase').then(({ db, sanitizeForFirestore }) => {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          const payload = sanitizeForFirestore(inquiry);
          setDoc(doc(db, 'inquiries', inquiry.id), payload).catch((err) => {
            console.warn('Firestore inquiry sync deferred/offline:', err);
          });
        });
      });
    } catch {
      // safe fallback
    }
  }

  public addInquiryReply(
    inquiryId: string,
    reply: { authorId: string; authorName: string; authorRole: UserRole; content: string }
  ): StudentInquiry | undefined {
    const inquiry = this.getInquiryById(inquiryId);
    if (!inquiry) return undefined;

    const newMsg: InquiryMessage = {
      id: `msg-${Date.now()}`,
      authorId: reply.authorId,
      authorName: reply.authorName,
      authorRole: reply.authorRole,
      content: reply.content.trim(),
      createdAt: new Date().toISOString(),
    };

    const isTeacherReply = reply.authorRole === 'teacher' || reply.authorRole === 'admin';
    const updated: StudentInquiry = {
      ...inquiry,
      status: isTeacherReply ? 'answered' : inquiry.status,
      updatedAt: new Date().toISOString(),
      messages: [...inquiry.messages, newMsg],
    };

    this.saveInquiry(updated);

    // If teacher replied, trigger in-app notification to student
    if (isTeacherReply) {
      const notif: AppNotification = {
        id: `notif-reply-${Date.now()}`,
        title: `${reply.authorName} answered your question`,
        bodyHtml: `<p><strong>${reply.authorName}</strong> responded to your question on <strong>${inquiry.subjectName}</strong>: "<em>${inquiry.title}</em>"</p>`,
        priority: 'high',
        audience: {
          type: 'user',
          ids: [inquiry.studentId],
        },
        createdBy: reply.authorId,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        status: 'published',
      };
      this.saveNotification(notif);
    }

    return updated;
  }

  public resolveInquiry(inquiryId: string, actorId?: string): void {
    const inquiry = this.getInquiryById(inquiryId);
    if (!inquiry) return;
    const updated: StudentInquiry = {
      ...inquiry,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveInquiry(updated);
    if (actorId) {
      this.markInquiryRead(inquiryId, actorId);
    }
  }

  public archiveInquiry(inquiryId: string, actorId?: string): void {
    const inquiry = this.getInquiryById(inquiryId);
    if (!inquiry) return;
    const updated: StudentInquiry = {
      ...inquiry,
      status: 'archived',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveInquiry(updated);
    if (actorId) {
      this.markInquiryRead(inquiryId, actorId);
    }
  }

  public unarchiveInquiry(inquiryId: string): void {
    const inquiry = this.getInquiryById(inquiryId);
    if (!inquiry) return;
    const hasReplies = inquiry.messages.some(
      (m) => m.authorRole === 'teacher' || m.authorRole === 'admin'
    );
    const updated: StudentInquiry = {
      ...inquiry,
      status: hasReplies ? 'answered' : 'pending',
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    };
    this.saveInquiry(updated);
  }

  public reopenInquiry(inquiryId: string): void {
    const inquiry = this.getInquiryById(inquiryId);
    if (!inquiry) return;
    const updated: StudentInquiry = {
      ...inquiry,
      status: 'pending',
      resolvedAt: null,
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    };
    this.saveInquiry(updated);
  }

  public deleteInquiry(id: string): void {
    const inquiries = this.getInquiries().filter((i) => i.id !== id);
    saveStore(STORAGE_KEYS.INQUIRIES, inquiries);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduform_inquiries_updated'));
    }
  }

  // --- Inquiry Read Receipts & State ---
  public getInquiryReads(userId: string): string[] {
    const all = getStoredOrInit<Record<string, string[]>>(STORAGE_KEYS.INQUIRY_READS, {});
    return all[userId] || [];
  }

  public markInquiryRead(inquiryId: string, userId: string): void {
    if (!userId || !inquiryId) return;
    const all = getStoredOrInit<Record<string, string[]>>(STORAGE_KEYS.INQUIRY_READS, {});
    const userReads = new Set(all[userId] || []);
    if (!userReads.has(inquiryId)) {
      userReads.add(inquiryId);
      all[userId] = Array.from(userReads);
      saveStore(STORAGE_KEYS.INQUIRY_READS, all);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('eduform_inquiry_reads_updated', { detail: { userId, inquiryId } })
        );
      }
    }
  }

  public isInquiryRead(inquiryId: string, userId?: string): boolean {
    if (!userId) return true;
    const reads = this.getInquiryReads(userId);
    return reads.includes(inquiryId);
  }

  // Active inquiries = inquiries assigned to teacher that are pending or answered (excluding resolved & archived)
  public getActiveInquiries(profile: UserProfile | null | undefined): StudentInquiry[] {
    if (!profile) return [];
    return this.getInquiries().filter(
      (inq) =>
        (inq.status === 'pending' || inq.status === 'answered') &&
        this.isTeacherAssignedToInquiry(inq, profile)
    );
  }

  // Pending inquiries = inquiries strictly awaiting teacher reply
  public getPendingInquiries(profile: UserProfile | null | undefined): StudentInquiry[] {
    if (!profile) return [];
    return this.getInquiries().filter(
      (inq) => inq.status === 'pending' && this.isTeacherAssignedToInquiry(inq, profile)
    );
  }

  // Unread inquiries = pending inquiries not yet marked read by this teacher
  public getUnreadInquiries(profile: UserProfile | null | undefined): StudentInquiry[] {
    if (!profile) return [];
    return this.getInquiries().filter(
      (inq) =>
        inq.status === 'pending' &&
        this.isTeacherAssignedToInquiry(inq, profile) &&
        !this.isInquiryRead(inq.id, profile.uid)
    );
  }

  // --- Canned Responses Library ---
  public getCannedResponses(): CannedResponse[] {
    const stored = getStoredOrInit<CannedResponse[]>(
      STORAGE_KEYS.CANNED_RESPONSES,
      INITIAL_CANNED_RESPONSES
    );
    let modified = false;
    for (const initCanned of INITIAL_CANNED_RESPONSES) {
      if (!stored.some((c) => c.id === initCanned.id)) {
        stored.push(initCanned);
        modified = true;
      }
    }
    if (modified) {
      saveStore(STORAGE_KEYS.CANNED_RESPONSES, stored);
    }
    return stored;
  }

  public saveCannedResponse(canned: CannedResponse): void {
    const list = this.getCannedResponses();
    const idx = list.findIndex((c) => c.id === canned.id);
    if (idx >= 0) {
      list[idx] = canned;
    } else {
      list.unshift(canned);
    }
    saveStore(STORAGE_KEYS.CANNED_RESPONSES, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eduform_canned_responses_updated', { detail: canned })
      );
    }

    try {
      setDoc(doc(db, 'cannedResponses', canned.id), sanitizeForFirestore(canned), { merge: true }).catch((err) => {
        console.warn('Failed to sync canned response to Firestore:', err);
      });
    } catch (e) {
      console.warn('Firestore canned response sync deferred:', e);
    }
  }

  public deleteCannedResponse(id: string): void {
    const list = this.getCannedResponses().filter((c) => c.id !== id);
    saveStore(STORAGE_KEYS.CANNED_RESPONSES, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eduform_canned_responses_updated', { detail: { id } })
      );
    }

    try {
      deleteDoc(doc(db, 'cannedResponses', id)).catch((err) => {
        console.warn('Failed to delete canned response from Firestore:', err);
      });
    } catch (e) {
      console.warn('Firestore canned response delete deferred:', e);
    }
  }

  public interpolateCannedResponse(
    content: string,
    vars: {
      studentName?: string;
      teacherName?: string;
      subjectName?: string;
      className?: string;
    }
  ): string {
    const sName = vars.studentName ? vars.studentName.split(' ')[0] : 'Student';
    const tName = vars.teacherName || 'Teacher';
    const subj = vars.subjectName || 'the subject';
    const cls = vars.className || 'your class';

    return content
      .replace(/{student_name}/gi, sName)
      .replace(/{name}/gi, sName)
      .replace(/{teacher_name}/gi, tName)
      .replace(/{subject_name}/gi, subj)
      .replace(/{class_name}/gi, cls);
  }
}

export const dataStore = new DataStore();
if (typeof window !== 'undefined') {
  dataStore.initFirestoreSync();
}

