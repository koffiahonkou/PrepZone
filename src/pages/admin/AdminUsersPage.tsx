import React, { useState } from 'react';
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
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { UserProfile, UserRole, UserStatus } from '@/src/types';
import { toast } from 'sonner';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(() => dataStore.getUsers());
  const classes = dataStore.getClasses();
  const levels = dataStore.getLevels();
  const subjects = dataStore.getSubjects();

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

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

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
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesClass =
      classFilter === 'all' || (u.classIds && u.classIds.includes(classFilter));
    const matchesLevel =
      levelFilter === 'all' || (u.levelIds && u.levelIds.includes(levelFilter));

    return matchesSearch && matchesRole && matchesStatus && matchesClass && matchesLevel;
  });

  const toggleStatus = (uid: string) => {
    const target = users.find((u) => u.uid === uid);
    if (!target) return;
    const newStatus: UserStatus = target.status === 'active' ? 'inactive' : 'active';
    const updated = { ...target, status: newStatus };
    dataStore.saveUser(updated);
    setUsers(dataStore.getUsers());
    toast.success(`User @${target.username} marked as ${newStatus}.`);
  };

  const openAddModal = (defaultRole: UserRole = 'student') => {
    setEditingUser(null);
    setFormFullName('');
    setFormUsername('');
    setFormRole(defaultRole);
    setFormStatus('active');
    setFormLevelIds([levels[0]?.id || 'level-basic']);
    const defaultClasses = classes.filter((c) => c.levelId === (levels[0]?.id || 'level-basic'));
    setFormClassIds(defaultClasses.slice(0, 1).map((c) => c.id));
    // Default curriculum subjects
    setFormSubjectIds(subjects.slice(0, 4).map((s) => s.id));
    setFormPassword('Eduform123!');
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
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
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
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

    if (editingUser) {
      const updated: UserProfile = {
        ...editingUser,
        fullName: formFullName.trim(),
        username: formUsername.trim(),
        usernameLower: cleanUsername,
        authEmail: `${cleanUsername}@eduform.local`,
        role: formRole,
        status: formStatus,
        levelIds: formLevelIds,
        classIds: formClassIds,
        subjectIds: formSubjectIds,
        password: finalPassword,
      };
      dataStore.saveUser(updated);
      toast.success(`Account for ${updated.fullName} (@${updated.username}) updated.`);
    } else {
      const newUser: UserProfile = {
        uid: `user-${Date.now()}`,
        username: formUsername.trim(),
        usernameLower: cleanUsername,
        authEmail: `${cleanUsername}@eduform.local`,
        fullName: formFullName.trim(),
        role: formRole,
        status: formStatus,
        levelIds: formLevelIds,
        classIds: formClassIds,
        subjectIds: formSubjectIds,
        password: finalPassword,
        createdBy: 'Dr. Evelyn Reed (Admin)',
        createdAt: now,
        lastLoginAt: null,
      };
      dataStore.saveUser(newUser);
      toast.success(`Account created: @${newUser.username} (${newUser.fullName}).`);
    }

    setUsers(dataStore.getUsers());
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    dataStore.deleteUser(deleteTarget.uid);
    setUsers(dataStore.getUsers());
    setDeleteTarget(null);
    toast.success('User account removed successfully.');
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
                              u.role === 'admin'
                                ? 'bg-[#0F2A4A]'
                                : u.role === 'teacher'
                                ? 'bg-purple-700'
                                : 'bg-emerald-700'
                            }`}
                          >
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{u.fullName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'teacher'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
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
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" /> Deactivated
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
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
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit user assignments & password"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                            title="Remove user account"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Remove</span>
                          </button>
                        </div>
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
                {editingUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setDeleteTarget(editingUser);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Account
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
            <h3 className="text-lg font-bold text-[#0F2A4A]">Remove Account?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove account <strong>@{deleteTarget.username}</strong> ({deleteTarget.fullName})? All access credentials and cohort enrollments will be revoked.
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
                Yes, Remove Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
