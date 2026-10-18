import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Layers,
  GraduationCap,
  BookOpen,
  FileQuestion,
  Award,
  Clock,
  ArrowRight,
  Shield,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Video,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { dataStore } from '@/src/services/dataStore';
import { toast } from 'sonner';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();

  const users = React.useMemo(() => dataStore.getUsers(), []);
  const classes = React.useMemo(() => dataStore.getClasses(), []);
  const quizzes = React.useMemo(() => dataStore.getQuizzes(), []);
  const submissions = React.useMemo(() => dataStore.getSubmissions(), []);
  const lessons = React.useMemo(() => dataStore.getLessons(), []);

  const activeStudents = users.filter((u) => u.role === 'student' && u.status === 'active').length;
  const pendingSubmissions = submissions.filter((s) => s.status === 'pending_manual');

  const stats = [
    {
      title: 'Enrolled Students',
      value: `${activeStudents} Active`,
      sub: `Across ${classes.length} Class Streams`,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
      to: '/admin/users',
    },
    {
      title: 'Classes & Streams',
      value: `${classes.length} Classes`,
      sub: `${dataStore.getLevels().length} Academic Levels`,
      icon: Layers,
      color: 'text-emerald-600 bg-emerald-50',
      to: '/admin/classes',
    },
    {
      title: 'Published Quizzes',
      value: `${quizzes.length} Quizzes`,
      sub: `${quizzes.filter((q) => q.questions.some((qu) => qu.type === 'theory')).length} with hybrid theory`,
      icon: FileQuestion,
      color: 'text-indigo-600 bg-indigo-50',
      to: '/admin/quizzes',
    },
    {
      title: 'Pending Theory Grading',
      value: `${pendingSubmissions.length} Queued`,
      sub: 'Awaiting manual teacher review',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
      to: '/admin/submissions',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F2A4A] rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
            <Shield className="w-3.5 h-3.5" /> Staff Administrator Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Academic Administration Center
          </h1>
          <p className="mt-2 text-slate-300 text-sm max-w-xl">
            Welcome, {profile?.fullName}. Full institutional sample dataset loaded ({users.length} accounts, {classes.length} classes, {quizzes.length} quizzes, {lessons.length} lessons).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              dataStore.resetToSampleData();
              toast.success('Sample database refreshed.');
              window.location.reload();
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-seed Sample Data
          </button>
          <Link
            to="/admin/lessons"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Video className="w-4 h-4" /> Video Notes & Lessons
          </Link>
          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Users className="w-4 h-4" /> Manage Directory
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Link
              key={idx}
              to={s.to}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {s.title}
                </span>
                <span className={`p-2 rounded-lg ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-[#0F2A4A] group-hover:text-emerald-600 transition-colors">
                  {s.value}
                </p>
                <span className="text-xs text-slate-500 mt-1 block">{s.sub}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Live Sample Submissions Awaiting Action */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Recent Submissions & Grading Activity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live sample submissions showing two-pass hybrid auto/manual grading records
            </p>
          </div>
          <Link
            to="/admin/submissions"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View all ({submissions.length}) &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Student</th>
                <th className="py-2.5 px-4">Quiz</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Scores</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((sub) => {
                const student = users.find((u) => u.uid === sub.userId);
                const quiz = quizzes.find((q) => q.id === sub.quizId);

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {student?.fullName || sub.userId}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{quiz?.title || sub.quizId}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fully Graded
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#0F2A4A]">{sub.totalScore}/{sub.totalPossible}</span>{' '}
                      <span className="text-slate-400">({sub.percent}%)</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to="/admin/submissions"
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-[#0F2A4A] text-white hover:bg-emerald-600 transition-colors inline-block"
                      >
                        {sub.status === 'pending_manual' ? 'Grade Theory' : 'Review'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
