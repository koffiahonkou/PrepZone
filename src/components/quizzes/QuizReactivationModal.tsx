import React, { useState } from 'react';
import {
  Power,
  RotateCcw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Tag,
  ArrowRight,
  ShieldCheck,
  History,
  Users,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Quiz, AcademicClass } from '@/src/types';
import { getQuizAvailability, formatQuizDateTime } from '@/src/utils/quizAvailability';
import { toast } from 'sonner';

interface QuizReactivationModalProps {
  quiz: Quiz;
  classes: AcademicClass[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuiz: (updatedQuiz: Quiz) => void;
  currentUserFullName?: string;
}

export const QuizReactivationModal: React.FC<QuizReactivationModalProps> = ({
  quiz,
  classes,
  isOpen,
  onClose,
  onUpdateQuiz,
  currentUserFullName = 'Instructor',
}) => {
  if (!isOpen) return null;

  const currentAvailability = getQuizAvailability(quiz);

  // Form State
  const [targetType, setTargetType] = useState<'same_batch' | 'new_batch'>('same_batch');
  const [batchLabel, setBatchLabel] = useState(
    quiz.batchLabel || quiz.settings.batchLabel || 'Batch 2026'
  );
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(quiz.classIds || []);
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const end = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 1 week default
    return end.toISOString().slice(0, 16);
  });
  const [autoDisappearOnExpiry, setAutoDisappearOnExpiry] = useState<boolean>(
    quiz.settings.autoDisappearOnExpiry ?? true
  );
  const [notes, setNotes] = useState<string>('');

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  // Immediate Toggle: Activate or Deactivate
  const handleImmediateToggle = (desiredStatus: 'published' | 'closed') => {
    const isActivating = desiredStatus === 'published';
    const updated: Quiz = {
      ...quiz,
      status: desiredStatus,
      isActive: isActivating,
      // If activating and end date was in the past, clear end date or extend so it doesn't immediately expire
      endDate:
        isActivating && quiz.endDate && new Date(quiz.endDate).getTime() < Date.now()
          ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16)
          : quiz.endDate,
      settings: {
        ...quiz.settings,
        endDate:
          isActivating && quiz.settings.endDate && new Date(quiz.settings.endDate).getTime() < Date.now()
            ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16)
            : quiz.settings.endDate,
      },
    };

    onUpdateQuiz(updated);
    toast.success(
      isActivating
        ? `Quiz "${quiz.title}" has been activated and is now visible to enrolled students.`
        : `Quiz "${quiz.title}" has been deactivated and removed from the active Student Dashboard.`
    );
    onClose();
  };

  // Full Batch Promotion & Reactivation
  const handleSaveReactivation = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedClassIds.length === 0) {
      toast.error('Please assign at least one class stream for this reactivation.');
      return;
    }

    if (!batchLabel.trim()) {
      toast.error('Please specify a batch or cohort label.');
      return;
    }

    const nowIso = new Date().toISOString();
    const newRecord = {
      reactivatedAt: nowIso,
      reactivatedBy: currentUserFullName,
      batchLabel: batchLabel.trim(),
      previousBatchLabel: quiz.batchLabel || quiz.settings.batchLabel || 'Previous Batch',
      targetClassIds: selectedClassIds,
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes.trim() || undefined,
    };

    const history = quiz.settings.reactivationHistory || [];

    const updated: Quiz = {
      ...quiz,
      status: 'published',
      isActive: true,
      classIds: selectedClassIds,
      batchLabel: batchLabel.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      settings: {
        ...quiz.settings,
        batchLabel: batchLabel.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        autoDisappearOnExpiry,
        reactivatedAt: nowIso,
        reactivatedForBatch: batchLabel.trim(),
        reactivationHistory: [newRecord, ...history],
      },
    };

    onUpdateQuiz(updated);
    toast.success(
      targetType === 'new_batch'
        ? `Quiz reactivated for promoted batch "${batchLabel.trim()}" across ${selectedClassIds.length} classes!`
        : `Quiz reactivated for batch "${batchLabel.trim()}" with fresh assessment window.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F2A4A] text-white flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F2A4A]">
                Activation, Deactivation & Batch Promotion
              </h3>
              <p className="text-xs text-slate-500">
                Manage assessment lifecycle, schedule automated disappearance, or reactivate for new cohorts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Summary */}
        <div className="mt-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Quiz Title
            </span>
            <strong className="text-slate-800 text-sm">{quiz.title}</strong>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentAvailability.badgeColor}`}
              >
                {currentAvailability.badgeLabel}
              </span>
              <span className="text-slate-500 text-[11px]">
                {currentAvailability.message}
              </span>
            </div>
          </div>

          {/* Quick Immediate Toggle Button */}
          <div className="flex items-center gap-2">
            {quiz.status === 'published' && currentAvailability.isActive ? (
              <button
                type="button"
                onClick={() => handleImmediateToggle('closed')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Power className="w-3.5 h-3.5 text-rose-600" />
                <span>Deactivate Now</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleImmediateToggle('published')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Power className="w-3.5 h-3.5 text-emerald-600" />
                <span>Activate Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection: Reactivate for Same Badge vs New Badge After Promotion */}
        <form onSubmit={handleSaveReactivation} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Reactivation Mode:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTargetType('same_batch');
                  setBatchLabel(quiz.batchLabel || 'Batch 2026 (Extended)');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  targetType === 'same_batch'
                    ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                  <RotateCcw className="w-4 h-4 text-blue-600" />
                  <span>Reactivate for Same Badge/Batch</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Re-open the assessment for the current cohort (e.g. makeup tests, deadline extension).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType('new_batch');
                  setBatchLabel('Batch 2026/2027 (Promoted)');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  targetType === 'new_batch'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span>New Badge After Promotion</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Assign this assessment to newly promoted classes / new academic session cohort.
                </p>
              </button>
            </div>
          </div>

          {/* Batch / Badge Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              {targetType === 'new_batch'
                ? 'Promoted Batch / Cohort Badge Label'
                : 'Current Batch / Cohort Badge Label'}
            </label>
            <input
              type="text"
              required
              value={batchLabel}
              onChange={(e) => setBatchLabel(e.target.value)}
              placeholder="e.g. Class of 2027, JSS 2 Promoted Stream A, Make-Up Cohort"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
            />
          </div>

          {/* Target Classes Selection (Critical when students are promoted) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                Target Classes ({selectedClassIds.length} assigned)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedClassIds(classes.map((c) => c.id))}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClassIds([])}
                  className="text-[10px] text-slate-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 border border-slate-200 rounded-xl bg-slate-50 max-h-36 overflow-y-auto">
              {classes.map((c) => {
                const isSelected = selectedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleClass(c.id)}
                      className="rounded text-emerald-600"
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Scheduled Assessment Window for the Reactivated Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Start Date & Time (Opens)
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-600" /> End Date & Time (Deadline)
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Automated Disappearance Option */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white">
            <input
              type="checkbox"
              id="modalAutoDisappear"
              checked={autoDisappearOnExpiry}
              onChange={(e) => setAutoDisappearOnExpiry(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600"
            />
            <label htmlFor="modalAutoDisappear" className="cursor-pointer">
              <span className="text-xs font-bold text-slate-800 block">
                Schedule Automated Disappearance on Expiry
              </span>
              <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                Automatically disappear from the Student Dashboard as soon as the scheduled end date passes.
              </span>
            </label>
          </div>

          {/* Reactivation Audit History (If any) */}
          {quiz.settings?.reactivationHistory && quiz.settings.reactivationHistory.length > 0 && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Previous Batch Reactivations ({quiz.settings.reactivationHistory.length})
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto text-[11px]">
                {quiz.settings.reactivationHistory.map((rec, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <strong className="text-slate-800">{rec.batchLabel}</strong>
                      <span className="text-slate-400 mx-1">•</span>
                      <span className="text-slate-500">
                        {formatQuizDateTime(rec.reactivatedAt)} by {rec.reactivatedBy}
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      {rec.targetClassIds.length} classes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>
                {targetType === 'new_batch'
                  ? 'Reactivate for Promoted Batch'
                  : 'Reactivate Assessment'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
