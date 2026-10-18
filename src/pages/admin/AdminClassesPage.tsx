import React, { useState } from 'react';
import {
  Layers,
  BookOpen,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { AcademicClass, AcademicLevel } from '@/src/types';
import { toast } from 'sonner';

export const AdminClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<AcademicClass[]>(() => dataStore.getClasses());
  const [levels, setLevels] = useState<AcademicLevel[]>(() => dataStore.getLevels());
  const subjects = dataStore.getSubjects();
  const users = dataStore.getUsers();

  const [activeTab, setActiveTab] = useState<'classes' | 'levels'>('classes');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AcademicClass | null>(null);
  const [formName, setFormName] = useState('');
  const [formLevelId, setFormLevelId] = useState(levels[0]?.id || '');
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([]);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<AcademicClass | null>(null);

  // Level Modal State
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AcademicLevel | null>(null);
  const [formLevelName, setFormLevelName] = useState('');
  const [formLevelOrder, setFormLevelOrder] = useState<number>(1);
  const [deleteLevelTarget, setDeleteLevelTarget] = useState<AcademicLevel | null>(null);

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

  const getClassesInLevelCount = (levelId: string) => {
    return classes.filter(
      (c) =>
        c.levelId === levelId ||
        (levelId === 'level-basic' && c.levelId === 'level-jss1') ||
        (levelId === 'level-jhs' && c.levelId === 'level-jss2') ||
        (levelId === 'level-shs' && c.levelId === 'level-ss1')
    ).length;
  };

  const getStudentCount = (classId: string) => {
    return users.filter((u) => u.role === 'student' && u.classIds.includes(classId)).length;
  };

  const openAddModal = () => {
    setEditingClass(null);
    setFormName('');
    setFormLevelId(levels[0]?.id || '');
    setFormSubjectIds(subjects.slice(0, 4).map((s) => s.id));
    setIsModalOpen(true);
  };

  const openEditModal = (cls: AcademicClass) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormLevelId(cls.levelId);
    setFormSubjectIds(cls.subjectIds || []);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Class name is required.');
      return;
    }

    if (editingClass) {
      const updated: AcademicClass = {
        ...editingClass,
        name: formName.trim(),
        levelId: formLevelId,
        subjectIds: formSubjectIds,
      };
      dataStore.saveClass(updated);
      toast.success(`Class "${updated.name}" updated successfully.`);
    } else {
      const newClass: AcademicClass = {
        id: `class-${Date.now()}`,
        name: formName.trim(),
        levelId: formLevelId,
        subjectIds: formSubjectIds,
        createdAt: new Date().toISOString(),
      };
      dataStore.saveClass(newClass);
      toast.success(`Class "${newClass.name}" created successfully.`);
    }

    setClasses(dataStore.getClasses());
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const studentCount = getStudentCount(deleteTarget.id);
    dataStore.deleteClass(deleteTarget.id);
    setClasses(dataStore.getClasses());
    setDeleteTarget(null);
    if (studentCount > 0) {
      toast.warning(`Class deleted. Note: ${studentCount} students were associated with this cohort.`);
    } else {
      toast.success('Class deleted successfully.');
    }
  };

  const toggleSubject = (subjId: string) => {
    setFormSubjectIds((prev) =>
      prev.includes(subjId) ? prev.filter((id) => id !== subjId) : [...prev, subjId]
    );
  };

  // Level Management Handlers
  const openAddLevelModal = () => {
    setEditingLevel(null);
    setFormLevelName('');
    setFormLevelOrder(levels.length + 1);
    setIsLevelModalOpen(true);
  };

  const openEditLevelModal = (lvl: AcademicLevel) => {
    setEditingLevel(lvl);
    setFormLevelName(lvl.name);
    setFormLevelOrder(lvl.order);
    setIsLevelModalOpen(true);
  };

  const handleSaveLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLevelName.trim()) {
      toast.error('Academic level name is required.');
      return;
    }

    if (editingLevel) {
      const updated: AcademicLevel = {
        ...editingLevel,
        name: formLevelName.trim(),
        order: Number(formLevelOrder) || 1,
      };
      dataStore.saveLevel(updated);
      toast.success(`Academic level "${updated.name}" updated successfully.`);
    } else {
      const newLevel: AcademicLevel = {
        id: `level-${formLevelName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        name: formLevelName.trim(),
        order: Number(formLevelOrder) || levels.length + 1,
      };
      dataStore.saveLevel(newLevel);
      toast.success(`Academic level "${newLevel.name}" created successfully.`);
    }

    setLevels(dataStore.getLevels());
    setIsLevelModalOpen(false);
  };

  const handleDeleteLevel = () => {
    if (!deleteLevelTarget) return;
    const associatedClasses = getClassesInLevelCount(deleteLevelTarget.id);
    dataStore.deleteLevel(deleteLevelTarget.id);
    setLevels(dataStore.getLevels());
    setDeleteLevelTarget(null);
    if (associatedClasses > 0) {
      toast.warning(
        `Academic level deleted. Note: ${associatedClasses} classes were configured under this tier.`
      );
    } else {
      toast.success('Academic level deleted successfully.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" /> Classes & Academic Streams
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize student cohorts, configure academic levels (Basic School, Junior High School, Senor High School), and assign curriculum subjects
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'classes' ? (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add New Class
            </button>
          ) : (
            <button
              type="button"
              onClick={openAddLevelModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Academic Level
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'classes'
              ? 'bg-[#0F2A4A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Classes & Streams ({classes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'levels'
              ? 'bg-[#0F2A4A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
          <span>Academic Levels ({levels.length})</span>
        </button>
      </div>

      {/* TAB 1: Classes Grid */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => {
            const studentCount = getStudentCount(cls.id);
            const levelName = getLevelName(cls.levelId);
            const classSubjects = subjects.filter((s) => cls.subjectIds?.includes(s.id));

            return (
              <div
                key={cls.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-blue-600" />
                      {levelName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {studentCount} Enrolled
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(cls)}
                        className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit class"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cls)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        title="Remove class"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#0F2A4A] mt-3">{cls.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {cls.id}</p>

                  <div className="mt-4">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Assigned Subjects ({classSubjects.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {classSubjects.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700"
                        >
                          {s.name} ({s.code})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Created {new Date(cls.createdAt).toLocaleDateString()}</span>
                  <span className="text-emerald-600 font-semibold">Active Stream</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Academic Levels Grid */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Academic Tiers Hierarchy
              </p>
              <p className="mt-0.5 text-emerald-800">
                Institutional Academic Levels: <strong>Basic School</strong>, <strong>Junior High School</strong>, and <strong>Senor High School</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddLevelModal}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shrink-0"
            >
              + Add Academic Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {levels
              .sort((a, b) => a.order - b.order)
              .map((lvl) => {
                const count = getClassesInLevelCount(lvl.id);
                return (
                  <div
                    key={lvl.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Tier {lvl.order}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditLevelModal(lvl)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit Level"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteLevelTarget(lvl)}
                            className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Level"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-[#0F2A4A] mt-3">{lvl.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {lvl.id}</p>

                      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{count}</span> classes enrolled in this academic tier.
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Order Sequence: #{lvl.order}</span>
                      <span className="text-emerald-700 font-semibold">Active Tier</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0F2A4A]">
                {editingClass ? 'Edit Class Stream' : 'Add New Class Stream'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JSS 2 Diamond or Grade 10 Science"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Academic Level
                </label>
                <select
                  value={formLevelId}
                  onChange={(e) => setFormLevelId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                >
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name} (Tier {lvl.order})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-2">
                  Assigned Curriculum Subjects
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                  {subjects.map((subj) => {
                    const isChecked = formSubjectIds.includes(subj.id);
                    return (
                      <label
                        key={subj.id}
                        className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubject(subj.id)}
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                        <span className="truncate">{subj.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {editingClass ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setDeleteTarget(editingClass);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Class
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-xs cursor-pointer"
                  >
                    {editingClass ? 'Save Changes' : 'Create Class'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Level Add / Edit Modal */}
      {isLevelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0F2A4A]">
                {editingLevel ? 'Edit Academic Level' : 'Add Academic Level'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLevelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Academic Level Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basic School, Junior High School, Senor High School"
                  value={formLevelName}
                  onChange={(e) => setFormLevelName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Tier / Order Sequence
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={formLevelOrder}
                  onChange={(e) => setFormLevelOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                />
                <p className="text-[11px] text-slate-400 mt-1">1 = Basic School, 2 = Junior High School, 3 = Senor High School</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLevelModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  {editingLevel ? 'Save Changes' : 'Create Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Delete Class Stream?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong>?
              {getStudentCount(deleteTarget.id) > 0 && (
                <span className="block mt-2 font-bold text-amber-600">
                  Warning: {getStudentCount(deleteTarget.id)} active students are enrolled in this class.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Delete Confirmation Dialog */}
      {deleteLevelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Delete Academic Level?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deleteLevelTarget.name}</strong>?
              {getClassesInLevelCount(deleteLevelTarget.id) > 0 && (
                <span className="block mt-2 font-bold text-amber-600">
                  Warning: {getClassesInLevelCount(deleteLevelTarget.id)} classes are currently assigned to this tier.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteLevelTarget(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLevel}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
