import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileQuestion,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  AlertCircle,
  Check,
  Send,
  Calendar,
  Lock,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';
import { Quiz, Submission, SubmissionAnswer } from '@/src/types';
import { SECTION_DEFS, getQuestionSectionKey } from '@/src/pages/admin/AdminQuizzesPage';
import { getQuizAvailability, formatQuizDateTime } from '@/src/utils/quizAvailability';
import { QuizSubmissionCelebration } from '@/src/components/quizzes/QuizSubmissionCelebration';
import { toast } from 'sonner';

export const StudentQuizzesPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const reviewSectionRef = React.useRef<HTMLDivElement>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => dataStore.getQuizzes());
  const [submissions, setSubmissions] = useState<Submission[]>(() => dataStore.getSubmissions());
  const subjects = React.useMemo(() => dataStore.getSubjects(), []);

  // Active Quiz Taker State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submittedResult, setSubmittedResult] = useState<Submission | null>(null);

  // Filter quizzes by class stream & automated disappearance / scheduled start
  const studentQuizzes = quizzes.filter((q) => {
    const matchesClass =
      !profile?.classIds?.length || q.classIds?.some((cid) => profile.classIds.includes(cid));
    if (!matchesClass) return false;

    const avail = getQuizAvailability(q);
    // If end date has elapsed and autoDisappear is enabled or deactivated, quiz automatically disappears
    if (avail.shouldDisappearFromDashboard) {
      return false;
    }
    return true;
  });

  const getSubjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || subjId;

  const getStudentSubmission = (quizId: string) => {
    return submissions.find((s) => s.quizId === quizId && s.userId === profile?.uid);
  };

  const handleStartQuiz = (quiz: Quiz) => {
    // 1. Strict single-attempt policy: No student can retake a quiz already submitted
    const existingSub = getStudentSubmission(quiz.id);
    if (existingSub) {
      toast.error('You have already submitted this assessment. Retakes are strictly prohibited.');
      return;
    }

    const avail = getQuizAvailability(quiz);
    if (!avail.isAvailableForStudent) {
      toast.error(avail.message);
      return;
    }
    setActiveQuiz(quiz);
    setStudentAnswers({});
    setSubmittedResult(null);
  };

  const handleSelectRadioOption = (questionId: string, optionId: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;

    // Strict safeguard: verify no submission exists
    const existingSub = getStudentSubmission(activeQuiz.id);
    if (existingSub) {
      toast.error('You have already submitted this assessment. Multiple submissions are not permitted.');
      setActiveQuiz(null);
      return;
    }

    // Run Pass 1 Auto-Grading immediately
    let autoScore = 0;
    let autoTotal = 0;
    let manualTotal = 0;
    let hasTheory = false;

    const answersList: SubmissionAnswer[] = activeQuiz.questions.map((q) => {
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
          studentText === correctText ||
          (q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || []).includes(studentText);
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
        // Theory question: queued for manual grading
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
    const percent = Math.round((totalScore / totalPossible) * 100);

    const newSubmission: Submission = {
      id: `sub-${Date.now()}`,
      quizId: activeQuiz.id,
      userId: profile?.uid || 'student',
      classId: profile?.classIds?.[0] || 'class-jss1-a',
      attemptNumber: 1,
      answers: answersList,
      autoScore,
      autoTotal,
      manualScore: 0,
      manualTotal,
      totalScore,
      totalPossible,
      percent,
      status: hasTheory ? 'pending_manual' : 'fully_graded',
      questionOrder: activeQuiz.questions.map((q) => q.id),
      optionOrder: {},
      submittedAt: new Date().toISOString(),
      gradedBy: hasTheory ? null : 'auto-grader',
      gradedAt: hasTheory ? null : new Date().toISOString(),
    };

    const saved = dataStore.saveSubmission(newSubmission);
    if (!saved) {
      toast.error('Assessment has already been submitted. Retakes are not permitted.');
      setActiveQuiz(null);
      return;
    }

    setSubmissions(dataStore.getSubmissions());
    setSubmittedResult(newSubmission);
    toast.success('Quiz submitted and auto-graded successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
          <FileQuestion className="w-6 h-6 text-emerald-600" /> Assigned Quizzes & Tests
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Take classroom assessments with radio button choices, instant auto-grading, and queued theory marks ({studentQuizzes.length} available quizzes)
        </p>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        {studentQuizzes.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
            <FileQuestion className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-slate-700">No Assessments Available</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Any tests scheduled for your class will appear here when active. Quizzes with auto-disappearance are removed after their deadline expires.
            </p>
          </div>
        ) : (
          studentQuizzes.map((quiz) => {
            const pastSub = getStudentSubmission(quiz.id);
            const subjName = getSubjectName(quiz.subjectId);
            const isCompleted = !!pastSub;
            const avail = getQuizAvailability(quiz);

            return (
              <div
                key={quiz.id}
                className={`bg-white p-6 rounded-xl border shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  avail.state === 'active'
                    ? 'border-emerald-200'
                    : avail.state === 'scheduled'
                    ? 'border-blue-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                      {subjName}
                    </span>

                    {/* Dynamic Availability & Countdown Badge */}
                    {avail.state === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        Open Now • Closes in {avail.timeRemainingFormatted}
                      </span>
                    )}

                    {avail.state === 'scheduled' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        Opens in {avail.timeUntilStartFormatted}
                      </span>
                    )}

                    {/* Batch / Badge Tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Tag className="w-3 h-3 text-indigo-500" />
                      {quiz.batchLabel || quiz.settings.batchLabel || 'Batch 2026/2027'}
                    </span>

                    {isCompleted && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          pastSub.status === 'pending_manual'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {pastSub.status === 'pending_manual' ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" /> Theory Awaiting Marks ({pastSub.percent}%)
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed ({pastSub.percent}%)
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[#0F2A4A] mt-2">{quiz.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl">{quiz.description}</p>

                  {/* Scheduled Window Time Details */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 bg-slate-50/70 px-3 py-1.5 rounded-lg border border-slate-100 max-w-fit">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-[#0F2A4A]" />
                      <strong className="text-slate-700">Starts:</strong> {formatQuizDateTime(avail.startDate)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <strong className="text-slate-700">Deadline:</strong> {formatQuizDateTime(avail.endDate)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Award className="w-4 h-4 text-emerald-600" /> {quiz.totalMarks} Total Marks ({quiz.questions?.length || 0} Questions)
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {quiz.settings.timeLimitMins > 0 ? `${quiz.settings.timeLimitMins} Minutes Limit` : 'Untimed'}
                    </span>
                    <span>Pass mark: {quiz.settings.passMarkPercent}%</span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row gap-2">
                  {isCompleted ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/results"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition-colors shadow-2xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        View Result ({pastSub.percent}%)
                      </Link>
                      <span
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                        title="Assessment already submitted. Retakes are strictly prohibited."
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" /> Submitted • No Retakes
                      </span>
                    </div>
                  ) : avail.isAvailableForStudent ? (
                    <button
                      type="button"
                      onClick={() => handleStartQuiz(quiz)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Take Quiz Now <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold cursor-not-allowed shadow-2xs"
                        title={`Opens on ${formatQuizDateTime(avail.startDate)}`}
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" /> Opens in {avail.timeUntilStartFormatted}
                      </button>
                      <span className="text-[10px] text-slate-400">
                        {avail.timeUntilStartFormatted ? `Unlocks in ${avail.timeUntilStartFormatted}` : 'Scheduled'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QUIZ TAKING MODAL WITH RADIO BUTTON ANSWERS */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {activeQuiz && getStudentSubmission(activeQuiz.id) && !submittedResult ? (
              /* ALREADY SUBMITTED SHIELD */
              <div className="text-center py-8 px-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#0F2A4A] dark:text-slate-100">
                  Assessment Already Submitted
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  You have already completed and submitted <strong>"{activeQuiz.title}"</strong>. School assessment policy strictly enforces a single attempt per student, and retakes are not permitted.
                </p>
                <div className="flex justify-center items-center gap-3 pt-3">
                  <Link
                    to="/results"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4" /> View Your Grade & Answers
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveQuiz(null)}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Return to Quizzes
                  </button>
                </div>
              </div>
            ) : submittedResult ? (
              /* INSTANT POST-SUBMISSION RESULTS SUMMARY WITH CELEBRATORY ANIMATIONS */
              <div className="space-y-6">
                <QuizSubmissionCelebration
                  submission={submittedResult}
                  quiz={activeQuiz}
                  onDone={() => {
                    setActiveQuiz(null);
                    setSubmittedResult(null);
                  }}
                  onViewAnalytics={() => navigate('/results')}
                  onScrollToReview={() => {
                    reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                {/* Instant Answer Breakdown with Explanations */}
                <div ref={reviewSectionRef} className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Your Answer Review:
                  </h4>
                  {activeQuiz.questions.map((q, idx) => {
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
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#0F2A4A]">
                            Question {idx + 1} ({q.type.replace('_', ' ')})
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              ans?.isCorrect ? 'text-emerald-700' : ans?.isCorrect === false ? 'text-rose-700' : 'text-amber-700'
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
                              Your Selected Choice:{' '}
                              <strong className={ans?.isCorrect ? 'text-emerald-800' : 'text-rose-800'}>
                                {selectedOptText || 'None selected'}
                              </strong>
                            </p>
                            {!ans?.isCorrect && correctOptText && (
                              <p className="text-emerald-800 font-semibold">
                                Correct Answer: {correctOptText}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-600">
                            <p>
                              Your Answer: <em>{ans?.textAnswer || 'None'}</em>
                            </p>
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Single attempt recorded. Retakes are locked.
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/results"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> View Full Analytics
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuiz(null);
                        setSubmittedResult(null);
                      }}
                      className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] text-white hover:bg-[#163c68] transition-colors cursor-pointer"
                    >
                      Done & Return to Quizzes
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* LIVE QUIZ QUESTIONS TAKING FORM WITH RADIO BUTTONS */
              <form onSubmit={handleSubmitQuiz} className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-[#0F2A4A]">{activeQuiz.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {getSubjectName(activeQuiz.subjectId)} • {activeQuiz.totalMarks} Total Marks • {activeQuiz.questions.length} Questions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveQuiz(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Single Attempt Policy Banner */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Single Attempt Policy:</strong> Once you submit this test, your submission is final. Retakes are strictly prohibited.
                  </span>
                </div>

                {/* Questions Grouped by Section */}
                <div className="space-y-8">
                  {SECTION_DEFS.map((sec) => {
                    const secQuestions = activeQuiz.questions.filter(
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
                            <p className="text-xs text-slate-600 mt-1">
                              {sec.instructions}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0F2A4A] text-white self-start sm:self-center shadow-2xs">
                            {secQuestions.length} {secQuestions.length === 1 ? 'Question' : 'Questions'} • {secMarks} Marks
                          </span>
                        </div>

                        {/* Questions in Section */}
                        <div className="p-4 sm:p-5 space-y-5">
                          {secQuestions.map((q, qIndex) => {
                            const globalIndex = activeQuiz.questions.findIndex((item) => item.id === q.id);
                            const isMultipleChoice = q.type === 'single_choice' || q.type === 'true_false';
                            const isTheory = q.type === 'theory';

                            return (
                              <div
                                key={q.id}
                                className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-[#0F2A4A]">
                                    {sec.letter}{qIndex + 1}. Question {globalIndex + 1} of {activeQuiz.questions.length}
                                  </span>
                                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {q.marks} Marks
                                  </span>
                                </div>

                                {/* Prompt */}
                                <div
                                  className="text-sm font-medium text-slate-900 leading-relaxed rich-text-content"
                                  dangerouslySetInnerHTML={{ __html: q.promptHtml }}
                                />

                                {/* Suggested Answers Rendered as Radio Buttons */}
                                {isMultipleChoice && (
                                  <div className="space-y-2 pt-2">
                                    {q.options?.map((opt, optIdx) => {
                                      const isSelected = studentAnswers[q.id] === opt.id;

                                      return (
                                        <label
                                          key={opt.id}
                                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-blue-50/70 border-[#0F2A4A] ring-1 ring-[#0F2A4A]'
                                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`quiz-question-${q.id}`}
                                            value={opt.id}
                                            checked={isSelected}
                                            onChange={() => handleSelectRadioOption(q.id, opt.id)}
                                            className="w-4 h-4 text-[#0F2A4A] accent-[#0F2A4A] focus:ring-[#0F2A4A] cursor-pointer"
                                          />
                                          <span className="text-xs font-bold text-slate-500">
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          <span className="text-xs text-slate-800 font-medium">
                                            {opt.text}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Short text input */}
                                {q.type === 'short_text' && (
                                  <div className="pt-2">
                                    <input
                                      type="text"
                                      value={studentAnswers[q.id] || ''}
                                      onChange={(e) =>
                                        setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })
                                      }
                                      placeholder="Type your exact answer here..."
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                                    />
                                  </div>
                                )}

                                {/* Theory essay input */}
                                {isTheory && (
                                  <div className="pt-2">
                                    <textarea
                                      rows={4}
                                      value={studentAnswers[q.id] || ''}
                                      onChange={(e) =>
                                        setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })
                                      }
                                      placeholder="Type your complete written explanation or proof here for instructor evaluation..."
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Questions Answered:{' '}
                    <strong>
                      {Object.keys(studentAnswers).length} / {activeQuiz.questions.length}
                    </strong>
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveQuiz(null)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit Assessment
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
