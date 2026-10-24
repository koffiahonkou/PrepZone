import React, { useState, useEffect } from 'react';
import {
  Eye,
  X,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  Send,
  Sparkles,
  Info,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Quiz, QuizQuestion, Submission, SubmissionAnswer } from '@/src/types';
import { SECTION_DEFS, getQuestionSectionKey } from '@/src/pages/admin/AdminQuizzesPage';
import { toast } from 'sonner';

interface QuizStudentPreviewModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  subjectName?: string;
}

export const QuizStudentPreviewModal: React.FC<QuizStudentPreviewModalProps> = ({
  quiz,
  isOpen,
  onClose,
  subjectName = 'General Subject',
}) => {
  if (!isOpen) return null;

  // Sandbox state
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submittedResult, setSubmittedResult] = useState<Submission | null>(null);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(false);

  // Simulated countdown timer
  const totalSeconds = (quiz.settings?.timeLimitMins || 20) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);

  useEffect(() => {
    if (!isTimerActive || submittedResult || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive, submittedResult, secondsRemaining]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectRadioOption = (questionId: string, optionId: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleResetSandbox = () => {
    setStudentAnswers({});
    setSubmittedResult(null);
    setSecondsRemaining(totalSeconds);
    setIsTimerActive(true);
    toast.info('Preview session reset. Try different answers!');
  };

  const handleSubmitSimulatedQuiz = (e: React.FormEvent) => {
    e.preventDefault();

    // Run identical auto-grading algorithm WITHOUT saving to database
    let autoScore = 0;
    let autoTotal = 0;
    let manualTotal = 0;
    let hasTheory = false;

    const answersList: SubmissionAnswer[] = (quiz.questions || []).map((q) => {
      if (q.type === 'single_choice' || q.type === 'true_false') {
        autoTotal += q.marks;
        const studentChoice = studentAnswers[q.id];
        const correctChoice = q.correctOptionIds?.[0];
        const isCorrect = !!studentChoice && studentChoice === correctChoice;
        const marksAwarded = isCorrect ? q.marks : 0;
        autoScore += marksAwarded;

        return {
          questionId: q.id,
          selectedOptionIds: studentChoice ? [studentChoice] : [],
          autoMarks: marksAwarded,
          manualMarks: null,
          feedback: null,
          isCorrect,
        };
      } else if (q.type === 'short_text') {
        autoTotal += q.marks;
        const studentText = (studentAnswers[q.id] || '').trim().toLowerCase();
        const correctText = (q.correctText || '').trim().toLowerCase();
        const isCorrect =
          Boolean(studentText) &&
          (studentText === correctText ||
            (q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || []).includes(studentText));
        const marksAwarded = isCorrect ? q.marks : 0;
        autoScore += marksAwarded;

        return {
          questionId: q.id,
          textAnswer: studentAnswers[q.id] || '',
          autoMarks: marksAwarded,
          manualMarks: null,
          feedback: null,
          isCorrect,
        };
      } else {
        // Theory question
        hasTheory = true;
        manualTotal += q.marks;

        return {
          questionId: q.id,
          textAnswer: studentAnswers[q.id] || '',
          autoMarks: 0,
          manualMarks: null,
          feedback: null,
          isCorrect: null,
        };
      }
    });

    const totalPossible = autoTotal + manualTotal;
    const totalScore = autoScore;
    const percent = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 100;

    const simulatedSubmission: Submission = {
      id: `preview-sub-${Date.now()}`,
      quizId: quiz.id,
      userId: 'student-preview-user',
      classId: 'preview-class',
      attemptNumber: 1,
      answers: answersList,
      autoScore,
      autoTotal,
      manualScore: 0,
      manualTotal,
      totalScore,
      totalPossible,
      percent,
      status: hasTheory ? 'pending_manual' : 'auto_graded',
      questionOrder: quiz.questions.map((q) => q.id),
      optionOrder: {},
      submittedAt: new Date().toISOString(),
    };

    setSubmittedResult(simulatedSubmission);
    setIsTimerActive(false);
    toast.success('Simulated submission complete! Scored without saving to database.');
  };

  // Device width wrapper
  const deviceContainerClass =
    deviceMode === 'mobile'
      ? 'max-w-md mx-auto transition-all'
      : deviceMode === 'tablet'
      ? 'max-w-2xl mx-auto transition-all'
      : 'max-w-4xl mx-auto transition-all';

  const answeredCount = Object.keys(studentAnswers).filter((k) =>
    Boolean(studentAnswers[k]?.trim())
  ).length;

  return (
    <div className="fixed inset-0 z-70 flex flex-col bg-slate-900/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-150">
      {/* Top Instructor Control Bar */}
      <div className="bg-[#0F2A4A] border-b border-slate-700/80 text-white px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wider shadow-2xs">
            <Eye className="w-3.5 h-3.5" /> Preview Mode
          </span>
          <span className="text-xs text-slate-300 hidden sm:inline">
            Testing student interface sandbox • <strong>No submissions will be saved</strong>
          </span>
        </div>

        {/* Device Switcher and Inspector Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Answer Key Toggle */}
          <button
            type="button"
            onClick={() => setShowAnswerKey(!showAnswerKey)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showAnswerKey
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Highlight correct answers in the test view for grading audit"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{showAnswerKey ? 'Answer Key: ON' : 'Show Answer Key'}</span>
          </button>

          {/* Device Size Selector */}
          <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 flex items-center">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                deviceMode === 'desktop'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop View (Full Width)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                deviceMode === 'tablet'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet View (672px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                deviceMode === 'mobile'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile View (448px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset / Retake Sandbox */}
          <button
            type="button"
            onClick={handleResetSandbox}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Clear all answers and reset simulated timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Close Preview */}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close Preview</span>
          </button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/40">
        <div className={deviceContainerClass}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Student Exam Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    {subjectName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Pass Mark: {quiz.settings?.passMarkPercent || 50}%
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {quiz.batchLabel || quiz.settings?.batchLabel || 'Batch 2026/2027'}
                  </span>
                </div>
                <h2 className="text-xl font-serif font-bold text-[#0F2A4A]">{quiz.title}</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  {quiz.description || 'Answer all objective questions and provide comprehensive answers for theory questions.'}
                </p>
              </div>

              {/* Simulated Student Timer and Marks Stats */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[#0F2A4A] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  <Clock className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                  <span>{formatTimer(secondsRemaining)}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">rem</span>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {answeredCount} of {quiz.questions?.length || 0} Answered
                </span>
              </div>
            </div>

            {/* Content: Either Submission Result Review or Interactive Question Taking Form */}
            {submittedResult ? (
              /* SIMULATED SUBMISSION RESULT REVIEW SCREEN */
              <div className="p-6 sm:p-8 space-y-6">
                <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#0F2A4A]">
                    Simulated Assessment Completed!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    This demonstrates the exact grading and review experience students will receive after submitting their test.
                  </p>
                </div>

                {/* Score Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div>
                    <span className="text-2xl font-bold text-slate-800 block">
                      {submittedResult.totalScore} / {submittedResult.totalPossible}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Auto Marks Scored</span>
                  </div>

                  <div>
                    <span className="text-2xl font-extrabold text-emerald-600 block">
                      {submittedResult.percent}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {submittedResult.percent >= (quiz.settings?.passMarkPercent || 50)
                        ? 'Passed'
                        : 'Below Pass Mark'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-slate-700">
                      Submission State
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        submittedResult.status === 'pending_manual'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {submittedResult.status === 'pending_manual'
                        ? 'Pending Theory Marks'
                        : 'Fully Auto-Graded'}
                    </span>
                  </div>
                </div>

                {submittedResult.status === 'pending_manual' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Theory Questions Queued:</strong> Objective questions were auto-graded immediately ({submittedResult.autoScore}/{submittedResult.autoTotal} marks). Extended essay responses are marked manually by the instructor.
                    </span>
                  </div>
                )}

                {/* Question by Question Answer Review */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Question-by-Question Result Breakdown:
                  </h4>
                  {quiz.questions?.map((q, idx) => {
                    const ans = submittedResult.answers.find((a) => a.questionId === q.id);
                    const isMultipleChoice = q.type === 'single_choice' || q.type === 'true_false';
                    const selectedOptId = ans?.selectedOptionIds?.[0];
                    const selectedOptText = q.options?.find((o) => o.id === selectedOptId)?.text;
                    const correctOptId = q.correctOptionIds?.[0];
                    const correctOptText = q.options?.find((o) => o.id === correctOptId)?.text;

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border ${
                          ans?.isCorrect
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : ans?.isCorrect === false
                            ? 'border-rose-200 bg-rose-50/20'
                            : 'border-amber-200 bg-amber-50/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-[#0F2A4A]">
                            Question {idx + 1} ({q.type.replace('_', ' ')})
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              ans?.isCorrect
                                ? 'text-emerald-700'
                                : ans?.isCorrect === false
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {ans?.autoMarks} / {q.marks} Marks
                          </span>
                        </div>

                        <div
                          className="text-xs text-slate-800 mb-2 font-medium rich-text-content"
                          dangerouslySetInnerHTML={{ __html: q.promptHtml }}
                        />

                        {isMultipleChoice ? (
                          <div className="text-xs space-y-1">
                            <p className="text-slate-600">
                              Selected Choice:{' '}
                              <strong className={ans?.isCorrect ? 'text-emerald-800' : 'text-rose-800'}>
                                {selectedOptText || 'No answer selected'}
                              </strong>
                            </p>
                            {!ans?.isCorrect && correctOptText && (
                              <p className="text-emerald-800 font-semibold">
                                Correct Answer: {correctOptText}
                              </p>
                            )}
                          </div>
                        ) : q.type === 'short_text' ? (
                          <div className="text-xs text-slate-600 space-y-1">
                            <p>
                              Your Input: <em>{ans?.textAnswer || 'None'}</em>
                            </p>
                            {!ans?.isCorrect && (
                              <p className="text-emerald-800 font-semibold">
                                Accepted Answer: {q.correctText}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-600 space-y-1">
                            <p>
                              Written Response: <em>{ans?.textAnswer || 'No response entered.'}</em>
                            </p>
                            {q.modelAnswerHtml && (
                              <div className="mt-2 p-2.5 bg-white rounded border border-slate-200 text-[11px] text-slate-700">
                                <strong>Instructor Model Answer / Rubric:</strong>
                                <div
                                  className="mt-1 rich-text-content"
                                  dangerouslySetInnerHTML={{ __html: q.modelAnswerHtml }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {q.explanationHtml && (
                          <div className="mt-2 p-2.5 bg-white rounded border border-slate-200 text-[11px] text-slate-600">
                            <strong>Explanation:</strong>{' '}
                            <span dangerouslySetInnerHTML={{ __html: q.explanationHtml }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleResetSandbox}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retake in Preview
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-xs transition-colors cursor-pointer"
                  >
                    Return to Quiz Editor
                  </button>
                </div>
              </div>
            ) : (
              /* LIVE STUDENT EXAM QUESTIONS TAKING FORM */
              <form onSubmit={handleSubmitSimulatedQuiz} className="p-6 sm:p-8 space-y-8">
                {SECTION_DEFS.map((sec) => {
                  const secQuestions = (quiz.questions || []).filter(
                    (q) => getQuestionSectionKey(q) === sec.key
                  );
                  if (secQuestions.length === 0) return null;
                  const secMarks = secQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);

                  return (
                    <div
                      key={sec.key}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                    >
                      {/* Section Header */}
                      <div
                        className={`p-4 border-b border-slate-200 ${sec.headerBg} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[#0F2A4A] text-white flex items-center justify-center font-bold text-xs">
                              {sec.letter}
                            </span>
                            <h4 className="text-sm font-serif font-bold text-[#0F2A4A]">
                              {sec.title}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{sec.instructions}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0F2A4A] text-white self-start sm:self-center shadow-2xs">
                          {secQuestions.length} {secQuestions.length === 1 ? 'Question' : 'Questions'} • {secMarks} Marks
                        </span>
                      </div>

                      {/* Questions in Section */}
                      <div className="p-4 sm:p-5 space-y-6">
                        {secQuestions.map((q, qIndex) => {
                          const globalIndex = (quiz.questions || []).findIndex(
                            (item) => item.id === q.id
                          );
                          const isMultipleChoice =
                            q.type === 'single_choice' || q.type === 'true_false';
                          const isTheory = q.type === 'theory';

                          return (
                            <div
                              key={q.id}
                              className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-[#0F2A4A]">
                                  {sec.letter}{qIndex + 1}. Question {globalIndex + 1} of{' '}
                                  {quiz.questions?.length || 0}
                                </span>
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {q.marks} Marks
                                </span>
                              </div>

                              {/* Question Prompt */}
                              <div
                                className="text-sm font-medium text-slate-900 leading-relaxed rich-text-content"
                                dangerouslySetInnerHTML={{ __html: q.promptHtml }}
                              />

                              {/* Suggested Answers Rendered as Radio Buttons */}
                              {isMultipleChoice && (
                                <div className="space-y-2 pt-2">
                                  {q.options?.map((opt, optIdx) => {
                                    const isSelected = studentAnswers[q.id] === opt.id;
                                    const isCorrectAnswer = q.correctOptionIds?.includes(opt.id);

                                    return (
                                      <label
                                        key={opt.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-blue-50/70 border-[#0F2A4A] ring-1 ring-[#0F2A4A]'
                                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        } ${
                                          showAnswerKey && isCorrectAnswer
                                            ? 'ring-2 ring-emerald-500 bg-emerald-50/40'
                                            : ''
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`preview-q-${q.id}`}
                                          value={opt.id}
                                          checked={isSelected}
                                          onChange={() => handleSelectRadioOption(q.id, opt.id)}
                                          className="w-4 h-4 text-[#0F2A4A] accent-[#0F2A4A] focus:ring-[#0F2A4A] cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-500">
                                          {String.fromCharCode(65 + optIdx)}.
                                        </span>
                                        <span className="text-xs text-slate-800 font-medium flex-1">
                                          {opt.text}
                                        </span>
                                        {showAnswerKey && isCorrectAnswer && (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                            Correct Key
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Short text input */}
                              {q.type === 'short_text' && (
                                <div className="pt-2 space-y-1.5">
                                  <input
                                    type="text"
                                    value={studentAnswers[q.id] || ''}
                                    onChange={(e) =>
                                      setStudentAnswers({
                                        ...studentAnswers,
                                        [q.id]: e.target.value,
                                      })
                                    }
                                    placeholder="Type your exact answer here..."
                                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A]"
                                  />
                                  {showAnswerKey && q.correctText && (
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                      Accepted key: <strong>{q.correctText}</strong>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Theory essay input */}
                              {isTheory && (
                                <div className="pt-2 space-y-2">
                                  <textarea
                                    rows={4}
                                    value={studentAnswers[q.id] || ''}
                                    onChange={(e) =>
                                      setStudentAnswers({
                                        ...studentAnswers,
                                        [q.id]: e.target.value,
                                      })
                                    }
                                    placeholder="Provide detailed written response, workings, explanations, or analysis..."
                                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A] resize-y"
                                  />
                                  {showAnswerKey && q.modelAnswerHtml && (
                                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900">
                                      <strong className="block mb-1">Teacher Model Answer Rubric:</strong>
                                      <div
                                        className="rich-text-content"
                                        dangerouslySetInnerHTML={{ __html: q.modelAnswerHtml }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Submit Action Bar */}
                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Preview Submission: Instant scoring will run in-memory without affecting student database records.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                    >
                      Exit Preview
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Quiz as Student (Simulated)</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
