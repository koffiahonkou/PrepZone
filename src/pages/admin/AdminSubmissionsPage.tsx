import React, { useState } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Award,
  Filter,
  User,
  Search,
  ChevronDown,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { Submission } from '@/src/types';
import { toast } from 'sonner';

export const AdminSubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>(() => dataStore.getSubmissions());
  const users = dataStore.getUsers();
  const quizzes = dataStore.getQuizzes();
  const classes = dataStore.getClasses();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const getStudent = (uid: string) => users.find((u) => u.uid === uid);
  const getQuiz = (qid: string) => quizzes.find((q) => q.id === qid);
  const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || cid;

  const filtered = submissions.filter((s) => {
    if (filterStatus === 'pending') return s.status === 'pending_manual';
    if (filterStatus === 'graded') return s.status === 'fully_graded';
    return true;
  });

  const handleGradeTheory = (subId: string, qId: string, marks: number, feedback: string) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    const updatedAnswers = sub.answers.map((a) => {
      if (a.questionId === qId) {
        return { ...a, manualMarks: marks, feedback, isCorrect: marks > 0 };
      }
      return a;
    });

    const manualScore = updatedAnswers.reduce((acc, a) => acc + (a.manualMarks || 0), 0);
    const totalScore = sub.autoScore + manualScore;
    const percent = Math.round((totalScore / sub.totalPossible) * 100);

    const updatedSub: Submission = {
      ...sub,
      answers: updatedAnswers,
      manualScore,
      totalScore,
      percent,
      status: 'fully_graded',
      gradedBy: 'demo-admin-uid',
      gradedAt: new Date().toISOString(),
    };

    dataStore.saveSubmission(updatedSub);
    setSubmissions(dataStore.getSubmissions());
    setSelectedSub(updatedSub);
    toast.success('Theory marks recorded and finalized!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-600" /> Submissions & Grading Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review student attempts, award manual theory marks, and inspect auto-graded answers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Submissions ({submissions.length})</option>
            <option value="pending">
              Awaiting Manual Grading ({submissions.filter((s) => s.status === 'pending_manual').length})
            </option>
            <option value="graded">
              Fully Graded ({submissions.filter((s) => s.status === 'fully_graded').length})
            </option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Submissions Queue
          </span>

          {filtered.map((sub) => {
            const student = getStudent(sub.userId);
            const quiz = getQuiz(sub.quizId);
            const isSelected = selectedSub?.id === sub.id;

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#0F2A4A] bg-blue-50/40 shadow-xs ring-1 ring-[#0F2A4A]'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sub.status === 'pending_manual'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {sub.status === 'pending_manual' ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" /> Pending Theory
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Graded
                      </>
                    )}
                  </span>
                  <span className="text-xs font-bold text-[#0F2A4A]">
                    {sub.totalScore}/{sub.totalPossible} ({sub.percent}%)
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">
                  {quiz?.title || sub.quizId}
                </h4>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{student?.fullName || sub.userId}</span>
                  <span>{getClassName(sub.classId)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Inspection & Grading Workbench */}
        <div className="lg:col-span-2">
          {selectedSub ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 font-mono">Attempt #{selectedSub.attemptNumber}</span>
                  <h3 className="text-lg font-bold text-[#0F2A4A]">
                    {getQuiz(selectedSub.quizId)?.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student: <strong>{getStudent(selectedSub.userId)?.fullName}</strong> • Class: {getClassName(selectedSub.classId)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold text-[#0F2A4A] block">
                    {selectedSub.totalScore} / {selectedSub.totalPossible}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">{selectedSub.percent}% Score</span>
                </div>
              </div>

              {selectedSub.status === 'pending_manual' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    This submission contains theory questions awaiting manual instructor evaluation. Enter marks below to complete Pass 2 grading.
                  </span>
                </div>
              )}

              {/* Answers Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Question Breakdown & Answers:
                </h4>

                {selectedSub.answers.map((ans, idx) => {
                  const q = getQuiz(selectedSub.quizId)?.questions.find((x) => x.id === ans.questionId);
                  const isTheory = q?.type === 'theory';

                  return (
                    <div
                      key={ans.questionId}
                      className={`p-4 rounded-lg border ${
                        isTheory ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#0F2A4A]">
                          Question {idx + 1} ({q?.type?.replace('_', ' ')})
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          Marks: {ans.manualMarks !== null ? ans.manualMarks : ans.autoMarks} / {q?.marks}
                        </span>
                      </div>

                      <div
                        className="text-xs text-slate-700 mb-3 rich-text-content"
                        dangerouslySetInnerHTML={{ __html: q?.promptHtml || '' }}
                      />

                      {/* Student's Answer */}
                      <div className="p-3 bg-white rounded border border-slate-200 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Student Answer:
                        </span>
                        <p className="font-medium text-slate-900">
                          {ans.textAnswer || (ans.selectedOptionIds && ans.selectedOptionIds.join(', ')) || 'No answer submitted'}
                        </p>
                      </div>

                      {/* Theory Grading Controls */}
                      {isTheory && (
                        <div className="mt-3 pt-3 border-t border-amber-100 flex flex-col gap-2">
                          {q?.modelAnswerHtml && (
                            <div className="p-2.5 bg-emerald-50 rounded border border-emerald-100 text-[11px] text-emerald-900">
                              <span className="font-bold block mb-0.5">Model Answer Reference:</span>
                              <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: q.modelAnswerHtml }} />
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                                Marks (Max {q?.marks}):
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={q?.marks}
                                defaultValue={ans.manualMarks !== null ? ans.manualMarks : (q?.marks || 0)}
                                id={`marks-input-${ans.questionId}`}
                                className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-[#0F2A4A] focus:outline-hidden"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Teacher feedback (optional, e.g. Good explanation of thermodynamics)..."
                              defaultValue={ans.feedback || ''}
                              id={`feedback-input-${ans.questionId}`}
                              className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const marksInput = document.getElementById(
                                  `marks-input-${ans.questionId}`
                                ) as HTMLInputElement;
                                const feedbackInput = document.getElementById(
                                  `feedback-input-${ans.questionId}`
                                ) as HTMLInputElement;
                                const marks = Number(marksInput.value);
                                const feedbackText = feedbackInput?.value?.trim() || 'Marks awarded by instructor.';
                                handleGradeTheory(
                                  selectedSub.id,
                                  ans.questionId,
                                  marks,
                                  feedbackText
                                );
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors shrink-0"
                            >
                              Save Marks
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Select a submission from the queue</p>
              <p className="text-xs text-slate-400 mt-1">
                Click any student submission on the left to inspect answers and award theory marks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
