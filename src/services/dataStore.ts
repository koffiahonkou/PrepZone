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
} from './sampleData';
import { assertValidQuiz } from './quizValidator';

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

  public saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.uid === user.uid);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.unshift(user);
    }
    saveStore(STORAGE_KEYS.USERS, users);
  }

  public deleteUser(uid: string): void {
    const users = this.getUsers().filter((u) => u.uid !== uid);
    saveStore(STORAGE_KEYS.USERS, users);
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
  }

  public deleteLesson(id: string): void {
    const lessons = this.getLessons().filter((l) => l.id !== id);
    saveStore(STORAGE_KEYS.LESSONS, lessons);
  }

  // --- Quizzes ---
  public getQuizzes(): Quiz[] {
    const quizzes = getStoredOrInit<Quiz[]>(STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);
    let modified = false;
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
      totalMarks: validation.totalMarks,
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
      import('@/src/lib/firebase').then(({ db }) => {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          setDoc(doc(db, 'quizzes', normalizedQuiz.id), normalizedQuiz).catch((err) => {
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
      import('@/src/lib/firebase').then(({ db }) => {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          setDoc(doc(db, 'submissions', submission.id), submission).catch((err) => {
            console.warn('Firestore submission sync deferred/offline:', err);
          });
        });
      });
    } catch {
      // safe fallback
    }

    return true;
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
  }
}

export const dataStore = new DataStore();
