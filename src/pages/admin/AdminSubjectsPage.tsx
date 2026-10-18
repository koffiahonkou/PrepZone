import React, { useState } from 'react';
import { GraduationCap, BookOpen, Layers, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { Subject } from '@/src/types';
import { toast } from 'sonner';

export const AdminSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(() => dataStore.getSubjects());
  const classes = dataStore.getClasses();
  const quizzes = dataStore.getQuizzes();
  const lessons = dataStore.getLessons();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const getUsage = (subjId: string) => {
    const classCount = classes.filter((c) => c.subjectIds?.includes(subjId)).length;
    const quizCount = quizzes.filter((q) => q.subjectId === subjId).length;
    const lessonCount = lessons.filter((l) => l.subjectId === subjId).length;
    return { classCount, quizCount, lessonCount };
  };

  const openAddModal = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setIsModalOpen(true);
  };

  const openEditModal = (subj: Subject) => {
    setEditingSubject(subj);
    setFormName(subj.name);
    setFormCode(subj.code);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast.error('Both subject title and code are required.');
      return;
    }

    if (editingSubject) {
      const updated: Subject = {
        ...editingSubject,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
      };
      dataStore.saveSubject(updated);
      toast.success(`Subject "${updated.name}" updated successfully.`);
    } else {
      const newSubj: Subject = {
        id: `subj-${formCode.trim().toLowerCase().slice(0, 4)}-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
      };
      dataStore.saveSubject(newSubj);
      toast.success(`Subject "${newSubj.name}" created successfully.`);
    }

    setSubjects(dataStore.getSubjects());
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const usage = getUsage(deleteTarget.id);
    dataStore.deleteSubject(deleteTarget.id);
    setSubjects(dataStore.getSubjects());
    setDeleteTarget(null);

    if (usage.classCount > 0 || usage.quizCount > 0 || usage.lessonCount > 0) {
      toast.warning(
        `Subject deleted. Note: was referenced in ${usage.classCount} classes, ${usage.lessonCount} lessons, and ${usage.quizCount} quizzes.`
      );
    } else {
      toast.success('Subject removed successfully.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" /> Academic Subjects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized curriculum subject codes and course definitions ({subjects.length} registered subjects)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add New Subject
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub) => {
          const { classCount, quizCount, lessonCount } = getUsage(sub.id);
          return (
            <div
              key={sub.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {sub.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(sub)}
                      className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit subject"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(sub)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                      title="Remove subject"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-bold text-[#0F2A4A] mt-3">{sub.name}</h3>
                <span className="text-[11px] text-slate-400 font-mono">ID: {sub.id}</span>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="block font-bold text-slate-800">{classCount}</span>
                  <span className="text-[10px] text-slate-400">Classes</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800">{lessonCount}</span>
                  <span className="text-[10px] text-slate-400">Lessons</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800">{quizCount}</span>
                  <span className="text-[10px] text-slate-400">Quizzes</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0F2A4A]">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
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
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biology or World Geography"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BIO101 or GEO201"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase focus:outline-hidden focus:border-[#0F2A4A]"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {editingSubject ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setDeleteTarget(editingSubject);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Subject
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
                    {editingSubject ? 'Save Changes' : 'Create Subject'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Delete Subject?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deleteTarget.name} ({deleteTarget.code})</strong>?
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
    </div>
  );
};
