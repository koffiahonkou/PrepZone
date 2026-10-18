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
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';
import { Quiz, Submission, SubmissionAnswer } from '@/src/types';
import { SECTION_DEFS, getQuestionSectionKey } from '@/src/pages/admin/AdminQuizzesPage';
import { toast } from 'sonner';

export const StudentQuizzesPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => dataStore.getQuizzes());
  const [submissions, setSubmissions] = useState<Submission[]>(() => dataStore.getSubmissions());
  const subjects = React.useMemo(() => dataStore.getSubjects(), []);

  // Active Quiz Taker State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submittedResult, setSubmittedResult] = useState<Submission | null>(null);

  const studentQuizzes = quizzes.filter(
    (q) =>
      q.status === 'published' &&
      (!profile?.classIds.length || q.classIds.some((cid) => profile.classIds.includes(cid)))
  );

  const getSubjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || subjId;

  const getStudentSubmission = (quizId: string) => {
    return submissions.find((s) => s.quizId === quizId && s.userId === profile?.uid);
  };

  const handleStartQuiz = (quiz: Quiz) => {
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

    dataStore.saveSubmission(newSubmission);
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
        {studentQuizzes.map((quiz) => {
          const pastSub = getStudentSubmission(quiz.id);
          const subjName = getSubjectName(quiz.subjectId);
          const isCompleted = !!pastSub;

          return (
            <div
              key={quiz.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                    {subjName}
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

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
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
                  <div className="flex items-center gap-2">
                    <Link
                      to="/results"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                    >
                      Review Result ({pastSub.percent}%)
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleStartQuiz(quiz)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      Retake Quiz
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartQuiz(quiz)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    Take Quiz Now <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* QUIZ TAKING MODAL WITH RADIO BUTTON ANSWERS */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {submittedResult ? (
              /* INSTANT POST-SUBMISSION RESULTS SUMMARY */
              <div className="space-y-6">
                <div className="text-center pb-4 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <Award className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-[#0F2A4A]">Assessment Submitted!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your answers were automatically evaluated by the EduForm grading engine.
                  </p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
                  <div>
                    <span className="text-3xl font-extrabold text-[#0F2A4A] block">
                      {submittedResult.totalScore} / {submittedResult.totalPossible}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Marks Scored</span>
                  </div>

                  <div>
                    <span className="text-3xl font-extrabold text-emerald-600 block">
                      {submittedResult.percent}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {submittedResult.percent >= (activeQuiz.settings.passMarkPercent || 50)
                        ? 'Passed'
                        : 'Below Pass Mark'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-slate-700">
                      Grading Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        submittedResult.status === 'pending_manual'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {submittedResult.status === 'pending_manual' ? 'Pending Theory Marks' : 'Fully Graded'}
                    </span>
                  </div>
                </div>

                {submittedResult.status === 'pending_manual' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Theory Questions Queued:</strong> Objective questions have been auto-graded immediately ({submittedResult.autoScore}/{submittedResult.autoTotal} marks). Your theory answers have been sent to the instructor, and your final mark may increase.
                    </span>
                  </div>
                )}

                {/* Instant Answer Breakdown with Explanations */}
                <div className="space-y-4">
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

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuiz(null);
                      setSubmittedResult(null);
                    }}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] text-white hover:bg-[#163c68]"
                  >
                    Done & Return to Quizzes
                  </button>
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
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
