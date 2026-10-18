import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileQuestion,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { dataStore } from '@/src/services/dataStore';

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();

  const quizzes = dataStore.getQuizzes();
  const classes = dataStore.getClasses();
  const subjects = dataStore.getSubjects();
  const studentSubs = dataStore.getSubmissionsByStudent(profile?.uid || '');

  // Filter quizzes for student's class
  const classQuizzes = quizzes.filter(
    (q) =>
      q.status === 'published' &&
      (!profile?.classIds.length || q.classIds.some((cid) => profile.classIds.includes(cid)))
  );

  const primaryClass = profile?.classIds.length
    ? dataStore.getClassById(profile.classIds[0])
    : undefined;

  const pendingCount = studentSubs.filter((s) => s.status === 'pending_manual').length;

  const avgPercent =
    studentSubs.length > 0
      ? Math.round(
          studentSubs.reduce((acc, s) => acc + s.percent, 0) / studentSubs.length
        )
      : 0;

  const getSubjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || subjId;
  const getQuizTitle = (quizId: string) => quizzes.find((q) => q.id === quizId)?.title || quizId;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0F2A4A] to-[#1E3A5F] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled & Active Account
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Welcome back, {profile?.fullName}!
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Review your published class lessons, complete assigned test quizzes with instant
            auto-grading, and track your academic progress across your enrolled subjects.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/quizzes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <FileQuestion className="w-4 h-4" /> Start Active Quiz
            </Link>
            <Link
              to="/lessons"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Open Lesson Library
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolled Class
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-[#0F2A4A] mt-2">
            {primaryClass ? primaryClass.name : 'General Stream'}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Level: Junior Secondary</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Quizzes
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileQuestion className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2">{classQuizzes.length} Active</p>
          <span className="text-xs text-slate-500 mt-1 block">Assigned to your stream</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Score
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-[#0F2A4A] mt-2">
            {studentSubs.length > 0 ? `${avgPercent}%` : 'N/A'}
          </p>
          <Link
            to="/results"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold mt-1 flex items-center gap-1 cursor-pointer"
          >
            <span>{studentSubs.length} completed • View Charts</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Theory
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-amber-600 mt-2">{pendingCount} Submissions</p>
          <span className="text-xs text-slate-500 mt-1 block">Teacher grading in queue</span>
        </div>
      </div>

      {/* Two Column Layout: Assigned Quizzes & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Quizzes Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-emerald-500" />
                Assigned Quizzes for Your Class
              </h2>
              <Link to="/quizzes" className="text-xs text-emerald-600 font-semibold hover:underline">
                View all ({classQuizzes.length})
              </Link>
            </div>

            <div className="space-y-3">
              {classQuizzes.map((quiz) => {
                return (
                  <div
                    key={quiz.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {getSubjectName(quiz.subjectId)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {quiz.settings.timeLimitMins > 0 ? `${quiz.settings.timeLimitMins} mins` : 'Untimed'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0F2A4A] mt-1">{quiz.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {quiz.questions.length} Questions ({quiz.totalMarks} Marks total)
                      </p>
                    </div>
                    <Link
                      to="/quizzes"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] text-white hover:bg-emerald-600 transition-colors shrink-0 ml-3"
                    >
                      Open
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Pass mark configured at 50%</span>
            <span className="text-emerald-600 font-medium">Instant score upon submit</span>
          </div>
        </div>

        {/* Recent Results & Theory grading status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Recent Submissions & Grades
              </h2>
              <Link to="/results" className="text-xs text-emerald-600 font-semibold hover:underline">
                View all results ({studentSubs.length})
              </Link>
            </div>

            <div className="space-y-3">
              {studentSubs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No submissions yet. Take your first quiz!
                </div>
              ) : (
                studentSubs.map((sub) => {
                  const isPending = sub.status === 'pending_manual';
                  return (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-lg border ${
                        isPending ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/40'
                      } flex items-center justify-between`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPending
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isPending ? 'Pending Manual Grading' : 'Fully Graded • Passed'}
                          </span>
                          <span className="text-xs text-slate-500">Attempt #{sub.attemptNumber}</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#0F2A4A] mt-1">
                          {getQuizTitle(sub.quizId)}
                        </h3>
                        <p
                          className={`text-xs mt-0.5 font-medium ${
                            isPending ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {isPending
                            ? `Auto-graded: ${sub.autoScore}/${sub.autoTotal}. Theory questions queued.`
                            : `Final Score: ${sub.totalScore} / ${sub.totalPossible} (${sub.percent}%)`}
                        </p>
                      </div>
                      <Link
                        to="/results"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shrink-0 ml-3"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/lessons"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F2A4A] hover:text-emerald-600"
            >
              Browse all class lecture notes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
