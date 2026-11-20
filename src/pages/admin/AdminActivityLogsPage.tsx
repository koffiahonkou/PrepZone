import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileJson,
  FileQuestion,
  Filter,
  History,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { dataStore } from '@/src/services/dataStore';
import { AcademicClass, AuditLog, Quiz, Subject, UserProfile } from '@/src/types';

type AuditCategory = 'all' | 'users' | 'classes' | 'quizzes' | 'system';

interface ClassifiedLog {
  log: AuditLog;
  category: Exclude<AuditCategory, 'all'>;
  actionLabel: string;
  severity: 'positive' | 'info' | 'warning' | 'danger' | 'neutral';
  actorDisplayName: string;
  actorSecondary: string;
  targetDisplayName: string;
  targetSecondary: string;
  summary: string;
}

const ACTION_DEFINITIONS: Record<
  string,
  {
    label: string;
    category: Exclude<AuditCategory, 'all'>;
    severity: ClassifiedLog['severity'];
  }
> = {
  // User Account Events
  USER_CREATED: {
    label: 'User Account Created',
    category: 'users',
    severity: 'positive',
  },
  USER_UPDATED: {
    label: 'User Account Updated',
    category: 'users',
    severity: 'info',
  },
  USER_DELETED: {
    label: 'User Account Deleted',
    category: 'users',
    severity: 'danger',
  },
  USER_STATUS_CHANGED: {
    label: 'Account Status Changed',
    category: 'users',
    severity: 'warning',
  },
  USER_AUTO_DEACTIVATED: {
    label: 'Account Auto-Deactivated',
    category: 'users',
    severity: 'danger',
  },
  USER_AUTO_REACTIVATED: {
    label: 'Account Auto-Reactivated',
    category: 'users',
    severity: 'positive',
  },
  USER_DEACTIVATION_SCHEDULE_UPDATED: {
    label: 'Auto-Deactivation Date Updated',
    category: 'users',
    severity: 'warning',
  },
  USER_REACTIVATION_SCHEDULE_UPDATED: {
    label: 'Reactivation Date Updated',
    category: 'users',
    severity: 'info',
  },
  USER_LIFECYCLE_SCHEDULE_UPDATED: {
    label: 'Reactivation & Deactivation Dates Updated',
    category: 'users',
    severity: 'info',
  },
  USER_PASSWORD_CHANGED: {
    label: 'User Changed Password',
    category: 'users',
    severity: 'info',
  },
  ADMIN_PASSWORD_RESET: {
    label: 'Admin Reset Password',
    category: 'users',
    severity: 'warning',
  },
  SELF_SERVICE_PASSWORD_RESET: {
    label: 'Self-Service Password Reset',
    category: 'users',
    severity: 'info',
  },

  // Class Assignments & Class Cohort Events
  USER_CLASS_ASSIGNMENTS_UPDATED: {
    label: 'User Class Assignment Updated',
    category: 'classes',
    severity: 'info',
  },
  USER_CLASS_ASSIGNED: {
    label: 'User Assigned to Class',
    category: 'classes',
    severity: 'positive',
  },
  CLASS_CREATED: {
    label: 'Class Stream Created',
    category: 'classes',
    severity: 'positive',
  },
  CLASS_UPDATED: {
    label: 'Class Stream Updated',
    category: 'classes',
    severity: 'info',
  },
  CLASS_DELETED: {
    label: 'Class Stream Deleted',
    category: 'classes',
    severity: 'danger',
  },
  LEVEL_CREATED: {
    label: 'Academic Level Created',
    category: 'classes',
    severity: 'positive',
  },
  LEVEL_UPDATED: {
    label: 'Academic Level Updated',
    category: 'classes',
    severity: 'info',
  },
  LEVEL_DELETED: {
    label: 'Academic Level Deleted',
    category: 'classes',
    severity: 'danger',
  },

  // Quiz Lifecycle Events
  QUIZ_CREATED: {
    label: 'Quiz Created',
    category: 'quizzes',
    severity: 'positive',
  },
  QUIZ_PUBLISHED: {
    label: 'Quiz Published',
    category: 'quizzes',
    severity: 'positive',
  },
  QUIZ_UPDATED: {
    label: 'Quiz Updated',
    category: 'quizzes',
    severity: 'info',
  },
  QUIZ_DUPLICATED: {
    label: 'Quiz Duplicated',
    category: 'quizzes',
    severity: 'info',
  },
  QUIZ_REACTIVATED: {
    label: 'Quiz Reactivated',
    category: 'quizzes',
    severity: 'positive',
  },
  QUIZ_STATUS_CHANGED: {
    label: 'Quiz Status Changed',
    category: 'quizzes',
    severity: 'warning',
  },
  QUIZ_DELETED: {
    label: 'Quiz Deleted',
    category: 'quizzes',
    severity: 'danger',
  },
  QUIZ_SUBMITTED: {
    label: 'Quiz Attempt Submitted',
    category: 'quizzes',
    severity: 'neutral',
  },

  // System & Other
  SYSTEM_INITIALIZED: {
    label: 'System Initialized',
    category: 'system',
    severity: 'neutral',
  },
  THEME_ACTIVATED: {
    label: 'System Theme Activated',
    category: 'system',
    severity: 'info',
  },
  SYSTEM_DATA_EXPORTED: {
    label: 'Full System Backup Exported',
    category: 'system',
    severity: 'info',
  },
  SYSTEM_DATA_IMPORTED: {
    label: 'System Backup Imported',
    category: 'system',
    severity: 'warning',
  },
  LESSON_PUBLISHED: {
    label: 'Lesson Note Published',
    category: 'system',
    severity: 'positive',
  },
};

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 0) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function getCategoryLabel(cat: Exclude<AuditCategory, 'all'>): string {
  switch (cat) {
    case 'users':
      return 'User Accounts';
    case 'classes':
      return 'Class Assignments';
    case 'quizzes':
      return 'Quiz Events';
    case 'system':
      return 'System & Content';
  }
}

function getSeverityTextClass(severity: ClassifiedLog['severity']): string {
  switch (severity) {
    case 'positive':
      return 'text-emerald-700';
    case 'info':
      return 'text-blue-700';
    case 'warning':
      return 'text-amber-700';
    case 'danger':
      return 'text-rose-700';
    default:
      return 'text-slate-700';
  }
}

function getSeverityDotClass(severity: ClassifiedLog['severity']): string {
  switch (severity) {
    case 'positive':
      return 'bg-emerald-600';
    case 'info':
      return 'bg-blue-600';
    case 'warning':
      return 'bg-amber-600';
    case 'danger':
      return 'bg-rose-600';
    default:
      return 'bg-slate-500';
  }
}

export const AdminActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => dataStore.getAuditLogs());
  const [users, setUsers] = useState<UserProfile[]>(() => dataStore.getUsers());
  const [classes, setClasses] = useState<AcademicClass[]>(() => dataStore.getClasses());
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => dataStore.getQuizzes());
  const [subjects, setSubjects] = useState<Subject[]>(() => dataStore.getSubjects());

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pageSize = 25;

  const reloadAll = () => {
    setLogs(dataStore.getAuditLogs());
    setUsers(dataStore.getUsers());
    setClasses(dataStore.getClasses());
    setQuizzes(dataStore.getQuizzes());
    setSubjects(dataStore.getSubjects());
  };

  useEffect(() => {
    window.addEventListener('eduform_audit_logs_updated', reloadAll);
    window.addEventListener('eduform_users_updated', reloadAll);
    window.addEventListener('eduform_classes_updated', reloadAll);
    window.addEventListener('eduform_quizzes_updated', reloadAll);
    window.addEventListener('eduform_subjects_updated', reloadAll);
    return () => {
      window.removeEventListener('eduform_audit_logs_updated', reloadAll);
      window.removeEventListener('eduform_users_updated', reloadAll);
      window.removeEventListener('eduform_classes_updated', reloadAll);
      window.removeEventListener('eduform_quizzes_updated', reloadAll);
      window.removeEventListener('eduform_subjects_updated', reloadAll);
    };
  }, []);

  const userById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const classById = useMemo(() => {
    const map = new Map<string, AcademicClass>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const quizById = useMemo(() => {
    const map = new Map<string, Quiz>();
    quizzes.forEach((q) => map.set(q.id, q));
    return map;
  }, [quizzes]);

  const subjectById = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const classifiedLogs = useMemo<ClassifiedLog[]>(() => {
    const resolveClassList = (ids: unknown, names?: unknown): string[] => {
      const providedNames = asStringArray(names);
      if (providedNames.length > 0) return providedNames;
      return asStringArray(ids).map((cid) => classById.get(cid)?.name || cid);
    };

    const resolveActor = (actorId: string): { name: string; secondary: string } => {
      if (!actorId || actorId === 'system') {
        return { name: 'System Service', secondary: 'Automated engine' };
      }
      if (actorId === 'system-scheduler') {
        return { name: 'Account Lifecycle Scheduler', secondary: 'Scheduled background check' };
      }
      if (actorId === 'system-login-check') {
        return { name: 'Login Enforcement Guard', secondary: 'Sign-in threshold check' };
      }
      if (actorId === 'admin') {
        return { name: 'Administrator', secondary: 'Admin console' };
      }
      if (actorId === 'staff') {
        return { name: 'Staff Author', secondary: 'Academic workspace' };
      }
      const user = userById.get(actorId);
      if (user) {
        return {
          name: user.fullName,
          secondary: `@${user.username} · ${user.role}`,
        };
      }
      return { name: actorId, secondary: 'External or removed actor' };
    };

    return logs.map((log) => {
      const meta = (log.meta || {}) as Record<string, unknown>;
      const def = ACTION_DEFINITIONS[log.action];

      let category: Exclude<AuditCategory, 'all'> = def?.category || 'system';
      if (!def) {
        if (log.targetType === 'user' || log.action.startsWith('USER_') || log.action.includes('PASSWORD')) {
          category = 'users';
        } else if (
          log.targetType === 'class' ||
          log.targetType === 'class_assignment' ||
          log.targetType === 'level' ||
          log.action.startsWith('CLASS_')
        ) {
          category = 'classes';
        } else if (log.targetType === 'quiz' || log.action.startsWith('QUIZ_')) {
          category = 'quizzes';
        }
      }

      const actionLabel =
        def?.label ||
        log.action
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (ch) => ch.toUpperCase());
      const severity: ClassifiedLog['severity'] = def?.severity || 'neutral';

      const actor = resolveActor(log.actorId);

      // Resolve Target
      let targetDisplayName = log.targetId || 'System';
      let targetSecondary = log.targetType;

      if (log.targetType === 'user' || log.targetType === 'class_assignment') {
        const targetUser = userById.get(log.targetId);
        const metaFullName = typeof meta.fullName === 'string' ? meta.fullName : '';
        const metaUsername = typeof meta.username === 'string' ? meta.username : '';
        const metaRole = typeof meta.role === 'string' ? meta.role : '';
        if (targetUser) {
          targetDisplayName = targetUser.fullName;
          targetSecondary = `@${targetUser.username} · ${targetUser.role}`;
        } else if (metaFullName || metaUsername) {
          targetDisplayName = metaFullName || `@${metaUsername}`;
          targetSecondary = [metaUsername ? `@${metaUsername}` : '', metaRole]
            .filter(Boolean)
            .join(' · ');
        }
      } else if (log.targetType === 'class') {
        const cls = classById.get(log.targetId);
        const metaClassName =
          typeof meta.className === 'string'
            ? meta.className
            : typeof meta.name === 'string'
              ? meta.name
              : '';
        targetDisplayName = cls?.name || metaClassName || log.targetId;
        const levelName = typeof meta.levelName === 'string' ? meta.levelName : '';
        targetSecondary = levelName ? `Class · ${levelName}` : 'Class stream';
      } else if (log.targetType === 'level') {
        const metaLevelName = typeof meta.levelName === 'string' ? meta.levelName : '';
        targetDisplayName = metaLevelName || log.targetId;
        targetSecondary = 'Academic level';
      } else if (log.targetType === 'quiz') {
        const quiz = quizById.get(log.targetId);
        const metaTitle = typeof meta.title === 'string' ? meta.title : '';
        targetDisplayName = quiz?.title || metaTitle || log.targetId;
        const subjId = quiz?.subjectId || (typeof meta.subjectId === 'string' ? meta.subjectId : '');
        const subjName =
          (typeof meta.subjectName === 'string' && meta.subjectName) ||
          subjectById.get(subjId)?.name ||
          '';
        targetSecondary = subjName ? `Quiz · ${subjName}` : 'Assessment';
      } else if (log.targetType === 'lesson') {
        targetDisplayName =
          (typeof meta.title === 'string' && meta.title) || log.targetId;
        targetSecondary = 'Lesson note';
      } else if (log.targetType === 'submission') {
        const quizId = typeof meta.quizId === 'string' ? meta.quizId : '';
        const quizTitle = quizById.get(quizId)?.title || quizId;
        targetDisplayName = quizTitle ? `Submission (${quizTitle})` : log.targetId;
        targetSecondary = 'Quiz submission';
      } else if (log.targetType === 'system') {
        targetDisplayName = log.targetId === 'global' ? 'Global Configuration' : log.targetId;
        targetSecondary = 'Platform settings';
      }

      // Build human summary
      let summary = '';
      switch (log.action) {
        case 'USER_CREATED': {
          const assignedClasses = resolveClassList(meta.classIds, meta.classNames);
          const legacyClass = typeof meta.class === 'string' ? meta.class : '';
          const classLabel =
            assignedClasses.length > 0
              ? `Assigned classes: ${assignedClasses.join(', ')}`
              : legacyClass
                ? `Class: ${legacyClass}`
                : 'No classes assigned';
          const role = typeof meta.role === 'string' ? meta.role : 'user';
          const deactivation =
            typeof meta.deactivationDate === 'string' && meta.deactivationDate
              ? ` · Auto-deactivates ${new Date(meta.deactivationDate).toLocaleDateString()}`
              : '';
          summary = `Created ${role} account · ${classLabel}${deactivation}`;
          break;
        }
        case 'USER_UPDATED': {
          const changed = asStringArray(meta.changedFields);
          const parts: string[] = [];
          if (changed.length > 0) {
            parts.push(`Modified: ${changed.join(', ')}`);
          } else {
            parts.push('Profile details updated');
          }
          if (typeof meta.previousRole === 'string' && typeof meta.role === 'string') {
            parts.push(`Role: ${meta.previousRole} → ${meta.role}`);
          }
          if (typeof meta.previousStatus === 'string' && typeof meta.status === 'string') {
            parts.push(`Status: ${meta.previousStatus} → ${meta.status}`);
          }
          summary = parts.join(' · ');
          break;
        }
        case 'USER_STATUS_CHANGED': {
          const prev = typeof meta.previousStatus === 'string' ? meta.previousStatus : 'unknown';
          const next = typeof meta.newStatus === 'string' ? meta.newStatus : 'unknown';
          summary = `Account status switched from ${prev} to ${next}${
            meta.expiredScheduleCleared ? ' (expired schedule cleared)' : ''
          }`;
          break;
        }
        case 'USER_DELETED': {
          const role = typeof meta.role === 'string' ? meta.role : 'user';
          summary = `Permanently deleted ${role} account (@${String(meta.username || log.targetId)})`;
          break;
        }
        case 'USER_AUTO_DEACTIVATED': {
          const trigger =
            meta.trigger === 'login_check'
              ? 'Login threshold check'
              : meta.trigger === 'scheduled_job'
                ? 'Scheduled background check'
                : 'Expiration sweep';
          summary = `Disabled automatically after reaching deactivation date · Trigger: ${trigger}`;
          break;
        }
        case 'USER_AUTO_REACTIVATED': {
          const trigger =
            meta.trigger === 'login_check'
              ? 'Login threshold check'
              : meta.trigger === 'scheduled_job'
                ? 'Scheduled background check'
                : 'Lifecycle sweep';
          const nextDeact =
            typeof meta.deactivationDate === 'string' && meta.deactivationDate
              ? ` · Next auto-off: ${new Date(meta.deactivationDate).toLocaleDateString()}`
              : '';
          summary = `Reactivated automatically on scheduled date · Trigger: ${trigger}${nextDeact}`;
          break;
        }
        case 'USER_DEACTIVATION_SCHEDULE_UPDATED': {
          const nextDate =
            typeof meta.deactivationDate === 'string' && meta.deactivationDate
              ? new Date(meta.deactivationDate).toLocaleString()
              : 'Cleared (no expiry)';
          summary = `Scheduled deactivation set to: ${nextDate}`;
          break;
        }
        case 'USER_REACTIVATION_SCHEDULE_UPDATED': {
          const nextReact =
            typeof meta.reactivationDate === 'string' && meta.reactivationDate
              ? new Date(meta.reactivationDate).toLocaleString()
              : 'Cleared';
          summary = `Scheduled reactivation set to: ${nextReact}`;
          break;
        }
        case 'USER_LIFECYCLE_SCHEDULE_UPDATED': {
          const reactLabel =
            typeof meta.reactivationDate === 'string' && meta.reactivationDate
              ? new Date(meta.reactivationDate).toLocaleString()
              : 'Not scheduled';
          const deactLabel =
            typeof meta.deactivationDate === 'string' && meta.deactivationDate
              ? new Date(meta.deactivationDate).toLocaleString()
              : 'Not scheduled';
          summary = `Reactivates: ${reactLabel} · Auto-deactivates: ${deactLabel}`;
          break;
        }
        case 'USER_PASSWORD_CHANGED':
        case 'ADMIN_PASSWORD_RESET':
        case 'SELF_SERVICE_PASSWORD_RESET': {
          summary = `Credentials updated for @${String(meta.username || targetDisplayName)}`;
          break;
        }
        case 'USER_CLASS_ASSIGNMENTS_UPDATED':
        case 'USER_CLASS_ASSIGNED': {
          const added = resolveClassList(meta.addedClassIds, meta.addedClassNames);
          const removed = resolveClassList(meta.removedClassIds, meta.removedClassNames);
          const current = resolveClassList(meta.classIds, meta.classNames);
          const parts: string[] = [];
          if (added.length > 0) parts.push(`Added: ${added.join(', ')}`);
          if (removed.length > 0) parts.push(`Removed: ${removed.join(', ')}`);
          if (parts.length === 0 && current.length > 0) {
            parts.push(`Assigned: ${current.join(', ')}`);
          }
          summary = parts.length > 0 ? parts.join(' · ') : 'Class enrollment updated';
          break;
        }
        case 'CLASS_CREATED': {
          const subjs = asStringArray(meta.subjectNames);
          summary = `Created class in ${String(meta.levelName || meta.levelId || 'academic tier')} · ${
            subjs.length > 0 ? `${subjs.length} subjects (${subjs.slice(0, 3).join(', ')})` : '0 subjects'
          }`;
          break;
        }
        case 'CLASS_UPDATED': {
          const addedSubj = asStringArray(meta.addedSubjectIds).map(
            (id) => subjectById.get(id)?.name || id
          );
          const removedSubj = asStringArray(meta.removedSubjectIds).map(
            (id) => subjectById.get(id)?.name || id
          );
          const parts: string[] = [];
          if (typeof meta.previousName === 'string' && meta.previousName !== meta.className) {
            parts.push(`Renamed from "${meta.previousName}"`);
          }
          if (addedSubj.length > 0) parts.push(`+${addedSubj.length} subject(s): ${addedSubj.join(', ')}`);
          if (removedSubj.length > 0) parts.push(`-${removedSubj.length} subject(s): ${removedSubj.join(', ')}`);
          if (parts.length === 0) {
            const subjs = asStringArray(meta.subjectNames);
            parts.push(`${subjs.length} assigned subject(s)`);
          }
          summary = parts.join(' · ');
          break;
        }
        case 'CLASS_DELETED': {
          const affected = typeof meta.affectedUsers === 'number' ? meta.affectedUsers : 0;
          summary = `Removed class "${String(meta.className || log.targetId)}" (${affected} user assignment(s) cleared)`;
          break;
        }
        case 'LEVEL_CREATED':
        case 'LEVEL_UPDATED':
        case 'LEVEL_DELETED': {
          summary = `${actionLabel}: ${String(meta.levelName || log.targetId)}`;
          break;
        }
        case 'QUIZ_CREATED':
        case 'QUIZ_DUPLICATED':
        case 'QUIZ_PUBLISHED': {
          const qCount = typeof meta.questionCount === 'number' ? meta.questionCount : undefined;
          const totalMarks = typeof meta.totalMarks === 'number' ? meta.totalMarks : undefined;
          const assigned = resolveClassList(meta.classIds, meta.classNames);
          const details: string[] = [];
          if (qCount !== undefined) details.push(`${qCount} questions`);
          if (totalMarks !== undefined) details.push(`${totalMarks} marks`);
          if (assigned.length > 0) details.push(`Classes: ${assigned.join(', ')}`);
          if (typeof meta.status === 'string') details.push(`Status: ${meta.status}`);
          summary = details.length > 0 ? details.join(' · ') : `Quiz "${targetDisplayName}" saved`;
          break;
        }
        case 'QUIZ_UPDATED':
        case 'QUIZ_REACTIVATED':
        case 'QUIZ_STATUS_CHANGED': {
          const prev = typeof meta.previousStatus === 'string' ? meta.previousStatus : undefined;
          const next = typeof meta.status === 'string' ? meta.status : undefined;
          const assigned = resolveClassList(meta.classIds, meta.classNames);
          const details: string[] = [];
          if (prev && next && prev !== next) {
            details.push(`Status: ${prev} → ${next}`);
          } else if (next) {
            details.push(`Status: ${next}`);
          }
          if (typeof meta.questionCount === 'number') details.push(`${meta.questionCount} questions`);
          if (typeof meta.totalMarks === 'number') details.push(`${meta.totalMarks} marks`);
          if (assigned.length > 0) details.push(`Classes: ${assigned.join(', ')}`);
          summary = details.join(' · ') || 'Quiz configuration updated';
          break;
        }
        case 'QUIZ_DELETED': {
          summary = `Deleted assessment "${String(meta.title || log.targetId)}"`;
          break;
        }
        case 'QUIZ_SUBMITTED': {
          summary = `Submitted attempt · Auto score: ${String(meta.autoScore ?? 'N/A')} · Status: ${String(meta.status || 'submitted')}`;
          break;
        }
        default: {
          const metaPairs = Object.entries(meta)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
          summary = metaPairs.length > 0 ? metaPairs.join(' · ') : actionLabel;
        }
      }

      return {
        log,
        category,
        actionLabel,
        severity,
        actorDisplayName: actor.name,
        actorSecondary: actor.secondary,
        targetDisplayName,
        targetSecondary,
        summary,
      };
    });
  }, [logs, userById, classById, quizById, subjectById]);

  const categoryCounts = useMemo(() => {
    const counts = {
      all: classifiedLogs.length,
      users: 0,
      classes: 0,
      quizzes: 0,
      system: 0,
    };
    classifiedLogs.forEach((item) => {
      counts[item.category]++;
    });
    return counts;
  }, [classifiedLogs]);

  const todayCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const threshold = startOfToday.getTime();
    return classifiedLogs.filter((item) => new Date(item.log.timestamp).getTime() >= threshold).length;
  }, [classifiedLogs]);

  const availableActions = useMemo(() => {
    const set = new Set<string>();
    classifiedLogs.forEach((item) => set.add(item.log.action));
    return Array.from(set).sort();
  }, [classifiedLogs]);

  const availableActors = useMemo(() => {
    const map = new Map<string, string>();
    classifiedLogs.forEach((item) => {
      if (!map.has(item.log.actorId)) {
        map.set(item.log.actorId, item.actorDisplayName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [classifiedLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return classifiedLogs.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (actionFilter !== 'all' && item.log.action !== actionFilter) return false;
      if (actorFilter !== 'all' && item.log.actorId !== actorFilter) return false;

      const ts = new Date(item.log.timestamp).getTime();
      if (fromMs !== null && ts < fromMs) return false;
      if (toMs !== null && ts > toMs) return false;

      if (q) {
        const haystack = [
          item.log.action,
          item.actionLabel,
          item.actorDisplayName,
          item.actorSecondary,
          item.targetDisplayName,
          item.targetSecondary,
          item.summary,
          item.log.targetId,
          JSON.stringify(item.log.meta || {}),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [classifiedLogs, categoryFilter, actionFilter, actorFilter, dateFrom, dateTo, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safePage]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, actionFilter, actorFilter, dateFrom, dateTo, searchQuery]);

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    actionFilter !== 'all' ||
    actorFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setCategoryFilter('all');
    setActionFilter('all');
    setActorFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const handleRefreshFromCloud = async () => {
    setIsRefreshing(true);
    try {
      await dataStore.pullAllRemoteDataFromFirestore();
      reloadAll();
      toast.success('Activity logs synchronized with cloud records.');
    } catch {
      reloadAll();
      toast.info('Refreshed local activity logs.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.info('No matching logs to export.');
      return;
    }
    const headers = [
      'ID',
      'Timestamp',
      'Category',
      'Action',
      'Action Label',
      'Actor',
      'Actor Details',
      'Target',
      'Target Type',
      'Summary',
      'Metadata JSON',
    ];
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((item) =>
      [
        item.log.id,
        item.log.timestamp,
        getCategoryLabel(item.category),
        item.log.action,
        item.actionLabel,
        item.actorDisplayName,
        item.actorSecondary,
        item.targetDisplayName,
        item.log.targetType,
        item.summary,
        JSON.stringify(item.log.meta || {}),
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eduform-activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} audit log records to CSV.`);
  };

  const handleExportJson = () => {
    if (filteredLogs.length === 0) {
      toast.info('No matching logs to export.');
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      totalExported: filteredLogs.length,
      filters: {
        category: categoryFilter,
        action: actionFilter,
        actor: actorFilter,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        search: searchQuery || null,
      },
      records: filteredLogs.map((item) => ({
        ...item.log,
        category: item.category,
        actionLabel: item.actionLabel,
        actorDisplayName: item.actorDisplayName,
        targetDisplayName: item.targetDisplayName,
        summary: item.summary,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eduform-activity-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} audit log records to JSON.`);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryIcon = (item: ClassifiedLog) => {
    if (item.category === 'users') {
      if (item.log.action === 'USER_CREATED') return <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />;
      if (item.log.action === 'USER_DELETED' || item.log.action === 'USER_AUTO_DEACTIVATED') {
        return <UserMinus className="w-4 h-4 text-rose-600 shrink-0" />;
      }
      if (item.log.action === 'USER_STATUS_CHANGED') return <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />;
      return <UserCog className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (item.category === 'classes') {
      return <Layers className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (item.category === 'quizzes') {
      return <FileQuestion className="w-4 h-4 text-indigo-600 shrink-0" />;
    }
    if (item.log.targetType === 'lesson') {
      return <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    return <Settings className="w-4 h-4 text-slate-600 shrink-0" />;
  };

  const tabs: { id: AuditCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Events', count: categoryCounts.all },
    { id: 'users', label: 'User Accounts', count: categoryCounts.users },
    { id: 'classes', label: 'Class Assignments', count: categoryCounts.classes },
    { id: 'quizzes', label: 'Quiz Events', count: categoryCounts.quizzes },
    { id: 'system', label: 'System & Content', count: categoryCounts.system },
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2.5">
            <History className="w-6 h-6 text-emerald-600 shrink-0" />
            <span>Admin Activity Logs</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Centralized, append-only audit trail tracking user account lifecycle changes, class assignments, and quiz creation events.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefreshFromCloud}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Logs</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* 4-Column Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`text-left bg-white p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === 'all' ? 'border-[#0F2A4A] ring-1 ring-[#0F2A4A]/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Logged Events</span>
            <Activity className="w-4 h-4 text-[#0F2A4A]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">{categoryCounts.all}</p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {todayCount} recorded today
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('users')}
          className={`text-left bg-white p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === 'users' ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>User Account Changes</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">{categoryCounts.users}</p>
          <p className="mt-1 text-xs text-slate-500">
            Creates, edits, status &amp; deletions
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('classes')}
          className={`text-left bg-white p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === 'classes' ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Class Assignments</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">{categoryCounts.classes}</p>
          <p className="mt-1 text-xs text-slate-500">
            Enrollments, streams &amp; subject maps
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('quizzes')}
          className={`text-left bg-white p-4 rounded-xl border transition-colors cursor-pointer ${
            categoryFilter === 'quizzes' ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Quiz Creation &amp; Lifecycle</span>
            <FileQuestion className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">{categoryCounts.quizzes}</p>
          <p className="mt-1 text-xs text-slate-500">
            Created, duplicated, reactivated &amp; closed
          </p>
        </button>
      </div>

      {/* Main Audit Workspace Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Category Segmented Tabs + Live Search & Facets */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {tabs.map((tab) => {
                const active = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-white text-[#0F2A4A] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-500">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5 tabular-nums">
              <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Showing {filteredLogs.length} of {classifiedLogs.length} events</span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actor, target user, class, quiz, or details..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div className="lg:col-span-3 relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                aria-label="Filter by action"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="all">All Event Actions</option>
                {availableActions.map((act) => (
                  <option key={act} value={act}>
                    {ACTION_DEFINITIONS[act]?.label || act}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                aria-label="Filter by actor"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="all">All Actors</option>
                {availableActors.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="From date"
                  title="From date"
                  className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tabular-nums"
                />
              </div>
              <span className="text-xs text-slate-400 shrink-0">to</span>
              <div className="relative flex-1 min-w-0">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="To date"
                  title="To date"
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tabular-nums"
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Reset all filters"
                  className="p-2 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table View */}
        {paginatedLogs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0F2A4A]">No matching activity records found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Adjust your category tab, search keywords, actor selection, or date boundaries to inspect earlier audit records.'
                : 'Administrative events such as account edits, class assignments, and quiz creation will appear here automatically.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] text-white hover:bg-[#163c68] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px] tracking-wide">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-4 whitespace-nowrap">Event &amp; Category</th>
                  <th className="py-3 px-4 whitespace-nowrap">Actor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Target Entity</th>
                  <th className="py-3 px-4">Activity Summary</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((item) => {
                  const isExpanded = Boolean(expandedIds[item.log.id]);
                  const metaEntries = Object.entries(item.log.meta || {}).filter(
                    ([, val]) => val !== undefined
                  );

                  return (
                    <React.Fragment key={item.log.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors align-top">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono tabular-nums text-[11px] font-medium text-slate-800">
                            {new Date(item.log.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                            {formatRelativeTime(item.log.timestamp)}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(item)}
                            <div>
                              <div className={`font-semibold ${getSeverityTextClass(item.severity)} flex items-center gap-1.5`}>
                                <span className={`w-1.5 h-1.5 rounded-xs shrink-0 ${getSeverityDotClass(item.severity)}`} />
                                <span>{item.actionLabel}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span>{getCategoryLabel(item.category)}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-[10px]">{item.log.action}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{item.actorDisplayName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.actorSecondary}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 max-w-[220px] truncate" title={item.targetDisplayName}>
                            {item.targetDisplayName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                            {item.targetSecondary}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 leading-relaxed min-w-[240px] max-w-[380px]">
                          {item.summary}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-slate-700 hover:text-[#0F2A4A] hover:bg-slate-100 border border-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="px-4 py-3 border-t border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/80 text-[11px] text-slate-500">
                              <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                                <span>Log ID: {item.log.id}</span>
                                <span aria-hidden="true">·</span>
                                <span>Actor ID: {item.log.actorId}</span>
                                <span aria-hidden="true">·</span>
                                <span>Target ID: {item.log.targetId}</span>
                              </div>
                              <span className="font-mono tabular-nums">
                                ISO: {item.log.timestamp}
                              </span>
                            </div>

                            {metaEntries.length === 0 ? (
                              <p className="text-xs text-slate-500">No additional metadata recorded for this event.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                                {metaEntries.map(([key, value]) => (
                                  <div key={key} className="flex flex-col py-1">
                                    <span className="text-[11px] font-semibold text-slate-500">{key}</span>
                                    <span className="font-mono text-[11px] text-slate-800 break-words">
                                      {Array.isArray(value)
                                        ? value.length > 0
                                          ? value.join(', ')
                                          : '[]'
                                        : typeof value === 'object' && value !== null
                                          ? JSON.stringify(value)
                                          : value === null
                                            ? 'null'
                                            : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="tabular-nums">
              Showing{' '}
              <span className="font-semibold text-slate-900">
                {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredLogs.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{filteredLogs.length}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="font-mono tabular-nums text-[11px] px-2">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
