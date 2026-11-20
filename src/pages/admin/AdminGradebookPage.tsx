import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  AlertTriangle,
  Search,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { dataStore } from '@/src/services/dataStore';
import { toast } from 'sonner';
import { AcademicClass, Quiz, Submission, UserProfile } from '@/src/types';

type ErrorViewMode = 'question_type' | 'score_bands' | 'top_missed';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
}

const QuizPerformanceTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as
    | {
        fullTitle?: string;
        subjectName?: string;
        avgScore?: number;
        passRate?: number;
        highScore?: number;
        lowScore?: number;
        submissionsCount?: number;
        pendingCount?: number;
      }
    | undefined;
  if (!row) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-700 max-w-xs">
      <p className="font-bold text-[#0F2A4A] leading-snug">{row.fullTitle}</p>
      {row.subjectName && (
        <p className="text-[11px] text-slate-500 mt-0.5">{row.subjectName}</p>
      )}
      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Average Score</span>
          <span className="font-bold text-[#0F2A4A]">{row.avgScore}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Pass Rate (&ge;50%)</span>
          <span className="font-semibold text-emerald-700">{row.passRate}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Range (Low – High)</span>
          <span className="font-mono text-[11px] text-slate-700">
            {row.lowScore}% – {row.highScore}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Submissions</span>
          <span className="font-semibold text-slate-800">
            {row.submissionsCount}
            {row.pendingCount ? ` (${row.pendingCount} pending theory)` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

const ErrorBreakdownTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const raw = payload[0]?.payload as Record<string, unknown> | undefined;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-700 max-w-xs">
      <p className="font-bold text-[#0F2A4A]">{String(raw?.fullLabel || label || '')}</p>
      {typeof raw?.subtitle === 'string' && raw.subtitle && (
        <p className="text-[11px] text-slate-500 mt-0.5">{raw.subtitle}</p>
      )}
      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 tabular-nums">
        {payload.map((entry) => (
          <div key={String(entry.dataKey || entry.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ backgroundColor: entry.color || '#64748b' }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-semibold text-slate-900">
              {entry.value}
              {raw?.unit === '%' ? '%' : ''}
            </span>
          </div>
        ))}
        {typeof raw?.totalItems === 'number' && (
          <div className="pt-1 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Total Evaluated Items</span>
            <span className="font-mono font-semibold">{raw.totalItems}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const TrendTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as
    | {
        dateLabel?: string;
        quizTitle?: string;
        studentName?: string;
        percent?: number;
        status?: string;
      }
    | undefined;
  if (!row) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-700 max-w-xs">
      <p className="font-bold text-[#0F2A4A]">{row.quizTitle}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">
        {row.studentName} · {row.dateLabel}
      </p>
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-4 tabular-nums">
        <span className="text-slate-500">Score Achieved</span>
        <span className="font-bold text-[#0F2A4A]">{row.percent}%</span>
      </div>
    </div>
  );
};

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateLabel(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export const AdminGradebookPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(() =>
    dataStore.getUsers().filter((u) => u.role === 'student')
  );
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => dataStore.getQuizzes());
  const [submissions, setSubmissions] = useState<Submission[]>(() => dataStore.getSubmissions());
  const [classes, setClasses] = useState<AcademicClass[]>(() => dataStore.getClasses());
  const [subjects, setSubjects] = useState(() => dataStore.getSubjects());

  useEffect(() => {
    const syncAll = () => {
      setUsers(dataStore.getUsers().filter((u) => u.role === 'student'));
      setQuizzes(dataStore.getQuizzes());
      setSubmissions(dataStore.getSubmissions());
      setClasses(dataStore.getClasses());
      setSubjects(dataStore.getSubjects());
    };
    window.addEventListener('eduform_users_updated', syncAll);
    window.addEventListener('eduform_quizzes_updated', syncAll);
    window.addEventListener('eduform_submissions_updated', syncAll);
    window.addEventListener('eduform_classes_updated', syncAll);
    window.addEventListener('eduform_subjects_updated', syncAll);
    return () => {
      window.removeEventListener('eduform_users_updated', syncAll);
      window.removeEventListener('eduform_quizzes_updated', syncAll);
      window.removeEventListener('eduform_submissions_updated', syncAll);
      window.removeEventListener('eduform_classes_updated', syncAll);
      window.removeEventListener('eduform_subjects_updated', syncAll);
    };
  }, []);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorViewMode, setErrorViewMode] = useState<ErrorViewMode>('question_type');
  const [showDashboard, setShowDashboard] = useState<boolean>(true);

  const getScore = (studentId: string, quizId: string) => {
    return submissions.find((s) => s.userId === studentId && s.quizId === quizId);
  };

  const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || cid;
  const getSubjectName = (sid: string) => subjects.find((s) => s.id === sid)?.name || sid;

  // Filter students
  const filteredStudents = useMemo(() => {
    return users.filter((u) => {
      if (selectedClassId !== 'all' && !u.classIds.includes(selectedClassId)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = u.fullName.toLowerCase().includes(q);
        const userMatch = u.username.toLowerCase().includes(q);
        return nameMatch || userMatch;
      }
      return true;
    });
  }, [users, selectedClassId, searchQuery]);

  // Filter quizzes for display
  const displayedQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (selectedQuizId !== 'all' && q.id !== selectedQuizId) {
        return false;
      }
      if (
        selectedClassId !== 'all' &&
        q.classIds.length > 0 &&
        !q.classIds.includes(selectedClassId)
      ) {
        return false;
      }
      return true;
    });
  }, [quizzes, selectedQuizId, selectedClassId]);

  // Filtered submissions matching selected class, quiz, and student search
  const filteredSubmissions = useMemo(() => {
    const studentIds = new Set(filteredStudents.map((s) => s.uid));
    const quizIds = new Set(displayedQuizzes.map((q) => q.id));
    return submissions.filter(
      (sub) =>
        studentIds.has(sub.userId) &&
        quizIds.has(sub.quizId) &&
        (selectedClassId === 'all' || sub.classId === selectedClassId || studentIds.has(sub.userId))
    );
  }, [submissions, filteredStudents, displayedQuizzes, selectedClassId]);

  // Analytics KPIs
  const analyticsSummary = useMemo(() => {
    const totalSubs = filteredSubmissions.length;
    if (totalSubs === 0) {
      return {
        avgPercent: 0,
        passRate: 0,
        totalSubmissions: 0,
        pendingCount: 0,
        itemErrorRate: 0,
        totalQuestionsEvaluated: 0,
      };
    }

    const totalPercent = filteredSubmissions.reduce((acc, s) => acc + (s.percent || 0), 0);
    const passedCount = filteredSubmissions.filter((s) => {
      const quiz = quizzes.find((q) => q.id === s.quizId);
      const passMark = quiz?.settings?.passMarkPercent ?? 50;
      return s.percent >= passMark;
    }).length;
    const pendingCount = filteredSubmissions.filter((s) => s.status === 'pending_manual').length;

    let totalItems = 0;
    let errorOrPartialItems = 0;

    filteredSubmissions.forEach((sub) => {
      const quiz = quizzes.find((q) => q.id === sub.quizId);
      sub.answers.forEach((ans) => {
        const qDef = quiz?.questions.find((q) => q.id === ans.questionId);
        const maxMarks = qDef?.marks ?? 5;
        if (qDef?.type === 'theory' && ans.manualMarks === null) {
          return; // Pending manual review; don't classify as error yet
        }
        totalItems++;
        const earned =
          qDef?.type === 'theory'
            ? ans.manualMarks ?? 0
            : ans.autoMarks ?? 0;
        if (ans.isCorrect === false || earned < maxMarks) {
          errorOrPartialItems++;
        }
      });
    });

    return {
      avgPercent: Math.round((totalPercent / totalSubs) * 10) / 10,
      passRate: Math.round((passedCount / totalSubs) * 100),
      totalSubmissions: totalSubs,
      pendingCount,
      itemErrorRate: totalItems > 0 ? Math.round((errorOrPartialItems / totalItems) * 100) : 0,
      totalQuestionsEvaluated: totalItems,
    };
  }, [filteredSubmissions, quizzes]);

  // Chart 1 Data: Average Scores & Pass Rate per Quiz
  const quizPerformanceData = useMemo(() => {
    return displayedQuizzes
      .map((quiz) => {
        const quizSubs = filteredSubmissions.filter((s) => s.quizId === quiz.id);
        const count = quizSubs.length;
        const avgScore =
          count > 0
            ? Math.round((quizSubs.reduce((sum, s) => sum + s.percent, 0) / count) * 10) / 10
            : 0;
        const passThreshold = quiz.settings?.passMarkPercent ?? 50;
        const passCount = quizSubs.filter((s) => s.percent >= passThreshold).length;
        const passRate = count > 0 ? Math.round((passCount / count) * 100) : 0;
        const highScore = count > 0 ? Math.max(...quizSubs.map((s) => s.percent)) : 0;
        const lowScore = count > 0 ? Math.min(...quizSubs.map((s) => s.percent)) : 0;
        const pendingCount = quizSubs.filter((s) => s.status === 'pending_manual').length;

        return {
          quizId: quiz.id,
          name: truncateLabel(quiz.title, 20),
          fullTitle: quiz.title,
          subjectName: getSubjectName(quiz.subjectId),
          avgScore,
          passRate,
          highScore,
          lowScore,
          submissionsCount: count,
          pendingCount,
        };
      })
      .filter((row) => row.submissionsCount > 0 || selectedQuizId !== 'all');
  }, [displayedQuizzes, filteredSubmissions, selectedQuizId, subjects]);

  // Chart 2A Data: Common Error & Mastery Distribution by Question Type
  const errorByQuestionTypeData = useMemo(() => {
    const buckets: Record<
      string,
      {
        label: string;
        incorrect: number;
        partial: number;
        pending: number;
        correct: number;
        total: number;
      }
    > = {
      single_choice: { label: 'Multiple Choice', incorrect: 0, partial: 0, pending: 0, correct: 0, total: 0 },
      true_false: { label: 'True / False', incorrect: 0, partial: 0, pending: 0, correct: 0, total: 0 },
      short_text: { label: 'Short Text', incorrect: 0, partial: 0, pending: 0, correct: 0, total: 0 },
      theory: { label: 'Theory / Essay', incorrect: 0, partial: 0, pending: 0, correct: 0, total: 0 },
    };

    filteredSubmissions.forEach((sub) => {
      const quiz = quizzes.find((q) => q.id === sub.quizId);
      if (!quiz) return;

      quiz.questions.forEach((qDef) => {
        const key = qDef.type === 'multiple_select' ? 'single_choice' : qDef.type;
        const bucket = buckets[key] || buckets.single_choice;
        const ans = sub.answers.find((a) => a.questionId === qDef.id);
        bucket.total++;

        if (!ans) {
          bucket.incorrect++;
          return;
        }

        if (qDef.type === 'theory') {
          if (ans.manualMarks === null || ans.manualMarks === undefined) {
            bucket.pending++;
          } else if (ans.manualMarks === 0) {
            bucket.incorrect++;
          } else if (ans.manualMarks < qDef.marks) {
            bucket.partial++;
          } else {
            bucket.correct++;
          }
          return;
        }

        const earned = ans.autoMarks ?? 0;
        if (ans.isCorrect === false || earned === 0) {
          bucket.incorrect++;
        } else if (earned < qDef.marks) {
          bucket.partial++;
        } else {
          bucket.correct++;
        }
      });
    });

    return Object.values(buckets)
      .filter((b) => b.total > 0)
      .map((b) => ({
        name: b.label,
        fullLabel: `${b.label} Items`,
        'Incorrect / Missed': b.incorrect,
        'Partial Credit': b.partial,
        'Pending Review': b.pending,
        'Full Marks': b.correct,
        totalItems: b.total,
      }));
  }, [filteredSubmissions, quizzes]);

  // Chart 2B Data: Score Band Distribution (Cohort Error Severity)
  const scoreBandData = useMemo(() => {
    const bands = [
      { name: '0–49%', fullLabel: 'Below Pass Mark (0–49%)', count: 0, color: '#DC2626' },
      { name: '50–69%', fullLabel: 'Developing (50–69%)', count: 0, color: '#D97706' },
      { name: '70–84%', fullLabel: 'Proficient (70–84%)', count: 0, color: '#2563EB' },
      { name: '85–100%', fullLabel: 'Distinction (85–100%)', count: 0, color: '#10B981' },
    ];

    filteredSubmissions.forEach((sub) => {
      if (sub.percent < 50) bands[0].count++;
      else if (sub.percent < 70) bands[1].count++;
      else if (sub.percent < 85) bands[2].count++;
      else bands[3].count++;
    });

    return bands.map((b) => ({
      name: b.name,
      fullLabel: b.fullLabel,
      Students: b.count,
      color: b.color,
      totalItems: filteredSubmissions.length,
    }));
  }, [filteredSubmissions]);

  // Chart 2C Data: Highest Mark-Loss / Most Challenging Questions
  const mostMissedQuestionsData = useMemo(() => {
    const questionStats = new Map<
      string,
      {
        questionId: string;
        quizTitle: string;
        prompt: string;
        attempts: number;
        lossPercentSum: number;
        errorCount: number;
      }
    >();

    filteredSubmissions.forEach((sub) => {
      const quiz = quizzes.find((q) => q.id === sub.quizId);
      if (!quiz) return;

      quiz.questions.forEach((qDef) => {
        const ans = sub.answers.find((a) => a.questionId === qDef.id);
        if (qDef.type === 'theory' && (ans?.manualMarks === null || ans?.manualMarks === undefined)) {
          return;
        }
        const earned =
          qDef.type === 'theory'
            ? ans?.manualMarks ?? 0
            : ans?.autoMarks ?? 0;
        const maxMarks = qDef.marks || 1;
        const lossPct = Math.max(0, Math.round(((maxMarks - earned) / maxMarks) * 100));
        const key = `${quiz.id}::${qDef.id}`;
        const existing = questionStats.get(key) || {
          questionId: qDef.id,
          quizTitle: quiz.title,
          prompt: stripHtmlTags(qDef.promptHtml),
          attempts: 0,
          lossPercentSum: 0,
          errorCount: 0,
        };
        existing.attempts++;
        existing.lossPercentSum += lossPct;
        if (earned < maxMarks) {
          existing.errorCount++;
        }
        questionStats.set(key, existing);
      });
    });

    return Array.from(questionStats.values())
      .map((item) => ({
        name: truncateLabel(item.prompt, 22),
        fullLabel: item.prompt,
        subtitle: `${item.quizTitle} (${item.attempts} attempt${item.attempts === 1 ? '' : 's'})`,
        'Avg Mark Loss': Math.round(item.lossPercentSum / Math.max(1, item.attempts)),
        'Error Frequency': Math.round((item.errorCount / Math.max(1, item.attempts)) * 100),
        unit: '%',
        totalItems: item.attempts,
      }))
      .sort((a, b) => b['Avg Mark Loss'] - a['Avg Mark Loss'] || b['Error Frequency'] - a['Error Frequency'])
      .slice(0, 6);
  }, [filteredSubmissions, quizzes]);

  // Chronological Trend Data
  const chronologicalTrendData = useMemo(() => {
    return [...filteredSubmissions]
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      .map((sub) => {
        const quiz = quizzes.find((q) => q.id === sub.quizId);
        const student = users.find((u) => u.uid === sub.userId);
        const d = new Date(sub.submittedAt);
        const dateLabel = Number.isNaN(d.getTime())
          ? sub.submittedAt
          : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return {
          id: sub.id,
          dateLabel,
          quizTitle: quiz?.title || sub.quizId,
          studentName: student?.fullName || sub.userId,
          percent: sub.percent,
          status: sub.status,
        };
      });
  }, [filteredSubmissions, quizzes, users]);

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Username', 'Class', ...displayedQuizzes.map((q) => q.title)];
    const rows = filteredStudents.map((u) => {
      const cls = u.classIds.length > 0 ? getClassName(u.classIds[0]) : 'None';
      const scores = displayedQuizzes.map((q) => {
        const sub = getScore(u.uid, q.id);
        return sub ? `${sub.percent}%` : 'N/A';
      });
      return [u.fullName, u.username, cls, ...scores];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'EduForm_Class_Gradebook.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Gradebook exported to CSV successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600 shrink-0" />
            <span>Class Gradebook &amp; Performance Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualize class-wide quiz score trends, error distributions, and full cohort mastery across assessments (Pass mark: 50%)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowDashboard((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showDashboard ? 'Hide Charts' : 'Show Charts'}</span>
            {showDashboard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Class Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Filter by Class Stream
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
          >
            <option value="all">All Classes ({classes.length} Streams)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quiz Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Filter Assessment Columns
          </label>
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
          >
            <option value="all">All Quizzes ({quizzes.length} Columns)</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </div>

        {/* Student Search */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Search Student
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
            />
          </div>
        </div>
      </div>

      {/* Recharts Performance Dashboard */}
      {showDashboard && (
        <div className="space-y-4">
          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Class Average Score</span>
                <TrendingUp className="w-4 h-4 text-[#0F2A4A]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">
                {analyticsSummary.avgPercent}%
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                Across {analyticsSummary.totalSubmissions} submission{analyticsSummary.totalSubmissions === 1 ? '' : 's'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Cohort Pass Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">
                {analyticsSummary.passRate}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Benchmark &ge; 50% score threshold
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Item Miss &amp; Partial Rate</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">
                {analyticsSummary.itemErrorRate}%
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                From {analyticsSummary.totalQuestionsEvaluated} graded question items
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Pending Theory Review</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0F2A4A] tabular-nums">
                {analyticsSummary.pendingCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Submissions awaiting manual rubric
              </p>
            </div>
          </div>

          {/* Primary 2-Column Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left Chart: Average Scores & Pass Rate per Quiz */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#0F2A4A] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Average Scores &amp; Pass Rate per Quiz</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compares class average percentage against pass rate and the 50% passing benchmark
                  </p>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                  {quizPerformanceData.length} assessment{quizPerformanceData.length === 1 ? '' : 's'}
                </span>
              </div>

              {quizPerformanceData.length === 0 ? (
                <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-6">
                  <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No quiz submission data for current filter</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select another class stream or quiz to inspect average performance.
                  </p>
                </div>
              ) : (
                <div className="mt-4 h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={quizPerformanceData}
                      margin={{ top: 12, right: 16, left: -12, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#475569' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<QuizPerformanceTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <ReferenceLine
                        y={50}
                        stroke="#D97706"
                        strokeDasharray="4 4"
                        label={{
                          value: 'Pass 50%',
                          position: 'insideTopRight',
                          fill: '#B45309',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                      <Bar
                        dataKey="avgScore"
                        name="Average Score (%)"
                        fill="#0F2A4A"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={42}
                      />
                      <Bar
                        dataKey="passRate"
                        name="Pass Rate (%)"
                        fill="#10B981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={42}
                      />
                      <Line
                        type="monotone"
                        dataKey="highScore"
                        name="Top Score (%)"
                        stroke="#2563EB"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Right Chart: Common Error Distributions */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
              <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-[#0F2A4A] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Common Error Distributions</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Inspect missed items, partial credit, score bands, and hardest questions
                    </p>
                  </div>
                </div>

                {/* Segmented Interactive Mode Switch */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setErrorViewMode('question_type')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      errorViewMode === 'question_type'
                        ? 'bg-white text-[#0F2A4A] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Question Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setErrorViewMode('score_bands')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      errorViewMode === 'score_bands'
                        ? 'bg-white text-[#0F2A4A] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Score Bands
                  </button>
                  <button
                    type="button"
                    onClick={() => setErrorViewMode('top_missed')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      errorViewMode === 'top_missed'
                        ? 'bg-white text-[#0F2A4A] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hardest Items
                  </button>
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-6">
                  <AlertTriangle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No error distribution data available</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Results will appear once students submit assessments in this filter scope.
                  </p>
                </div>
              ) : (
                <div className="mt-4 h-[265px] w-full min-w-0">
                  {errorViewMode === 'question_type' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={errorByQuestionTypeData}
                        margin={{ top: 8, right: 12, left: -18, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#475569' }}
                          axisLine={{ stroke: '#cbd5e1' }}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ErrorBreakdownTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                        <Bar dataKey="Incorrect / Missed" stackId="a" fill="#DC2626" maxBarSize={38} />
                        <Bar dataKey="Partial Credit" stackId="a" fill="#D97706" maxBarSize={38} />
                        <Bar dataKey="Pending Review" stackId="a" fill="#6366F1" maxBarSize={38} />
                        <Bar
                          dataKey="Full Marks"
                          stackId="a"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={38}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {errorViewMode === 'score_bands' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={scoreBandData}
                        margin={{ top: 8, right: 12, left: -18, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#475569' }}
                          axisLine={{ stroke: '#cbd5e1' }}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ErrorBreakdownTooltip />} />
                        <Bar dataKey="Students" radius={[6, 6, 0, 0]} maxBarSize={46}>
                          {scoreBandData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {errorViewMode === 'top_missed' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mostMissedQuestionsData}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={{ stroke: '#cbd5e1' }}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 10, fill: '#334155' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ErrorBreakdownTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                        <Bar
                          dataKey="Avg Mark Loss"
                          fill="#DC2626"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={18}
                        />
                        <Bar
                          dataKey="Error Frequency"
                          fill="#D97706"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={18}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Secondary Row: Chronological Submission Score Trend */}
          {chronologicalTrendData.length > 1 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#0F2A4A] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Chronological Submission Score Trend</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tracks student assessment percentages over submission dates across the selected cohort
                  </p>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                  {chronologicalTrendData.length} timeline points
                </span>
              </div>

              <div className="mt-4 h-[210px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chronologicalTrendData}
                    margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="scoreTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <ReferenceLine y={50} stroke="#D97706" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="percent"
                      name="Score (%)"
                      stroke="#10B981"
                      strokeWidth={2.2}
                      fill="url(#scoreTrendFill)"
                      dot={{ r: 4, fill: '#0F2A4A', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gradebook Table Container (No horizontal scrollbar, wrapped labels) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-1/4 sm:w-1/5 whitespace-normal break-words align-top">
                  <span className="block text-slate-900 font-bold">Student Name</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase block">
                    (Username)
                  </span>
                </th>
                <th className="py-3 px-3 w-1/5 sm:w-1/6 whitespace-normal break-words align-top">
                  Class
                </th>
                {displayedQuizzes.map((q) => (
                  <th
                    key={q.id}
                    className="py-3 px-3 whitespace-normal break-words align-top border-l border-slate-200/60"
                  >
                    <span className="block font-bold text-slate-800 leading-snug break-words whitespace-normal">
                      {q.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase block mt-0.5 tabular-nums">
                      ({q.totalMarks} marks max)
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + displayedQuizzes.length}
                    className="py-8 text-center text-xs text-slate-400"
                  >
                    No students match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const primaryClass =
                    student.classIds.length > 0 ? getClassName(student.classIds[0]) : 'Unassigned';

                  return (
                    <tr key={student.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 align-top whitespace-normal break-words">
                        <span className="font-bold text-slate-900 block leading-snug break-words">
                          {student.fullName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block break-words">
                          @{student.username}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top whitespace-normal break-words">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 break-words max-w-full">
                          {primaryClass}
                        </span>
                      </td>

                      {displayedQuizzes.map((quiz) => {
                        const sub = getScore(student.uid, quiz.id);

                        if (!sub) {
                          return (
                            <td
                              key={quiz.id}
                              className="py-3 px-3 align-top text-slate-500 dark:text-slate-400 italic whitespace-normal break-words border-l border-slate-100 dark:border-slate-800"
                            >
                              <span className="text-[11px] font-medium">Not taken</span>
                            </td>
                          );
                        }

                        const isPassed = sub.percent >= 50;

                        return (
                          <td
                            key={quiz.id}
                            className="py-3 px-3 align-top whitespace-normal break-words border-l border-slate-100"
                          >
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-bold leading-none break-words tabular-nums ${
                                  sub.status === 'pending_manual'
                                    ? 'bg-amber-100 text-amber-800'
                                    : isPassed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {sub.percent}%
                                <span className="text-[10px] font-normal block mt-0.5">
                                  {sub.totalScore}/{sub.totalPossible}
                                </span>
                              </span>
                              {sub.status === 'pending_manual' && (
                                <span className="text-[10px] text-amber-600 font-semibold block">
                                  *Theory
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

