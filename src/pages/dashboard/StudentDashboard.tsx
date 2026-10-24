import React, { useState, useMemo } from 'react';
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
  Video,
  Play,
  Calendar,
  Lock,
  Tag,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { dataStore } from '@/src/services/dataStore';
import { getQuizAvailability, formatQuizDateTime } from '@/src/utils/quizAvailability';
import {
  isAnnouncementVisibleForStudent,
  getAnnouncementAvailability,
  formatAnnouncementDateTime,
} from '@/src/utils/announcementAvailability';

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [readTicker, setReadTicker] = useState(0);

  const quizzes = useMemo(() => dataStore.getQuizzes(), []);
  const classes = useMemo(() => dataStore.getClasses(), []);
  const subjects = useMemo(() => dataStore.getSubjects(), []);
  const allLessons = useMemo(() => dataStore.getLessons(), []);
  const studentSubs = useMemo(() => dataStore.getSubmissionsByStudent(profile?.uid || ''), [profile?.uid]);

  const allNotifications = useMemo(() => dataStore.getNotifications(), [readTicker]);

  // Filter announcements with automated visibility based on time and student class stream
  const activeAnnouncements = useMemo(() => {
    return allNotifications.filter((n) => isAnnouncementVisibleForStudent(n, profile));
  }, [allNotifications, profile, readTicker]);

  // Filter video lessons for student's class
  const videoLessons = useMemo(() => {
    return allLessons.filter(
      (l) =>
        l.status === 'published' &&
        Boolean(l.videoUrl) &&
        (!profile?.classIds.length || l.classIds.some((cid) => profile.classIds.includes(cid)))
    );
  }, [allLessons, profile?.classIds]);

  // Filter quizzes for student's class, respecting automated disappearance & schedule visibility
  const classQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesClass =
        !profile?.classIds?.length || q.classIds?.some((cid) => profile.classIds.includes(cid));
      if (!matchesClass) return false;

      const avail = getQuizAvailability(q);
      // Automatically disappear when end date passes or closed
      if (avail.shouldDisappearFromDashboard) {
        return false;
      }
      return true;
    });
  }, [quizzes, profile?.classIds]);

  const primaryClass = useMemo(() => {
    return profile?.classIds.length ? dataStore.getClassById(profile.classIds[0]) : undefined;
  }, [profile?.classIds]);

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

      {/* Institutional Announcements & Time-Based Scheduled Notices */}
      {activeAnnouncements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
                  School Announcements
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {activeAnnouncements.length} Active
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Administrative broadcasts and notices currently scheduled for your class stream
                </p>
              </div>
            </div>
            <Link
              to="/notifications"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 w-fit"
            >
              <span>View all notices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAnnouncements.slice(0, 4).map((notif) => {
              const avail = getAnnouncementAvailability(notif);
              const isRead = dataStore.isNotificationRead(notif.id, profile?.uid);

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    notif.priority === 'high'
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            notif.priority === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {notif.priority === 'high' ? 'HIGH PRIORITY' : 'NOTICE'}
                        </span>

                        {avail.timeRemainingFormatted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-emerald-600" />
                            Closes in {avail.timeRemainingFormatted}
                          </span>
                        )}
                      </div>

                      {!isRead ? (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0"
                          title="Unread announcement"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" /> Read
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-[#0F2A4A] mb-1">{notif.title}</h3>
                    <div
                      className="text-xs text-slate-600 line-clamp-3 rich-text-content"
                      dangerouslySetInnerHTML={{ __html: notif.bodyHtml }}
                    />
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatAnnouncementDateTime(notif.startDate || notif.createdAt)}</span>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => {
                          dataStore.markNotificationAsRead(notif.id, profile?.uid);
                          setReadTicker((t: number) => t + 1);
                        }}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Featured Video Lecture Notes Section */}
      {videoLessons.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F2A4A] dark:text-slate-100 flex items-center gap-2">
                <Video className="w-5 h-5 text-red-600 fill-red-600" />
                Featured Video Lecture Notes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Teacher-curated video recordings and YouTube video lectures for your enrolled subjects
              </p>
            </div>
            <Link
              to="/lessons"
              className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all ({videoLessons.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoLessons.slice(0, 3).map((lesson) => (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-red-300 dark:hover:border-red-900/60 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                      {getSubjectName(lesson.subjectId)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                      <Play className="w-3 h-3 fill-current" /> YouTube Video
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#0F2A4A] dark:text-slate-100 group-hover:text-red-600 transition-colors line-clamp-2">
                    {lesson.videoTitle || lesson.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {lesson.title}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-red-600 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-current" /> Watch Video Note
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
              {classQuizzes.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No active assessments scheduled for your class at this time.
                </div>
              ) : (
                classQuizzes.map((quiz) => {
                  const avail = getQuizAvailability(quiz);
                  return (
                    <div
                      key={quiz.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {getSubjectName(quiz.subjectId)}
                          </span>

                          {avail.state === 'active' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-emerald-600" />
                              Closes in {avail.timeRemainingFormatted}
                            </span>
                          )}

                          {avail.state === 'scheduled' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-blue-600" />
                              Opens in {avail.timeUntilStartFormatted}
                            </span>
                          )}

                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5 text-indigo-500" />
                            {quiz.batchLabel || quiz.settings.batchLabel || 'Batch 2026/2027'}
                          </span>

                          <span className="text-xs text-slate-500">
                            {quiz.settings.timeLimitMins > 0 ? `${quiz.settings.timeLimitMins} mins` : 'Untimed'}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[#0F2A4A] mt-1.5 truncate">{quiz.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {quiz.questions.length} Questions ({quiz.totalMarks} Marks total)
                        </p>
                      </div>

                      <div className="shrink-0 ml-2">
                        {avail.isAvailableForStudent ? (
                          <Link
                            to="/quizzes"
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] text-white hover:bg-emerald-600 transition-colors inline-block text-center shadow-2xs"
                          >
                            Take Quiz
                          </Link>
                        ) : (
                          <span
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1 cursor-not-allowed"
                            title={`Quiz is scheduled to open on ${formatQuizDateTime(avail.startDate)}`}
                          >
                            <Lock className="w-3 h-3 text-slate-400" /> Opens Soon
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
