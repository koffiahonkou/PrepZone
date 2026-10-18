export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive';

export interface UserProfile {
  uid: string;
  username: string;
  usernameLower: string;
  authEmail: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  classIds: string[];
  levelIds: string[];
  subjectIds?: string[];
  password?: string;
  createdBy: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AcademicLevel {
  id: string;
  name: string;
  order: number;
}

export interface AcademicClass {
  id: string;
  name: string;
  levelId: string;
  subjectIds: string[];
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface LessonAttachment {
  name: string;
  url: string;
  type: string;
  size?: string;
  dataUrl?: string;
}

export interface Lesson {
  id: string;
  title: string;
  classIds: string[];
  levelIds: string[];
  subjectId: string;
  bodyHtml: string;
  attachments: LessonAttachment[];
  videoUrl?: string;
  videoType?: 'youtube' | 'vimeo' | 'mp4' | 'upload' | string;
  videoTitle?: string;
  status: 'draft' | 'published';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType =
  | 'single_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_text'
  | 'theory';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  promptHtml: string;
  marks: number;
  options?: QuestionOption[];
  correctOptionIds?: string[];
  correctText?: string;
  acceptedAnswers?: string[];
  explanationHtml?: string;
  modelAnswerHtml?: string;
  section?: 'multiple_choice' | 'true_false' | 'short_text' | 'theory' | string;
  sectionTitle?: string;
}

export interface QuizSettings {
  timeLimitMins: number; // 0 = unlimited
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: number;
  instantFeedback: boolean;
  showCorrectAnswers: boolean;
  passMarkPercent: number;
  releaseResultsAt: string | null;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  classIds: string[];
  levelIds: string[];
  status: 'draft' | 'published' | 'closed';
  settings: QuizSettings;
  questions: QuizQuestion[];
  totalMarks: number;
  createdBy: string;
  createdAt: string;
}

export interface SubmissionAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  autoMarks: number;
  manualMarks: number | null;
  feedback: string | null;
  isCorrect: boolean | null;
}

export type SubmissionStatus = 'auto_graded' | 'pending_manual' | 'fully_graded';

export interface Submission {
  id: string;
  quizId: string;
  userId: string;
  classId: string;
  attemptNumber: number;
  answers: SubmissionAnswer[];
  autoScore: number;
  autoTotal: number;
  manualScore: number;
  manualTotal: number;
  totalScore: number;
  totalPossible: number;
  percent: number;
  status: SubmissionStatus;
  questionOrder: string[];
  optionOrder: Record<string, string[]>;
  submittedAt: string;
  gradedBy?: string | null;
  gradedAt?: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  bodyHtml: string;
  priority: 'normal' | 'high';
  audience: {
    type: 'all' | 'class' | 'level' | 'user';
    ids: string[];
  };
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface NotificationRead {
  id: string; // notificationId_uid
  notificationId: string;
  userId: string;
  readAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: Record<string, unknown>;
  timestamp: string;
}

export interface SystemSettings {
  appName: string;
  tagline?: string;
  logoUrl?: string;
  logoTheme?: 'shield' | 'classical' | 'modern' | 'book' | string;
  themeId?: string;
  schoolAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  schoolWebsite?: string;
  principalOrHead?: string;
  defaultPassMarkPercent: number;
  academicTermLabel: string;
  updatedAt?: string;
}
