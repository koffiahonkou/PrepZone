import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  FileQuestion,
  Award,
  Clock,
  ArrowRight,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Users,
  Video,
  Layers,
  Calendar,
  Sparkles,
  ClipboardList,
  Bell,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { dataStore } from '@/src/services/dataStore';
import { Quiz, Submission, AcademicClass, Lesson, AppNotification } from '@/src/types';
import { getQuizAvailability, formatQuizDateTime } from '@/src/utils/quizAvailability';
import { getAnnouncementAvailability, formatAnnouncementDateTime } from '@/src/utils/announcementAvailability';
import { QuizReactivationModal } from '@/src/components/quizzes/QuizReactivationModal';
import { toast } from 'sonner';

export const TeacherDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>(() => dataStore.getQuizzes());
  const classes = useMemo(() => dataStore.getClasses(), []);
  const subjects = useMemo(() => dataStore.getSubjects(), []);
  const lessons = useMemo(() => dataStore.getLessons(), []);
  const [submissions, setSubmissions] = useState<Submission[]>(() => dataStore.getSubmissions());
  const notifications = useMemo(() => dataStore.getNotifications(), []);
  const users = useMemo(() => dataStore.getUsers(), []);

  // Reactivation modal state for teacher
  const [reactivationQuiz, setReactivationQuiz] = useState<Quiz | null>(null);

  // Filter quizzes by teacher assigned subjects/classes if applicable
  const teacherQuizzes = useMemo(() => {
    return quizzes;
  }, [quizzes]);

  // Submissions needing manual theory marks
  const pendingTheorySubmissions = useMemo(() => {
    return submissions.filter((s) => s.status === 'pending_manual');
  }, [submissions]);

  // Old quizzes ready for reactivation
  const oldQuizzesForReactivation = useMemo(() => {
    return quizzes.filter((q) => {
      const avail = getQuizAvailability(q);
      return (
        avail.state === 'expired' ||
        avail.state === 'closed' ||
        q.status === 'closed' ||
        q.isActive === false ||
        (q.endDate && new Date(q.endDate).getTime() < Date.now()) ||
        avail.isDisappeared
      );
    });
  }, [quizzes]);

  // Old announcements ready for reactivation
  const oldAnnouncementsForReactivation = useMemo(() => {
    return notifications.filter((n) => {
      const avail = getAnnouncementAvailability(n);
      return (
        avail.state === 'expired' ||
        avail.isExpired ||
        avail.shouldDisappearFromDashboard ||
        Boolean(n.endDate && new Date(n.endDate).getTime() < Date.now()) ||
        Boolean(n.expiresAt && new Date(n.expiresAt).getTime() < Date.now()) ||
        n.status === 'expired' ||
        n.status === 'archived'
      );
    });
  }, [notifications]);

  // Teacher Stats
  const activeQuizzesCount = quizzes.filter((q) => getQuizAvailability(q).state === 'active').length;
  const scheduledQuizzesCount = quizzes.filter((q) => getQuizAvailability(q).state === 'scheduled').length;
  const totalStudents = users.filter((u) => u.role === 'student' && u.status === 'active').length;

  const getSubjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || subjId;
  const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || cid;
  const getStudentProfile = (uid: string) => users.find((u) => u.uid === uid);

  const handleUpdateQuiz = (updated: Quiz) => {
    dataStore.saveQuiz(updated);
    setQuizzes(dataStore.getQuizzes());
  };

  return (
    <div className="space-y-6">
      {/* Teacher Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0F2A4A] via-[#163c68] to-[#1E3A5F] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <GraduationCap className="w-3.5 h-3.5" /> Faculty & Teacher Console
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline">Academic Session 2026/2027</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
              Welcome back, {profile?.fullName || 'Instructor'}!
            </h1>
            <p className="mt-2 text-slate-200 text-xs sm:text-sm leading-relaxed">
              Manage classroom quizzes, review pending student theory responses, publish lecture notes, and reactivate assessments for new cohort batches.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                to="/admin/quizzes"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create Quiz
              </Link>
              <Link
                to="/admin/quizzes?filter=old_reactivation"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> Reactivate Old Quizzes ({oldQuizzesForReactivation.length})
              </Link>
              <Link
                to="/admin/submissions"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5 text-amber-300" /> Grade Submissions ({pendingTheorySubmissions.length})
              </Link>
              <Link
                to="/admin/notifications?filter=old_reactivation"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-purple-300" /> Old Notices ({oldAnnouncementsForReactivation.length})
              </Link>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 text-xs space-y-2 shrink-0 md:w-64">
            <span className="font-semibold text-emerald-300 block uppercase tracking-wider text-[10px]">
              Grading Summary
            </span>
            <div className="flex justify-between items-center text-slate-200">
              <span>Total Submissions:</span>
              <strong className="text-white">{submissions.length}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-200">
              <span>Awaiting Theory Marks:</span>
              <strong className="text-amber-300 font-bold">{pendingTheorySubmissions.length}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-200">
              <span>Fully Graded:</span>
              <strong className="text-emerald-300">
                {submissions.filter((s) => s.status === 'fully_graded').length}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Authored Quizzes */}
        <Link
          to="/admin/quizzes"
          className="group bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-[#0F2A4A] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Authored Quizzes
              </span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <FileQuestion className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-[#0F2A4A] mt-2">{quizzes.length}</p>
            <span className="text-xs text-slate-500 mt-1 block">
              {activeQuizzesCount} live • {scheduledQuizzesCount} scheduled
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Manage assessments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Card 2: Theory Grading Queue */}
        <Link
          to="/admin/submissions"
          className="group bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-amber-500 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Theory Grading Queue
              </span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              {pendingTheorySubmissions.length} Pending
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Student written answers waiting review
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Open grading queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Card 3: Old Quizzes for Reactivation */}
        <Link
          to="/admin/quizzes?filter=old_reactivation"
          className="group bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-500 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Old Quizzes (Reactivate)
              </span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <RotateCcw className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-indigo-700 mt-2">
              {oldQuizzesForReactivation.length} Ready
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Past cohort tests ready for renewal
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Filter old quizzes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Card 4: Curated Lesson Notes */}
        <Link
          to="/admin/lessons"
          className="group bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-red-500 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lecture Notes & Video
              </span>
              <span className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors">
                <BookOpen className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">{lessons.length} Lessons</p>
            <span className="text-xs text-slate-500 mt-1 block">
              {lessons.filter((l) => Boolean(l.videoUrl)).length} with video recordings
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-red-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>View lesson library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Main Content Grid: Grading Queue & Quizzes Reactivation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Submissions Requiring Manual Evaluation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-500" />
                  Theory Submissions Awaiting Evaluation ({pendingTheorySubmissions.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students have completed objective sections; award manual theory rubric marks to finalize scores.
                </p>
              </div>

              <Link
                to="/admin/submissions"
                className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <span>View all queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {pendingTheorySubmissions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">All Theory Responses Evaluated!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  There are no pending theory submissions waiting for teacher review. All student tests are up to date.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80">
                      <th className="py-2.5 px-3 font-semibold">Student</th>
                      <th className="py-2.5 px-3 font-semibold">Assessment</th>
                      <th className="py-2.5 px-3 font-semibold">Class</th>
                      <th className="py-2.5 px-3 font-semibold">Auto Score</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingTheorySubmissions.slice(0, 5).map((sub) => {
                      const stProfile = getStudentProfile(sub.userId);
                      const q = quizzes.find((x) => x.id === sub.quizId);
                      const pendingTheoryAnswers = sub.answers.filter((a) => a.manualMarks === null);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">
                              {stProfile?.fullName || sub.userId}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              @{stProfile?.username || sub.userId}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-800 line-clamp-1">
                              {q?.title || sub.quizId}
                            </span>
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {pendingTheoryAnswers.length} theory questions pending
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {getClassName(sub.classId)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-700">
                              {sub.autoScore} / {sub.totalPossible}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ({sub.percent}%)
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              to="/admin/submissions"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-2xs transition-colors"
                            >
                              Grade <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Reactivation Hub for Quizzes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-indigo-600" />
                  Old Quizzes Reactivation Center ({oldQuizzesForReactivation.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Renew archived and past cohort assessments for current class streams with fresh schedule deadlines.
                </p>
              </div>

              <Link
                to="/admin/quizzes?filter=old_reactivation"
                className="text-xs text-indigo-700 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Filter all old ({oldQuizzesForReactivation.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {oldQuizzesForReactivation.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                No expired or closed quizzes at this time. All assessments are currently active or scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {oldQuizzesForReactivation.slice(0, 3).map((quiz) => {
                  const avail = getQuizAvailability(quiz);

                  return (
                    <div
                      key={quiz.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {getSubjectName(quiz.subjectId)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {avail.badgeLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {quiz.batchLabel || 'Previous Batch'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#0F2A4A] truncate">{quiz.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {quiz.questions.length} Questions • {quiz.totalMarks} Total Marks • Expired on {formatQuizDateTime(avail.endDate)}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReactivationQuiz(quiz)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reactivate Quiz</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Class Gradebook & Announcements Reactivation */}
        <div className="space-y-6">
          {/* Gradebook Quick Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0F2A4A] flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Class Gradebook Overview
              </h3>
              <Link to="/admin/gradebook" className="text-xs text-emerald-700 font-semibold hover:underline">
                View Full
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600">Active Students:</span>
                <strong className="text-slate-900 font-bold">{totalStudents}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600">Total Quiz Attempts:</span>
                <strong className="text-slate-900 font-bold">{submissions.length}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600">Average Class Score:</span>
                <strong className="text-emerald-700 font-bold">
                  {submissions.length > 0
                    ? Math.round(submissions.reduce((a, b) => a + b.percent, 0) / submissions.length)
                    : 0}%
                </strong>
              </div>
            </div>

            <Link
              to="/admin/gradebook"
              className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold text-center block transition-colors shadow-2xs"
            >
              Open Class Analytics & Gradebook
            </Link>
          </div>

          {/* Old Announcements for Reactivation Hub */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0F2A4A] flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-600" />
                Notice Reactivation Hub ({oldAnnouncementsForReactivation.length})
              </h3>
              <Link
                to="/admin/notifications?filter=old_reactivation"
                className="text-xs text-purple-700 font-semibold hover:underline"
              >
                Filter
              </Link>
            </div>

            {oldAnnouncementsForReactivation.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No expired notices. All announcements are active.
              </p>
            ) : (
              <div className="space-y-3">
                {oldAnnouncementsForReactivation.slice(0, 3).map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{notif.title}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Expired on {formatAnnouncementDateTime(notif.endDate || notif.expiresAt)}
                      </span>
                    </div>
                    <Link
                      to="/admin/notifications?filter=old_reactivation"
                      className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md shrink-0 transition-colors"
                    >
                      Reactivate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reactivation Modal for Teacher */}
      {reactivationQuiz && (
        <QuizReactivationModal
          quiz={reactivationQuiz}
          classes={classes}
          isOpen={Boolean(reactivationQuiz)}
          onClose={() => setReactivationQuiz(null)}
          onUpdateQuiz={handleUpdateQuiz}
          currentUserFullName={profile?.fullName || 'Teacher'}
        />
      )}
    </div>
  );
};
