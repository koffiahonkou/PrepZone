import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  KeyRound,
  Check,
  Code2,
  ShieldAlert,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { ChangePasswordModal } from '@/src/components/auth/ChangePasswordModal';
import { dataStore } from '@/src/services/dataStore';
import { UserProfile, UserRole, UserStatus, AcademicClass, AcademicLevel, Subject } from '@/src/types';
import {
  isDeveloperAccount,
  isAutoDeactivationDue,
  getDeactivationThreshold,
  getReactivationThreshold,
  isOldOrDormantAccount,
  evaluateAccountLifecycle,
  formatAutoDeactivateDateTime,
  toDateInputAndTime,
  combineDateAndTimeToIso,
  parseDeactivationTimestamp,
} from '@/src/utils/accountLifecycle';
import {
  updateUserAsAdmin,
  deleteUserAsAdmin,
  updateUserLifecycleDates,
} from '@/src/services/userAdminService';
import { toast } from 'sonner';

export const AdminUsersPage: React.FC = () => {
  const { profile: currentLoggedInUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>(() => dataStore.getUsers());
  const [isDeveloperPasswordModalOpen, setIsDeveloperPasswordModalOpen] = useState(false);
  const [classes, setClasses] = useState<AcademicClass[]>(() => dataStore.getClasses());
  const [levels, setLevels] = useState<AcademicLevel[]>(() => dataStore.getLevels());
  const [subjects, setSubjects] = useState<Subject[]>(() => dataStore.getSubjects());

  useEffect(() => {
    const handleUpdate = () => {
      setUsers(dataStore.getUsers());
      setClasses(dataStore.getClasses());
      setLevels(dataStore.getLevels());
      setSubjects(dataStore.getSubjects());
    };
    window.addEventListener('eduform_users_updated', handleUpdate);
    window.addEventListener('eduform_classes_updated', handleUpdate);
    window.addEventListener('eduform_levels_updated', handleUpdate);
    window.addEventListener('eduform_subjects_updated', handleUpdate);
    return () => {
      window.removeEventListener('eduform_users_updated', handleUpdate);
      window.removeEventListener('eduform_classes_updated', handleUpdate);
      window.removeEventListener('eduform_levels_updated', handleUpdate);
      window.removeEventListener('eduform_subjects_updated', handleUpdate);
    };
  }, []);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('student');
  const [formStatus, setFormStatus] = useState<UserStatus>('active');
  const [formLevelIds, setFormLevelIds] = useState<string[]>([]);
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([]);
  const [formPassword, setFormPassword] = useState('Eduform123!');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [formReactivateDate, setFormReactivateDate] = useState('');
  const [formReactivateTime, setFormReactivateTime] = useState('00:00');
  const [formAutoDeactivateDate, setFormAutoDeactivateDate] = useState('');
  const [formAutoDeactivateTime, setFormAutoDeactivateTime] = useState('00:00');

  // Dedicated Reactivation & Deactivation Schedule Modal State
  const [scheduleTargetUser, setScheduleTargetUser] = useState<UserProfile | null>(null);
  const [schedReactDate, setSchedReactDate] = useState('');
  const [schedReactTime, setSchedReactTime] = useState('00:00');
  const [schedDeactDate, setSchedDeactDate] = useState('');
  const [schedDeactTime, setSchedDeactTime] = useState('00:00');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  // Quick Reset Password State
  const [resetTargetUser, setResetTargetUser] = useState<UserProfile | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('Eduform123!');
  const [showAdminResetPw, setShowAdminResetPw] = useState(false);

  const handleAdminResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!adminNewPassword || adminNewPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    const cleanPw = adminNewPassword.trim();
    const res = dataStore.resetUserPassword(
      resetTargetUser.username,
      cleanPw,
      currentLoggedInUser?.uid || 'admin'
    );
    if (!res.success) {
      toast.error(res.error || 'Failed to reset password.');
      return;
    }
    setUsers(dataStore.getUsers());
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cleanPw);
    }
    toast.success(`Password for @${resetTargetUser.username} reset to "${cleanPw}" (copied to clipboard).`);
    setResetTargetUser(null);
  };

  const getLevelName = (levelId: string) => {
    const fallbackMap: Record<string, string> = {
      'level-basic': 'Basic School',
      'level-jhs': 'Junior High School',
      'level-shs': 'Senor High School',
      'level-jss1': 'Basic School',
      'level-jss2': 'Junior High School',
      'level-ss1': 'Senor High School',
    };
    return levels.find((l) => l.id === levelId)?.name || fallbackMap[levelId] || levelId;
  };

  const getClassName = (id: string) => {
    return classes.find((c) => c.id === id)?.name || id;
  };

  const getSubjectName = (id: string) => {
    return subjects.find((s) => s.id === id)?.name || id;
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.authEmail.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'old_dormant'
          ? isOldOrDormantAccount(u)
          : statusFilter === 'scheduled'
            ? Boolean(getReactivationThreshold(u) || getDeactivationThreshold(u))
            : u.status === statusFilter;
    const matchesClass =
      classFilter === 'all' || (u.classIds && u.classIds.includes(classFilter));
    const matchesLevel =
      levelFilter === 'all' || (u.levelIds && u.levelIds.includes(levelFilter));

    return matchesSearch && matchesRole && matchesStatus && matchesClass && matchesLevel;
  });

  const toggleStatus = (uid: string) => {
    const target = users.find((u) => u.uid === uid);
    if (!target) return;
    if (isDeveloperAccount(target)) {
      toast.error('The developer superuser account is permanently active and cannot be deactivated.');
      return;
    }
    const newStatus: UserStatus = target.status === 'active' ? 'inactive' : 'active';
    const hadExpiredSchedule = newStatus === 'active' && isAutoDeactivationDue(target);
    const existingThreshold = getDeactivationThreshold(target);
    const nextThreshold = hadExpiredSchedule ? null : existingThreshold;
    const updated: UserProfile = {
      ...target,
      status: newStatus,
      deactivationDate: nextThreshold,
      autoDeactivateAt: nextThreshold,
    };
    dataStore.saveUser(updated, currentLoggedInUser?.uid);
    dataStore.addAuditLog({
      actorId: currentLoggedInUser?.uid || 'admin',
      action: 'USER_STATUS_CHANGED',
      targetType: 'user',
      targetId: updated.uid,
      meta: {
        username: updated.username,
        fullName: updated.fullName,
        role: updated.role,
        previousStatus: target.status,
        newStatus,
        deactivationDate: updated.deactivationDate,
        expiredScheduleCleared: hadExpiredSchedule,
      },
    });
    setUsers(dataStore.getUsers());
    if (hadExpiredSchedule) {
      toast.success(`User @${target.username} reactivated (expired auto-deactivation date cleared).`);
    } else {
      toast.success(`User @${target.username} marked as ${newStatus}.`);
    }
  };

  const openAddModal = (defaultRole: UserRole = 'student') => {
    setEditingUser(null);
    setFormFullName('');
    setFormUsername('');
    setFormRole(defaultRole === 'developer' ? 'student' : defaultRole);
    setFormStatus('active');
    setFormLevelIds([levels[0]?.id || 'level-basic']);
    const defaultClasses = classes.filter((c) => c.levelId === (levels[0]?.id || 'level-basic'));
    setFormClassIds(defaultClasses.slice(0, 1).map((c) => c.id));
    // Default curriculum subjects
    setFormSubjectIds(subjects.slice(0, 4).map((s) => s.id));
    setFormPassword('Eduform123!');
    setShowModalPassword(false);
    setFormReactivateDate('');
    setFormReactivateTime('00:00');
    setFormAutoDeactivateDate('');
    setFormAutoDeactivateTime('00:00');
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    if (isDeveloperAccount(u)) {
      if (currentLoggedInUser?.role !== 'developer') {
        toast.error('The developer account is protected and cannot be edited by any other user.');
        return;
      }
    }
    setEditingUser(u);
    setFormFullName(u.fullName);
    setFormUsername(u.username);
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormLevelIds(u.levelIds && u.levelIds.length > 0 ? u.levelIds : [levels[0]?.id || 'level-basic']);
    setFormClassIds(u.classIds || []);
    setFormSubjectIds(u.subjectIds || []);
    setFormPassword(u.password || 'Eduform123!');
    setShowModalPassword(false);
    const reactParts = toDateInputAndTime(getReactivationThreshold(u));
    setFormReactivateDate(reactParts.date);
    setFormReactivateTime(reactParts.time);
    const deactParts = toDateInputAndTime(getDeactivationThreshold(u));
    setFormAutoDeactivateDate(deactParts.date);
    setFormAutoDeactivateTime(deactParts.time);
    setIsModalOpen(true);
  };

  const openScheduleModal = (u: UserProfile) => {
    if (isDeveloperAccount(u)) {
      toast.error('The developer superuser account is permanently active and cannot be scheduled.');
      return;
    }
    setScheduleTargetUser(u);
    const reactParts = toDateInputAndTime(getReactivationThreshold(u));
    setSchedReactDate(reactParts.date);
    setSchedReactTime(reactParts.time);
    const deactParts = toDateInputAndTime(getDeactivationThreshold(u));
    setSchedDeactDate(deactParts.date);
    setSchedDeactTime(deactParts.time);
  };

  const toLocalDateInput = (daysFromNow: number): string => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyDeactivationPreset = (daysFromNow: number) => {
    setFormAutoDeactivateDate(toLocalDateInput(daysFromNow));
    if (!formAutoDeactivateTime) {
      setFormAutoDeactivateTime('00:00');
    }
  };

  const applyReactivationPreset = (daysFromNow: number) => {
    setFormReactivateDate(toLocalDateInput(daysFromNow));
    if (!formReactivateTime) {
      setFormReactivateTime('00:00');
    }
  };

  const handleSaveScheduleModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTargetUser) return;

    const reactivationIso = combineDateAndTimeToIso(schedReactDate, schedReactTime || '00:00');
    const deactivationIso = combineDateAndTimeToIso(schedDeactDate, schedDeactTime || '00:00');

    const reactTs = parseDeactivationTimestamp(reactivationIso);
    const deactTs = parseDeactivationTimestamp(deactivationIso);
    const nowMs = Date.now();

    // Prevent setting a new deactivation date on or before a new reactivation date
    if (reactTs !== null && deactTs !== null && deactTs <= reactTs) {
      const existingExpiredDeact =
        scheduleTargetUser.status === 'inactive' &&
        parseDeactivationTimestamp(getDeactivationThreshold(scheduleTargetUser)) === deactTs &&
        deactTs <= nowMs;
      if (!existingExpiredDeact) {
        toast.error('Auto-deactivation date must be later than the scheduled reactivation date.');
        return;
      }
    }

    setIsSavingSchedule(true);
    try {
      const updated = await updateUserLifecycleDates(
        scheduleTargetUser.uid,
        {
          reactivationDate: reactivationIso,
          deactivationDate: deactivationIso,
        },
        currentLoggedInUser?.uid || 'admin'
      );
      setUsers(dataStore.getUsers());
      setScheduleTargetUser(null);

      if (updated.status === 'active' && scheduleTargetUser.status === 'inactive') {
        toast.success(
          `@${updated.username} reactivated${
            updated.deactivationDate
              ? ` and scheduled to deactivate on ${formatAutoDeactivateDateTime(updated.deactivationDate)}.`
              : '.'
          }`
        );
      } else if (updated.status === 'inactive' && scheduleTargetUser.status === 'active') {
        toast.info(`@${updated.username} deactivated immediately based on schedule.`);
      } else {
        toast.success(`Lifecycle schedule updated for @${updated.username}.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update lifecycle schedule.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      toast.error('Full name is required.');
      return;
    }
    const cleanUsername = formUsername.trim().toLowerCase();
    if (!cleanUsername) {
      toast.error('Username is required.');
      return;
    }

    if (cleanUsername === 'developer' && (!editingUser || editingUser.usernameLower !== 'developer')) {
      toast.error('The username "@developer" is strictly reserved for the system developer account.');
      return;
    }

    if (formRole === 'developer' && currentLoggedInUser?.role !== 'developer') {
      toast.error('The developer role cannot be assigned by other users.');
      return;
    }

    if (editingUser && (editingUser.role === 'developer' || editingUser.uid === 'dev-system-superuser')) {
      if (currentLoggedInUser?.role !== 'developer') {
        toast.error('The developer superuser account cannot be modified by other users.');
        return;
      }
    }

    // Check availability if adding or changing username
    if (!editingUser || editingUser.usernameLower !== cleanUsername) {
      const existing = users.find((u) => u.usernameLower === cleanUsername);
      if (existing) {
        toast.error(`Username "@${cleanUsername}" is already taken.`);
        return;
      }
    }

    const now = new Date().toISOString();
    const finalPassword = formPassword.trim() || 'Eduform123!';
    const isDevTarget = editingUser?.role === 'developer' || formRole === 'developer';

    let computedReactivateAt: string | null = isDevTarget
      ? null
      : combineDateAndTimeToIso(formReactivateDate, formReactivateTime || '00:00');

    let computedAutoDeactivateAt: string | null = isDevTarget
      ? null
      : combineDateAndTimeToIso(formAutoDeactivateDate, formAutoDeactivateTime || '00:00');

    const reactTs = parseDeactivationTimestamp(computedReactivateAt);
    const deactTs = parseDeactivationTimestamp(computedAutoDeactivateAt);
    if (!isDevTarget && reactTs !== null && deactTs !== null && deactTs <= reactTs) {
      const unchangedExpiredDeact =
        Boolean(editingUser) &&
        editingUser?.status === 'inactive' &&
        parseDeactivationTimestamp(getDeactivationThreshold(editingUser)) === deactTs &&
        deactTs <= Date.now();
      if (!unchangedExpiredDeact) {
        toast.error('Auto-deactivation date must be later than the scheduled reactivation date.');
        return;
      }
    }

    let effectiveStatus: UserStatus = isDevTarget ? 'active' : formStatus;
    let clearedExpiredSchedule = false;

    if (!isDevTarget && computedAutoDeactivateAt) {
      const ts = parseDeactivationTimestamp(computedAutoDeactivateAt);
      const isPastDue = ts !== null && ts <= Date.now();
      const unchangedExpiredSchedule =
        Boolean(editingUser) &&
        editingUser?.status === 'inactive' &&
        formStatus === 'active' &&
        parseDeactivationTimestamp(getDeactivationThreshold(editingUser)) === ts;

      if (unchangedExpiredSchedule) {
        computedAutoDeactivateAt = null;
        clearedExpiredSchedule = true;
      } else if (isPastDue && effectiveStatus === 'active' && (reactTs === null || reactTs <= ts)) {
        effectiveStatus = 'inactive';
      }
    }

    try {
      if (editingUser) {
        const updated = await updateUserAsAdmin(
          editingUser.uid,
          {
            fullName: formFullName.trim(),
            username: formUsername.trim(),
            role: editingUser.role === 'developer' ? 'developer' : formRole,
            status: effectiveStatus,
            reactivationDate: computedReactivateAt,
            deactivationDate: computedAutoDeactivateAt,
            levelIds: formLevelIds,
            classIds: formClassIds,
            subjectIds: formSubjectIds,
            password: finalPassword,
          },
          currentLoggedInUser?.uid || 'admin'
        );
        if (clearedExpiredSchedule) {
          toast.success(`Account for @${updated.username} reactivated and expired auto-deactivation date cleared.`);
        } else if (effectiveStatus === 'inactive' && formStatus === 'active' && computedAutoDeactivateAt && !computedReactivateAt) {
          toast.info(`Account for @${updated.username} saved as deactivated because the scheduled date has already passed.`);
        } else {
          toast.success(`Account for ${updated.fullName} (@${updated.username}) updated.`);
        }
      } else {
        const newUser: UserProfile = {
          uid: `user-${Date.now()}`,
          username: formUsername.trim(),
          usernameLower: cleanUsername,
          authEmail: `${cleanUsername}@eduform.local`,
          fullName: formFullName.trim(),
          role: formRole === 'developer' ? 'student' : formRole,
          status: effectiveStatus,
          reactivationDate: computedReactivateAt,
          deactivationDate: computedAutoDeactivateAt,
          autoDeactivateAt: computedAutoDeactivateAt,
          levelIds: formLevelIds,
          classIds: formClassIds,
          subjectIds: formSubjectIds,
          password: finalPassword,
          createdBy: currentLoggedInUser?.fullName || 'Dr. Evelyn Reed (Admin)',
          createdAt: now,
          lastLoginAt: null,
        };
        dataStore.saveUser(newUser, currentLoggedInUser?.uid);
        const classNames = (newUser.classIds || []).map((cid) => getClassName(cid));
        dataStore.addAuditLog({
          actorId: currentLoggedInUser?.uid || 'admin',
          action: 'USER_CREATED',
          targetType: 'user',
          targetId: newUser.uid,
          meta: {
            username: newUser.username,
            fullName: newUser.fullName,
            role: newUser.role,
            status: newUser.status,
            classIds: newUser.classIds,
            classNames,
            levelIds: newUser.levelIds,
            reactivationDate: newUser.reactivationDate ?? null,
            deactivationDate: newUser.deactivationDate ?? null,
          },
        });
        if (newUser.classIds.length > 0) {
          dataStore.addAuditLog({
            actorId: currentLoggedInUser?.uid || 'admin',
            action: 'USER_CLASS_ASSIGNMENTS_UPDATED',
            targetType: 'class_assignment',
            targetId: newUser.uid,
            meta: {
              username: newUser.username,
              fullName: newUser.fullName,
              role: newUser.role,
              classIds: newUser.classIds,
              classNames,
              addedClassIds: newUser.classIds,
              addedClassNames: classNames,
              removedClassIds: [],
              removedClassNames: [],
            },
          });
        }
        if (effectiveStatus === 'inactive' && formStatus === 'active' && computedAutoDeactivateAt) {
          toast.info(`Account @${newUser.username} created as deactivated because the scheduled date has already passed.`);
        } else {
          toast.success(`Account created: @${newUser.username} (${newUser.fullName}).`);
        }
      }

      setUsers(dataStore.getUsers());
      setIsModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user changes.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (isDeveloperAccount(deleteTarget)) {
      toast.error('The developer superuser account is protected and cannot be deleted.');
      setDeleteTarget(null);
      return;
    }
    if (deleteTarget.uid === currentLoggedInUser?.uid) {
      toast.error('You cannot delete your own account while signed in.');
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteUserAsAdmin(deleteTarget.uid, currentLoggedInUser?.uid || 'admin');
      setUsers(dataStore.getUsers());
      setDeleteTarget(null);
      toast.success(`User account @${deleteTarget.username} deleted successfully.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user account.');
      setDeleteTarget(null);
    }
  };

  const toggleLevel = (lid: string) => {
    setFormLevelIds((prev) =>
      prev.includes(lid) ? prev.filter((id) => id !== lid) : [...prev, lid]
    );
  };

  const toggleClass = (cid: string) => {
    setFormClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const toggleSubject = (sid: string) => {
    setFormSubjectIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleAutoAssignSubjectsFromClasses = () => {
    const selectedClasses = classes.filter((c) => formClassIds.includes(c.id));
    const gatheredSubjectIds = Array.from(
      new Set(selectedClasses.flatMap((c) => c.subjectIds || []))
    );
    if (gatheredSubjectIds.length === 0) {
      toast.info('No subjects defined for currently selected classes.');
      return;
    }
    setFormSubjectIds(gatheredSubjectIds);
    toast.success(`Synced ${gatheredSubjectIds.length} subjects from selected classes.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> User Directory & Account Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign Academic Levels, Classes, and Subjects to students and teachers with password verification ({users.length} accounts)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openAddModal('student')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" /> Add Student
          </button>
          <button
            type="button"
            onClick={() => openAddModal('teacher')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4" /> Add Teacher
          </button>
          <button
            type="button"
            onClick={() => openAddModal('admin')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name or @username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-[#0F2A4A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Roles</option>
            <option value="developer">Developers (System Master)</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Academic Levels</option>
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.name}
              </option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated</option>
            <option value="old_dormant">Old / Inactive Accounts</option>
            <option value="scheduled">Scheduled Dates Set</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">User & Account</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Academic Level</th>
                <th className="py-3 px-4">Assigned Classes</th>
                <th className="py-3 px-4">Assigned Subject(s)</th>
                <th className="py-3 px-4">Password Status</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No users match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const userLevels = u.levelIds || [];
                  const userClasses = u.classIds || [];
                  const userSubjects = u.subjectIds || [];

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                              u.role === 'developer'
                                ? 'bg-gradient-to-tr from-violet-700 to-indigo-600 ring-2 ring-violet-400/40'
                                : u.role === 'admin'
                                ? 'bg-[#0F2A4A]'
                                : u.role === 'teacher'
                                ? 'bg-purple-700'
                                : 'bg-emerald-700'
                            }`}
                          >
                            {u.role === 'developer' ? <Code2 className="w-4 h-4" /> : u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 leading-tight">{u.fullName}</p>
                              {u.role === 'developer' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-800 border border-violet-200">
                                  Superuser
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                            {u.role !== 'developer' && (
                              <p
                                className={`text-[10px] mt-0.5 tabular-nums ${
                                  isOldOrDormantAccount(u) ? 'text-amber-700 font-medium' : 'text-slate-400'
                                }`}
                              >
                                {u.lastLoginAt
                                  ? `Last active: ${new Date(u.lastLoginAt).toLocaleDateString()}`
                                  : `Created: ${new Date(u.createdAt).toLocaleDateString()} · No logins`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'developer'
                              ? 'bg-violet-100 text-violet-800 border border-violet-200'
                              : u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'teacher'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role === 'developer' && <Code2 className="w-3 h-3 text-violet-700" />}
                          {u.role === 'admin' && <Shield className="w-3 h-3" />}
                          {u.role === 'teacher' && <BookOpen className="w-3 h-3" />}
                          {u.role === 'student' && <GraduationCap className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>

                      {/* Academic Level */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {userLevels.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          ) : (
                            userLevels.map((lid) => (
                              <span
                                key={lid}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                              >
                                {getLevelName(lid)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Assigned Classes */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {userClasses.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">None</span>
                          ) : (
                            userClasses.map((cid) => (
                              <span
                                key={cid}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-100"
                              >
                                {getClassName(cid)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Assigned Subjects */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {userSubjects.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">None</span>
                          ) : (
                            userSubjects.map((sid) => (
                              <span
                                key={sid}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100"
                              >
                                {getSubjectName(sid)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Password Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          <span>Verified</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'developer'
                                ? 'bg-violet-100 text-violet-800 border border-violet-200'
                                : u.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {u.role === 'developer' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-violet-600" /> Permanent Active
                              </>
                            ) : u.status === 'active' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" /> Deactivated
                              </>
                            )}
                          </span>
                          {u.role !== 'developer' && getReactivationThreshold(u) && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 tabular-nums"
                              title={`Scheduled automatic reactivation: ${formatAutoDeactivateDateTime(getReactivationThreshold(u))}`}
                            >
                              <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                              <span>
                                Reactivates: {formatAutoDeactivateDateTime(getReactivationThreshold(u))}
                              </span>
                            </span>
                          )}
                          {u.role !== 'developer' && getDeactivationThreshold(u) && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium tabular-nums ${
                                u.status === 'active' ? 'text-amber-700' : 'text-slate-500'
                              }`}
                              title={`Scheduled auto-deactivation: ${formatAutoDeactivateDateTime(getDeactivationThreshold(u))}`}
                            >
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span>
                                {u.status === 'active' ? 'Auto-off: ' : 'Expired: '}
                                {formatAutoDeactivateDateTime(getDeactivationThreshold(u))}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {u.role === 'developer' || u.uid === 'dev-system-superuser' ? (
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200 shadow-2xs select-none"
                              title="This developer master account is protected and cannot be edited or removed by other users."
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-violet-600" />
                              <span>Protected Master</span>
                            </span>
                            {currentLoggedInUser?.role === 'developer' && (
                              <button
                                type="button"
                                onClick={() => setIsDeveloperPasswordModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition-colors cursor-pointer"
                                title="Change Master Developer Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Change Password</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleStatus(u.uid)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors border cursor-pointer ${
                                u.status === 'active'
                                  ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openScheduleModal(u)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                                isOldOrDormantAccount(u)
                                  ? 'border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100/80'
                                  : 'border-slate-200 text-slate-600 hover:text-[#0F2A4A] hover:bg-slate-100'
                              }`}
                              title="Set automatic reactivation and deactivation dates"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Dates</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetUser(u);
                                setAdminNewPassword('Eduform123!');
                                setShowAdminResetPw(false);
                              }}
                              className="p-1.5 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Reset password for this user"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 hover:text-[#0F2A4A] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                              title="Edit user account, assignments, schedule, or password"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              disabled={u.uid === currentLoggedInUser?.uid}
                              onClick={() => setDeleteTarget(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                                u.uid === currentLoggedInUser?.uid
                                  ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed'
                                  : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer'
                              }`}
                              title={
                                u.uid === currentLoggedInUser?.uid
                                  ? 'You cannot delete your currently signed-in account'
                                  : 'Delete user account'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#0F2A4A]">
                  {editingUser ? `Edit Account: @${editingUser.username}` : `Create New ${formRole === 'student' ? 'Student' : formRole === 'teacher' ? 'Teacher' : 'User'} Account`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure Academic Level, Assigned Classes, Subject curriculum, and sign-in credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 pr-4">
                {/* Full Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel Adeyemi"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs">@</span>
                      <input
                        type="text"
                        required
                        placeholder="samuel.adeyemi"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Role & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Account Role
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    >
                      <option value="student">Student Account</option>
                      <option value="teacher">Teacher / Faculty Account</option>
                      <option value="admin">Administrator Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Account Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    >
                      <option value="active">Active (Access Allowed)</option>
                      <option value="inactive">Deactivated (Access Blocked)</option>
                    </select>
                  </div>
                </div>

                {/* Automatic Reactivation & Deactivation Schedule (Non-Developer Accounts) */}
                {formRole !== 'developer' && editingUser?.role !== 'developer' && (
                  <div className="space-y-3">
                    {/* Reactivation Date (Optional) */}
                    <div className="p-3.5 bg-emerald-50/55 rounded-xl border border-emerald-200/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold uppercase text-[#0F2A4A] flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                          Reactivation Date (Optional)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => applyReactivationPreset(0)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => applyReactivationPreset(7)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                          >
                            +7d
                          </button>
                          <button
                            type="button"
                            onClick={() => applyReactivationPreset(30)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                          >
                            +30d
                          </button>
                          {formReactivateDate && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormReactivateDate('');
                                setFormReactivateTime('00:00');
                              }}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <span className="block text-[11px] font-medium text-slate-600 mb-1">
                            Reactivation Date
                          </span>
                          <input
                            type="date"
                            value={formReactivateDate}
                            onChange={(e) => setFormReactivateDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                          />
                        </div>
                        <div>
                          <span className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> Time (Local)
                          </span>
                          <input
                            type="time"
                            value={formReactivateTime}
                            disabled={!formReactivateDate}
                            onChange={(e) => setFormReactivateTime(e.target.value || '00:00')}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:border-[#0F2A4A]"
                          />
                        </div>
                      </div>

                      {(() => {
                        const reactIso = combineDateAndTimeToIso(
                          formReactivateDate,
                          formReactivateTime || '00:00'
                        );
                        if (!reactIso) {
                          return (
                            <p className="text-[11px] text-slate-500">
                              Set a future date to automatically re-enable an old or deactivated account.
                            </p>
                          );
                        }
                        const ts = parseDeactivationTimestamp(reactIso);
                        const isPast = ts !== null && ts <= Date.now();
                        const formatted = formatAutoDeactivateDateTime(reactIso);
                        if (isPast) {
                          return (
                            <p className="text-[11px] text-emerald-700 font-medium">
                              Reactivation time ({formatted}) is already reached — saving will restore access immediately (unless overridden by a newer deactivation date).
                            </p>
                          );
                        }
                        return (
                          <p className="text-[11px] text-emerald-800 font-medium">
                            Deactivated account access will automatically restore on <strong>{formatted}</strong>.
                          </p>
                        );
                      })()}
                    </div>

                    {/* Auto-Deactivation Date (Optional) */}
                    <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold uppercase text-[#0F2A4A] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          Auto-Deactivation Date (Optional)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => applyDeactivationPreset(7)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/70 transition-colors cursor-pointer"
                          >
                            +7d
                          </button>
                          <button
                            type="button"
                            onClick={() => applyDeactivationPreset(30)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/70 transition-colors cursor-pointer"
                          >
                            +30d
                          </button>
                          <button
                            type="button"
                            onClick={() => applyDeactivationPreset(90)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/70 transition-colors cursor-pointer"
                          >
                            +90d
                          </button>
                          {formAutoDeactivateDate && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormAutoDeactivateDate('');
                                setFormAutoDeactivateTime('00:00');
                              }}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <span className="block text-[11px] font-medium text-slate-600 mb-1">
                            Deactivation Date
                          </span>
                          <input
                            type="date"
                            value={formAutoDeactivateDate}
                            onChange={(e) => setFormAutoDeactivateDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                          />
                        </div>
                        <div>
                          <span className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> Time (Local)
                          </span>
                          <input
                            type="time"
                            value={formAutoDeactivateTime}
                            disabled={!formAutoDeactivateDate}
                            onChange={(e) => setFormAutoDeactivateTime(e.target.value || '00:00')}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:border-[#0F2A4A]"
                          />
                        </div>
                      </div>

                      {(() => {
                        const previewIso = combineDateAndTimeToIso(
                          formAutoDeactivateDate,
                          formAutoDeactivateTime || '00:00'
                        );
                        if (!previewIso) {
                          return (
                            <p className="text-[11px] text-slate-500">
                              Leave blank to keep the account active indefinitely until manually deactivated.
                            </p>
                          );
                        }
                        const ts = parseDeactivationTimestamp(previewIso);
                        const isPast = ts !== null && ts <= Date.now();
                        const formatted = formatAutoDeactivateDateTime(previewIso);
                        if (isPast && editingUser?.status === 'inactive' && formStatus === 'active' && parseDeactivationTimestamp(getDeactivationThreshold(editingUser)) === ts) {
                          return (
                            <p className="text-[11px] text-emerald-700 font-medium">
                              Previous deactivation date ({formatted}) has passed — saving with Active status will clear it automatically.
                            </p>
                          );
                        }
                        if (isPast) {
                          return (
                            <p className="text-[11px] text-rose-700 font-medium">
                              Selected date/time ({formatted}) has already passed — saving will deactivate this account immediately.
                            </p>
                          );
                        }
                        return (
                          <p className="text-[11px] text-amber-800 font-medium">
                            Account access will automatically lock on <strong>{formatted}</strong> (12:00 AM if no time chosen).
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Password Setting & Verification */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-[#0F2A4A] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                      Sign-In Password Verification
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Default: Eduform123!
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showModalPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter account sign-in password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Users must provide this exact password during login to successfully verify their credentials.
                  </p>
                </div>

                {/* 1. Academic Level Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase text-slate-700 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      Assign Academic Level ({formLevelIds.length} selected)
                    </label>
                    <span className="text-[11px] text-slate-400">Select one or more tiers</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {levels.map((lvl) => {
                      const isSelected = formLevelIds.includes(lvl.id);
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => toggleLevel(lvl.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="text-xs block font-bold">{lvl.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Tier {lvl.order}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Assigned Classes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Assigned Class Stream(s) ({formClassIds.length} assigned)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Cohort enrollments for lessons & tests
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50 max-h-36 overflow-y-auto">
                    {classes.map((c) => {
                      const isChecked = formClassIds.includes(c.id);
                      const classLevelName = getLevelName(c.levelId);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer border transition-colors ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 text-blue-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleClass(c.id)}
                              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                            />
                            <span className="truncate">{c.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                            {classLevelName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Assigned Subject(s) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      Assigned Curriculum Subject(s) ({formSubjectIds.length} assigned)
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoAssignSubjectsFromClasses}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Sync from Selected Classes
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50 max-h-36 overflow-y-auto">
                    {subjects.map((s) => {
                      const isChecked = formSubjectIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer border transition-colors ${
                            isChecked
                              ? 'bg-purple-50 border-purple-300 text-purple-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSubject(s.id)}
                              className="rounded text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span className="truncate">{s.name}</span>
                          </div>
                          <span className="font-mono text-[10px] text-purple-700 shrink-0 ml-1">
                            {s.code}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Fixed Modal Footer */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 shrink-0">
                {editingUser &&
                !isDeveloperAccount(editingUser) &&
                editingUser.uid !== currentLoggedInUser?.uid ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setDeleteTarget(editingUser);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Account
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-xs transition-colors cursor-pointer"
                  >
                    {editingUser ? 'Save User Changes' : 'Create User Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Delete User Account?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete account <strong>@{deleteTarget.username}</strong> ({deleteTarget.fullName})? All access credentials and cohort enrollments will be revoked.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Quick Reset Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F2A4A]">
              Reset Password for @{resetTargetUser.username}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Account: <strong className="text-slate-800">{resetTargetUser.fullName}</strong> ({resetTargetUser.role})
            </p>

            <form onSubmit={handleAdminResetPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminResetPw ? 'text' : 'password'}
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 pr-10 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-[#0F2A4A] focus:ring-1 focus:ring-slate-300"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminResetPw(!showAdminResetPw)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showAdminResetPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => setAdminNewPassword(`EduForm${Math.floor(1000 + Math.random() * 9000)}!`)}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                >
                  Generate Random
                </button>
                <button
                  type="button"
                  onClick={() => setAdminNewPassword('Eduform123!')}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Reset to Default
                </button>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-xs cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update & Copy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Account Reactivation & Deactivation Schedule Modal */}
      {scheduleTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F2A4A]">
                    Schedule Reactivation &amp; Deactivation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {scheduleTargetUser.fullName} (<span className="font-mono">@{scheduleTargetUser.username}</span>) · Currently{' '}
                    <span
                      className={`font-semibold ${
                        scheduleTargetUser.status === 'active' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {scheduleTargetUser.status === 'active' ? 'Active' : 'Deactivated'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleTargetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduleModal} className="mt-4 space-y-4">
              {isOldOrDormantAccount(scheduleTargetUser) && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                  <span>
                    {scheduleTargetUser.lastLoginAt
                      ? `Last signed in on ${new Date(scheduleTargetUser.lastLoginAt).toLocaleDateString()}.`
                      : `Created on ${new Date(scheduleTargetUser.createdAt).toLocaleDateString()} with no recorded sign-ins.`}
                  </span>
                  <span className="font-semibold text-amber-700 shrink-0">Old / Inactive Account</span>
                </div>
              )}

              {/* Reactivation Date Section */}
              <div className="p-3.5 bg-emerald-50/55 rounded-xl border border-emerald-200/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase text-[#0F2A4A] flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                    Reactivation Date
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSchedReactDate(toLocalDateInput(0));
                        setSchedReactTime('00:00');
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSchedReactDate(toLocalDateInput(1));
                        if (!schedReactTime) setSchedReactTime('00:00');
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 cursor-pointer"
                    >
                      +1d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSchedReactDate(toLocalDateInput(7));
                        if (!schedReactTime) setSchedReactTime('00:00');
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 cursor-pointer"
                    >
                      +7d
                    </button>
                    {schedReactDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setSchedReactDate('');
                          setSchedReactTime('00:00');
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-600 mb-1">Date</span>
                    <input
                      type="date"
                      value={schedReactDate}
                      onChange={(e) => setSchedReactDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Time (Local)
                    </span>
                    <input
                      type="time"
                      value={schedReactTime}
                      disabled={!schedReactDate}
                      onChange={(e) => setSchedReactTime(e.target.value || '00:00')}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>
                </div>
              </div>

              {/* Deactivation Date Section */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase text-[#0F2A4A] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    Auto-Deactivation Date
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSchedDeactDate(toLocalDateInput(7));
                        if (!schedDeactTime) setSchedDeactTime('00:00');
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/70 cursor-pointer"
                    >
                      +7d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSchedDeactDate(toLocalDateInput(30));
                        if (!schedDeactTime) setSchedDeactTime('00:00');
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/70 cursor-pointer"
                    >
                      +30d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSchedDeactDate(toLocalDateInput(90));
                        if (!schedDeactTime) setSchedDeactTime('00:00');
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/70 cursor-pointer"
                    >
                      +90d
                    </button>
                    {schedDeactDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setSchedDeactDate('');
                          setSchedDeactTime('00:00');
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-600 mb-1">Date</span>
                    <input
                      type="date"
                      value={schedDeactDate}
                      onChange={(e) => setSchedDeactDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Time (Local)
                    </span>
                    <input
                      type="time"
                      value={schedDeactTime}
                      disabled={!schedDeactDate}
                      onChange={(e) => setSchedDeactTime(e.target.value || '00:00')}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>
                </div>
              </div>

              {/* Chronological Preview */}
              {(() => {
                const reactIso = combineDateAndTimeToIso(schedReactDate, schedReactTime || '00:00');
                const deactIso = combineDateAndTimeToIso(schedDeactDate, schedDeactTime || '00:00');
                const reactTs = parseDeactivationTimestamp(reactIso);
                const deactTs = parseDeactivationTimestamp(deactIso);
                const invalidOrder =
                  reactTs !== null &&
                  deactTs !== null &&
                  deactTs <= reactTs &&
                  !(
                    scheduleTargetUser.status === 'inactive' &&
                    parseDeactivationTimestamp(getDeactivationThreshold(scheduleTargetUser)) === deactTs &&
                    deactTs <= Date.now()
                  );

                if (invalidOrder) {
                  return (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                      Auto-deactivation date must be later than the scheduled reactivation date.
                    </div>
                  );
                }

                const preview = evaluateAccountLifecycle({
                  ...scheduleTargetUser,
                  reactivationDate: reactIso,
                  deactivationDate: deactIso,
                  autoDeactivateAt: deactIso,
                });

                const reactText = reactIso ? formatAutoDeactivateDateTime(reactIso) : null;
                const deactText = deactIso ? formatAutoDeactivateDateTime(deactIso) : null;

                return (
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-slate-700 space-y-1">
                    <p className="font-semibold text-[#0F2A4A]">Schedule Outcome Preview</p>
                    <p>
                      {preview.event === 'activated'
                        ? `Account will reactivate immediately${deactText ? ` and auto-deactivate on ${deactText}` : ''}.`
                        : preview.event === 'deactivated'
                          ? `Account will deactivate immediately${reactText ? ` and auto-reactivate on ${reactText}` : ''}.`
                          : reactText && deactText
                            ? `Reactivates on ${reactText} and automatically deactivates on ${deactText}.`
                            : reactText
                              ? `Scheduled to automatically reactivate on ${reactText}.`
                              : deactText
                                ? `Scheduled to automatically deactivate on ${deactText}.`
                                : 'No automatic dates scheduled — account remains manually managed.'}
                    </p>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleTargetUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] disabled:opacity-60 text-white shadow-xs cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{isSavingSchedule ? 'Saving...' : 'Save Dates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer Change Password Modal */}
      <ChangePasswordModal
        isOpen={isDeveloperPasswordModalOpen}
        onClose={() => {
          setIsDeveloperPasswordModalOpen(false);
          setUsers(dataStore.getUsers());
        }}
      />
    </div>
  );
};
