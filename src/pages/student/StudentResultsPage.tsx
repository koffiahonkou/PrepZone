import React, { useState, useMemo } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  Filter,
  Sparkles,
  Target,
  BookOpen,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';
import { useColorMode } from '@/src/context/ColorModeContext';
import { Submission, Quiz } from '@/src/types';

interface CategoryDef {
  id: string;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export function getSubjectCategory(subjNameOrId: string): CategoryDef {
  const lower = (subjNameOrId || '').toLowerCase();
  if (lower.includes('math') || lower.includes('mth') || lower.includes('algebra') || lower.includes('arithmetic')) {
    return {
      id: 'math',
      name: 'STEM & Mathematics',
      color: '#3B82F6',
      badgeBg: 'rgba(59, 130, 246, 0.12)',
      badgeText: '#2563EB',
    };
  }
  if (lower.includes('sci') || lower.includes('bio') || lower.includes('chem') || lower.includes('phys')) {
    return {
      id: 'science',
      name: 'Natural Sciences',
      color: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      badgeText: '#059669',
    };
  }
  if (lower.includes('eng') || lower.includes('language') || lower.includes('lit') || lower.includes('french')) {
    return {
      id: 'humanities',
      name: 'Languages & Humanities',
      color: '#8B5CF6',
      badgeBg: 'rgba(139, 92, 246, 0.12)',
      badgeText: '#7C3AED',
    };
  }
  if (lower.includes('comp') || lower.includes('csc') || lower.includes('ict')) {
    return {
      id: 'computing',
      name: 'Computing & Technology',
      color: '#06B6D4',
      badgeBg: 'rgba(6, 182, 212, 0.12)',
      badgeText: '#0891B2',
    };
  }
  if (lower.includes('tec') || lower.includes('technical') || lower.includes('vocational') || lower.includes('craft')) {
    return {
      id: 'technical',
      name: 'Applied Technology',
      color: '#F59E0B',
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      badgeText: '#D97706',
    };
  }
  if (lower.includes('soc') || lower.includes('civic') || lower.includes('hist') || lower.includes('gov') || lower.includes('geo')) {
    return {
      id: 'social',
      name: 'Social & Civic Studies',
      color: '#EC4899',
      badgeBg: 'rgba(236, 72, 153, 0.12)',
      badgeText: '#DB2777',
    };
  }
  return {
    id: 'general',
    name: 'General Studies',
    color: '#64748B',
    badgeBg: 'rgba(100, 116, 139, 0.12)',
    badgeText: '#475569',
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      assessment: string;
      category: string;
      date: string;
      fullDate: string;
      score: number;
      passed: boolean;
      totalScore: number;
      totalPossible: number;
      categoryColor: string;
    };
  }>;
  isNight?: boolean;
}

const CustomProgressTooltip: React.FC<CustomTooltipProps> = ({ active, payload, isNight }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div
      className={`p-3.5 rounded-xl border shadow-xl text-xs space-y-1.5 min-w-[220px] transition-all ${
        isNight
          ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/60'
          : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/20'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-slate-200/50 dark:border-slate-700/50">
        <span
          className="font-bold text-[11px] px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: data.categoryColor ? `${data.categoryColor}20` : '#e2e8f0',
            color: data.categoryColor || '#334155',
          }}
        >
          {data.category}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">{data.date}</span>
      </div>

      <p className="font-bold text-sm leading-tight text-slate-900 dark:text-white mt-1">
        {data.assessment}
      </p>

      <div className="flex items-center justify-between pt-1">
        <span className="text-slate-500 dark:text-slate-400">Score Achieved:</span>
        <span className="font-extrabold text-base text-[#0F2A4A] dark:text-emerald-400">
          {data.score}%
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Raw Marks:</span>
        <span className="font-medium">
          {data.totalScore} / {data.totalPossible}
        </span>
      </div>

      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
            data.passed
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          {data.passed ? 'Benchmark Passed' : 'Below 50% Benchmark'}
        </span>
      </div>
    </div>
  );
};

export const StudentResultsPage: React.FC = () => {
  const { profile } = useAuth();
  const { isNight } = useColorMode();
  const submissions = dataStore.getSubmissions();
  const quizzes = dataStore.getQuizzes();
  const subjects = dataStore.getSubjects();

  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [chartViewMode, setChartViewMode] = useState<'timeline' | 'categories'>('timeline');

  // Student submissions sorted chronologically (oldest to newest for trend line)
  const studentSubs = useMemo(() => {
    return submissions
      .filter((s) => s.userId === profile?.uid)
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }, [submissions, profile?.uid]);

  const getQuiz = (qid: string): Quiz | undefined => quizzes.find((q) => q.id === qid);
  const getSubject = (subjId: string): string => subjects.find((s) => s.id === subjId)?.name || subjId;

  // Process data for trend chart
  const { timelineData, categorySummary, availableCategories, metrics } = useMemo(() => {
    const timePoints = studentSubs.map((sub, index) => {
      const quiz = getQuiz(sub.quizId);
      const subjName = quiz ? getSubject(quiz.subjectId) : 'General Assessment';
      const cat = getSubjectCategory(subjName);
      const dateObj = new Date(sub.submittedAt);
      const dateFormatted = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const passMark = quiz?.settings?.passMarkPercent || 50;

      return {
        id: sub.id,
        index: index + 1,
        date: dateFormatted,
        fullDate: dateObj.toLocaleString(),
        assessment: quiz?.title || `Quiz #${index + 1}`,
        subject: subjName,
        category: cat.name,
        categoryId: cat.id,
        categoryColor: cat.color,
        score: sub.percent,
        totalScore: sub.totalScore,
        totalPossible: sub.totalPossible,
        passed: sub.percent >= passMark,
        passMark,
        // Dynamic key for category-specific line coloring
        [cat.id]: sub.percent,
      };
    });

    // Extract unique categories represented
    const categoriesMap = new Map<string, CategoryDef>();
    studentSubs.forEach((sub) => {
      const quiz = getQuiz(sub.quizId);
      const subjName = quiz ? getSubject(quiz.subjectId) : 'General';
      const cat = getSubjectCategory(subjName);
      if (!categoriesMap.has(cat.id)) {
        categoriesMap.set(cat.id, cat);
      }
    });

    const categoryList = Array.from(categoriesMap.values());

    // Compute Category Averages & Summary for Bar Chart
    const catSummary = categoryList.map((cat) => {
      const catSubs = timePoints.filter((tp) => tp.categoryId === cat.id);
      const avg = catSubs.length
        ? Math.round(catSubs.reduce((acc, curr) => acc + curr.score, 0) / catSubs.length)
        : 0;
      const highest = catSubs.length ? Math.max(...catSubs.map((c) => c.score)) : 0;
      const lowest = catSubs.length ? Math.min(...catSubs.map((c) => c.score)) : 0;
      const passedCount = catSubs.filter((c) => c.passed).length;

      return {
        categoryId: cat.id,
        category: cat.name,
        shortName: cat.name.split('&')[0].trim(),
        average: avg,
        highest,
        lowest,
        totalQuizzes: catSubs.length,
        passedCount,
        passRate: catSubs.length ? Math.round((passedCount / catSubs.length) * 100) : 0,
        color: cat.color,
      };
    });

    // High level metrics
    const totalCount = studentSubs.length;
    const overallAvg = totalCount
      ? Math.round(studentSubs.reduce((acc, s) => acc + s.percent, 0) / totalCount)
      : 0;
    const totalPassed = studentSubs.filter((s) => s.percent >= 50).length;
    const overallPassRate = totalCount ? Math.round((totalPassed / totalCount) * 100) : 0;

    // Best performing category
    let bestCatName = 'None';
    let bestCatAvg = 0;
    catSummary.forEach((cs) => {
      if (cs.average > bestCatAvg) {
        bestCatAvg = cs.average;
        bestCatName = cs.category;
      }
    });

    return {
      timelineData: timePoints,
      categorySummary: catSummary,
      availableCategories: categoryList,
      metrics: {
        totalCount,
        overallAvg,
        overallPassRate,
        bestCatName,
        bestCatAvg,
      },
    };
  }, [studentSubs, quizzes, subjects]);

  // Filtered timeline data based on selected category tab
  const filteredTimelineData = useMemo(() => {
    if (activeCategoryFilter === 'all') return timelineData;
    return timelineData.filter((tp) => tp.categoryId === activeCategoryFilter);
  }, [timelineData, activeCategoryFilter]);

  if (selectedSub) {
    const quiz = getQuiz(selectedSub.quizId);
    const isPending = selectedSub.status === 'pending_manual';
    const isPassed = selectedSub.percent >= (quiz?.settings?.passMarkPercent || 50);
    const subjName = quiz ? getSubject(quiz.subjectId) : 'Assessment';
    const cat = getSubjectCategory(subjName);

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelectedSub(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Progress Trends & Results
        </button>

        {/* Hero Score Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  {subjName}
                </span>
                <span
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                >
                  {cat.name}
                </span>
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] dark:text-white mt-2">
                {quiz?.title || 'Quiz Result'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Submitted on {new Date(selectedSub.submittedAt).toLocaleString()} • Attempt #{selectedSub.attemptNumber}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-4xl font-extrabold text-[#0F2A4A] dark:text-emerald-400 block">
                  {selectedSub.percent}%
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedSub.totalScore} / {selectedSub.totalPossible} Total Marks
                </span>
              </div>

              <div className="text-left">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    isPassed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {isPassed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Passed (≥50%)
                    </>
                  ) : (
                    'Failed (<50%)'
                  )}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Auto: {selectedSub.autoScore}/{selectedSub.autoTotal} • Manual: {selectedSub.manualScore}/{selectedSub.manualTotal}
                </span>
              </div>
            </div>
          </div>

          {/* Pending Theory Banner */}
          {isPending && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Theory Questions Awaiting Manual Grading</p>
                <p className="mt-0.5">
                  Theory questions in this submission have been queued for your instructor. Your final score and percentage may increase once grading is finalized.
                </p>
              </div>
            </div>
          )}

          {/* Questions & Feedback Breakdown */}
          <div className="mt-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Question-by-Question Review:
            </h3>

            {selectedSub.answers.map((ans, idx) => {
              const q = quiz?.questions.find((x) => x.id === ans.questionId);
              const isTheory = q?.type === 'theory';

              return (
                <div
                  key={ans.questionId}
                  className={`p-4 rounded-xl border ${
                    isTheory
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#0F2A4A] dark:text-slate-200">
                      Question {idx + 1}: {q?.type?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-300">
                      Marks Awarded: {ans.manualMarks !== null ? ans.manualMarks : ans.autoMarks} / {q?.marks}
                    </span>
                  </div>

                  <div
                    className="text-xs text-slate-700 dark:text-slate-300 mb-3 rich-text-content"
                    dangerouslySetInnerHTML={{ __html: q?.promptHtml || '' }}
                  />

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                      Your Answer:
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {ans.textAnswer || (ans.selectedOptionIds && ans.selectedOptionIds.join(', ')) || 'No answer'}
                    </p>
                  </div>

                  {q?.explanationHtml && (
                    <div className="mt-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                      <span className="font-bold block mb-0.5">Explanation / Model Key:</span>
                      <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: q.explanationHtml }} />
                    </div>
                  )}

                  {ans.feedback && (
                    <div className="mt-2 text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded border border-blue-100 dark:border-blue-800 font-medium">
                      Instructor Feedback: {ans.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            My Results & Performance Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Recharts trend trajectory, subject category breakdown, and comprehensive examination history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {metrics.totalCount} Evaluated Assessments
          </span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cumulative Average
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F2A4A] dark:text-white">
              {metrics.overallAvg}%
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                metrics.overallAvg >= 50
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {metrics.overallAvg >= 50 ? 'Passing' : 'Below Benchmark'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {metrics.totalCount} submitted quizzes
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pass Rate
            </span>
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F2A4A] dark:text-white">
              {metrics.overallPassRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({studentSubs.filter((s) => s.percent >= 50).length}/{metrics.totalCount})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Target benchmark: ≥ 50% pass mark
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Leading Domain
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 truncate">
            <span className="text-base sm:text-lg font-bold text-[#0F2A4A] dark:text-white truncate block">
              {metrics.bestCatName}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
            {metrics.bestCatAvg ? `Avg ${metrics.bestCatAvg}% score` : 'No submissions yet'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Categories Active
            </span>
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F2A4A] dark:text-white">
              {availableCategories.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Subject Domains</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Curriculum learning scope
          </span>
        </div>
      </div>

      {/* RECHARTS PROGRESS CHART CARD */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs p-5 sm:p-6 space-y-5">
        {/* Chart Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {chartViewMode === 'timeline' ? (
                  <LineChartIcon className="w-4 h-4" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
              </span>
              <h3 className="text-base font-bold text-[#0F2A4A] dark:text-white">
                {chartViewMode === 'timeline'
                  ? 'Performance Trajectory Over Time'
                  : 'Subject Categories Competency Comparison'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {chartViewMode === 'timeline'
                ? 'Chronological score progression across assessment sequence with institutional 50% pass benchmark line'
                : 'Comparative average mastery, high marks, and completion volume categorized by academic subject tiers'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Timeline vs Categories */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900 text-xs">
              <button
                type="button"
                onClick={() => setChartViewMode('timeline')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  chartViewMode === 'timeline'
                    ? 'bg-white dark:bg-slate-800 text-[#0F2A4A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                <span>Performance Trend</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('categories')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  chartViewMode === 'categories'
                    ? 'bg-white dark:bg-slate-800 text-[#0F2A4A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Category Breakdown</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters (when in timeline view) */}
        {chartViewMode === 'timeline' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px] flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Filter Domain:
            </span>
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
                activeCategoryFilter === 'all'
                  ? 'bg-[#0F2A4A] text-white shadow-2xs dark:bg-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Categories ({timelineData.length})
            </button>
            {availableCategories.map((cat) => {
              const isSelected = activeCategoryFilter === cat.id;
              const count = timelineData.filter((tp) => tp.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  style={{
                    backgroundColor: isSelected ? cat.color : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
                  />
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Recharts Canvas */}
        <div className="h-80 w-full pt-2">
          {timelineData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
              <Award className="w-10 h-10 mb-2 opacity-40" />
              <p className="font-semibold text-sm">No Assessment Submissions on Record</p>
              <p className="text-xs mt-1 max-w-sm">
                Complete and submit assigned class quizzes to automatically generate real-time performance analytics.
              </p>
            </div>
          ) : chartViewMode === 'timeline' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredTimelineData}
                margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isNight ? '#334155' : '#E2E8F0'}
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  stroke={isNight ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />

                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  stroke={isNight ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  ticks={[0, 25, 50, 75, 100]}
                />

                <Tooltip content={<CustomProgressTooltip isNight={isNight} />} />

                {/* 50% Institutional Pass Benchmark */}
                <ReferenceLine
                  y={50}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Pass Mark (50%)',
                    fill: '#EF4444',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="score"
                  name="Assessment Score"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#scoreGradient)"
                  dot={{
                    r: 4,
                    fill: isNight ? '#10B981' : '#0F2A4A',
                    strokeWidth: 2,
                    stroke: '#ffffff',
                  }}
                  activeDot={{
                    r: 7,
                    fill: '#10B981',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categorySummary}
                margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isNight ? '#334155' : '#E2E8F0'}
                  vertical={false}
                />

                <XAxis
                  dataKey="shortName"
                  stroke={isNight ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />

                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  stroke={isNight ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  ticks={[0, 25, 50, 75, 100]}
                />

                <Tooltip
                  formatter={(value: any, name: any) => [`${value}%`, name === 'average' ? 'Average Score' : 'Highest Mark']}
                  contentStyle={{
                    backgroundColor: isNight ? '#0F172A' : '#FFFFFF',
                    borderColor: isNight ? '#334155' : '#E2E8F0',
                    color: isNight ? '#F8FAFC' : '#0F172A',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                  }}
                />

                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
                  formatter={(val) => (val === 'average' ? 'Domain Average Score' : 'Peak Score')}
                />

                {/* 50% Benchmark */}
                <ReferenceLine
                  y={50}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                <Bar
                  dataKey="average"
                  name="average"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  {categorySummary.map((entry) => (
                    <Cell key={entry.categoryId} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Legend & Average Pill Row */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {categorySummary.map((cs) => (
              <div key={cs.categoryId} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cs.color }}
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {cs.category}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {cs.average}%
                </span>
                <span className="text-[10px] text-slate-400">
                  ({cs.totalQuizzes} tests)
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="inline-block w-2.5 h-0.5 bg-rose-500" />
            <span>Pass Threshold: 50%</span>
          </div>
        </div>
      </div>

      {/* Historical Submissions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F2A4A] dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            All Assessment Submission Records ({studentSubs.length})
          </h2>
          <span className="text-xs text-slate-400">Click any assessment for question-by-question review</span>
        </div>

        {studentSubs.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
            No quiz submissions on record for this account yet.
          </div>
        ) : (
          studentSubs.map((sub) => {
            const quiz = getQuiz(sub.quizId);
            const subjName = quiz ? getSubject(quiz.subjectId) : 'Assessment';
            const cat = getSubjectCategory(subjName);
            const isPending = sub.status === 'pending_manual';
            const isPassed = sub.percent >= 50;

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {cat.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : isPassed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {isPending ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Pending Theory Grading
                        </>
                      ) : isPassed ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Passed ({sub.percent}%)
                        </>
                      ) : (
                        'Failed (<50%)'
                      )}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(sub.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0F2A4A] dark:text-white mt-2 truncate">
                    {quiz?.title || sub.quizId}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Subject: <strong>{subjName}</strong> • Auto-Graded: {sub.autoScore}/{sub.autoTotal} • Manual Theory: {sub.manualScore}/{sub.manualTotal} • Raw Marks: {sub.totalScore}/{sub.totalPossible}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xl font-bold text-[#0F2A4A] dark:text-emerald-400 block">
                      {sub.percent}%
                    </span>
                    <span className="text-[11px] text-slate-400">Final Mark</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
