import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Paperclip,
  ChevronRight,
  ArrowLeft,
  Download,
  FileText,
  Presentation,
  Image,
  ExternalLink,
  File,
  Video,
  Play,
  CheckCircle2,
  CheckCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Check,
  Tv,
  Target,
  TrendingUp,
  Award,
  CheckSquare,
  Square,
  BarChart3,
  Flame,
  Layers,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';
import { Lesson } from '@/src/types';
import { LessonVideoPlayer, parseVideoUrl } from '@/src/components/video/LessonVideoPlayer';
import { toast } from 'sonner';

const LESSON_PROGRESS_STORAGE_KEY = 'eduform_student_lesson_progress';

export interface LessonTaskProgress {
  completed?: boolean;
  notesRead?: boolean;
  videoWatched?: boolean;
  materialsDownloaded?: boolean;
  lastUpdated?: string;
}

export type LessonProgressMap = Record<string, LessonTaskProgress>;

// Helper to determine subject category visual theme & color
function getSubjectTheme(subjectName: string) {
  const lower = subjectName.toLowerCase();
  if (lower.includes('math') || lower.includes('mth') || lower.includes('algebra')) {
    return {
      barColor: 'bg-blue-600',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
      borderHover: 'hover:border-blue-400',
      textColor: 'text-blue-600 dark:text-blue-400',
      ringColor: 'ring-blue-500/20',
    };
  }
  if (lower.includes('sci') || lower.includes('bio') || lower.includes('chem') || lower.includes('phys')) {
    return {
      barColor: 'bg-emerald-600',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
      borderHover: 'hover:border-emerald-400',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      ringColor: 'ring-emerald-500/20',
    };
  }
  if (lower.includes('eng') || lower.includes('language') || lower.includes('lit')) {
    return {
      barColor: 'bg-purple-600',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
      borderHover: 'hover:border-purple-400',
      textColor: 'text-purple-600 dark:text-purple-400',
      ringColor: 'ring-purple-500/20',
    };
  }
  if (lower.includes('comp') || lower.includes('tech') || lower.includes('ict')) {
    return {
      barColor: 'bg-cyan-600',
      badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900',
      borderHover: 'hover:border-cyan-400',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      ringColor: 'ring-cyan-500/20',
    };
  }
  return {
    barColor: 'bg-amber-600',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    borderHover: 'hover:border-amber-400',
    textColor: 'text-amber-600 dark:text-amber-400',
    ringColor: 'ring-amber-500/20',
  };
}

export function computeLessonProgress(
  lesson: Lesson,
  record?: LessonTaskProgress
): { percent: number; isComplete: boolean; completedItems: number; totalItems: number; tasks: { id: string; label: string; done: boolean }[] } {
  const hasVideo = Boolean(lesson.videoUrl);
  const hasFiles = Boolean(lesson.attachments && lesson.attachments.length > 0);

  const notesDone = Boolean(record?.completed || record?.notesRead);
  const videoDone = hasVideo ? Boolean(record?.completed || record?.videoWatched) : false;
  const filesDone = hasFiles ? Boolean(record?.completed || record?.materialsDownloaded) : false;

  const tasks = [
    { id: 'notes', label: 'Read Syllabus & Notes', done: notesDone },
    ...(hasVideo ? [{ id: 'video', label: 'Watch Video Lecture', done: videoDone }] : []),
    ...(hasFiles ? [{ id: 'files', label: 'Download Worksheets & Files', done: filesDone }] : []),
  ];

  if (record?.completed) {
    return {
      percent: 100,
      isComplete: true,
      completedItems: tasks.length,
      totalItems: tasks.length,
      tasks: tasks.map((t) => ({ ...t, done: true })),
    };
  }

  const completedItems = tasks.filter((t) => t.done).length;
  const totalItems = tasks.length;
  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    percent,
    isComplete: percent === 100,
    completedItems,
    totalItems,
    tasks,
  };
}

export const StudentLessonsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Stable data sources
  const lessons = useMemo(() => dataStore.getLessons(), []);
  const subjects = useMemo(() => dataStore.getSubjects(), []);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'video' | 'completed' | 'in_progress'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Student Lesson Progress State (persisted in localStorage)
  const [progressMap, setProgressMap] = useState<LessonProgressMap>(() => {
    try {
      const stored = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      // Migrate legacy watched videos if present
      const legacyWatched = localStorage.getItem('eduform_watched_videos');
      if (legacyWatched) {
        const ids: string[] = JSON.parse(legacyWatched);
        const initial: LessonProgressMap = {};
        ids.forEach((lid) => {
          initial[lid] = { videoWatched: true, notesRead: true };
        });
        return initial;
      }
      return {};
    } catch {
      return {};
    }
  });

  const saveProgressMap = (newMap: LessonProgressMap) => {
    setProgressMap(newMap);
    try {
      localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(newMap));
    } catch {
      // ignore
    }
  };

  // Filter lessons matching student's enrolled classes or published for all
  const studentLessons = useMemo(() => {
    return lessons.filter(
      (l) =>
        l.status === 'published' &&
        (!profile?.classIds.length || l.classIds.some((cid) => profile.classIds.includes(cid)))
    );
  }, [lessons, profile?.classIds]);

  // Derive selectedLesson directly from the URL parameter :id
  const selectedLesson = useMemo(() => {
    if (!id) return null;
    return studentLessons.find((l) => l.id === id) || null;
  }, [id, studentLessons]);

  const getSubjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || subjId;

  // Toggle individual task progress
  const toggleTask = (lessonId: string, taskId: 'notes' | 'video' | 'files') => {
    const current = progressMap[lessonId] || {};
    let updated: LessonTaskProgress = { ...current, lastUpdated: new Date().toISOString() };

    if (taskId === 'notes') {
      updated.notesRead = !current.notesRead;
    } else if (taskId === 'video') {
      updated.videoWatched = !current.videoWatched;
    } else if (taskId === 'files') {
      updated.materialsDownloaded = !current.materialsDownloaded;
    }

    // Check if all are now true
    const lesson = studentLessons.find((l) => l.id === lessonId);
    if (lesson) {
      const stats = computeLessonProgress(lesson, updated);
      if (stats.percent === 100) {
        updated.completed = true;
        toast.success(`Congratulations! You completed all materials for "${lesson.title}"! 🎉`);
      } else {
        updated.completed = false;
      }
    }

    const nextMap = { ...progressMap, [lessonId]: updated };
    saveProgressMap(nextMap);
  };

  // Fast toggle entire lesson complete
  const toggleLessonComplete = (lessonId: string) => {
    const current = progressMap[lessonId] || {};
    const isCurrentlyComplete = computeLessonProgress(
      studentLessons.find((l) => l.id === lessonId)!,
      current
    ).isComplete;

    let updated: LessonTaskProgress;
    if (isCurrentlyComplete) {
      updated = {
        notesRead: false,
        videoWatched: false,
        materialsDownloaded: false,
        completed: false,
        lastUpdated: new Date().toISOString(),
      };
      toast.info('Lesson marked as in progress.');
    } else {
      updated = {
        notesRead: true,
        videoWatched: true,
        materialsDownloaded: true,
        completed: true,
        lastUpdated: new Date().toISOString(),
      };
      toast.success('Lesson marked as 100% completed! 🎯');
    }

    const nextMap = { ...progressMap, [lessonId]: updated };
    saveProgressMap(nextMap);
  };

  const getAttachmentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-600" />;
      case 'slides':
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-4 h-4 text-amber-600" />;
      case 'image':
      case 'png':
      case 'jpg':
        return <Image className="w-4 h-4 text-emerald-600" />;
      case 'link':
      case 'web':
        return <ExternalLink className="w-4 h-4 text-blue-600" />;
      default:
        return <File className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    navigate(`/lessons/${lesson.id}`);
  };

  const handleBackToList = () => {
    navigate('/lessons');
  };

  // Compute Overall & Subject Completion Statistics
  const { overallStats, subjectStats } = useMemo(() => {
    const totalLessons = studentLessons.length;
    let completedLessonsCount = 0;
    let sumPercentages = 0;

    studentLessons.forEach((l) => {
      const stats = computeLessonProgress(l, progressMap[l.id]);
      sumPercentages += stats.percent;
      if (stats.isComplete) {
        completedLessonsCount += 1;
      }
    });

    const overallPercentage = totalLessons > 0 ? Math.round(sumPercentages / totalLessons) : 0;

    // Subject breakdown
    const subjectList = subjects.filter((s) =>
      studentLessons.some((l) => l.subjectId === s.id)
    );

    const subStats = subjectList.map((subj) => {
      const subjLessons = studentLessons.filter((l) => l.subjectId === subj.id);
      const total = subjLessons.length;
      let completed = 0;
      let subPercentSum = 0;

      subjLessons.forEach((l) => {
        const stats = computeLessonProgress(l, progressMap[l.id]);
        subPercentSum += stats.percent;
        if (stats.isComplete) {
          completed += 1;
        }
      });

      const avgPercent = total > 0 ? Math.round(subPercentSum / total) : 0;
      const theme = getSubjectTheme(subj.name);

      return {
        id: subj.id,
        name: subj.name,
        code: subj.code,
        totalLessons: total,
        completedLessons: completed,
        percentage: avgPercent,
        isFullyComplete: total > 0 && completed === total,
        theme,
      };
    });

    return {
      overallStats: {
        totalLessons,
        completedLessonsCount,
        overallPercentage,
      },
      subjectStats: subStats,
    };
  }, [studentLessons, subjects, progressMap]);

  // Filtered view
  const filteredLessons = studentLessons.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSubjectName(l.subjectId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || l.subjectId === selectedSubject;

    const prog = computeLessonProgress(l, progressMap[l.id]);
    let matchesMode = true;
    if (filterMode === 'video') matchesMode = Boolean(l.videoUrl);
    else if (filterMode === 'completed') matchesMode = prog.isComplete;
    else if (filterMode === 'in_progress') matchesMode = !prog.isComplete;

    return matchesSearch && matchesSubject && matchesMode;
  });

  const videoLessonsCount = studentLessons.filter((l) => Boolean(l.videoUrl)).length;

  // Render Single Lesson Note View
  if (selectedLesson) {
    const hasVideo = Boolean(selectedLesson.videoUrl);
    const hasFiles = Boolean(selectedLesson.attachments && selectedLesson.attachments.length > 0);
    const videoInfo = hasVideo ? parseVideoUrl(selectedLesson.videoUrl!) : null;
    const progress = computeLessonProgress(selectedLesson, progressMap[selectedLesson.id]);
    const theme = getSubjectTheme(getSubjectName(selectedLesson.subjectId));

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation & Fast Complete Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Lesson Library
          </button>

          <button
            type="button"
            onClick={() => toggleLessonComplete(selectedLesson.id)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              progress.isComplete
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#0F2A4A] hover:bg-[#163c68] text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{progress.isComplete ? 'Lesson 100% Completed • Click to Reset' : 'Mark Entire Lesson Completed'}</span>
          </button>
        </div>

        {/* 📊 INTERACTIVE LESSON PROGRESS BAR & CHECKLIST CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Target className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-[#0F2A4A] dark:text-slate-100">
                  Lesson Study Progress
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    progress.isComplete
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : progress.percent > 0
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {progress.isComplete ? 'Completed' : progress.percent > 0 ? 'In Progress' : 'Not Started'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Check off each curriculum component as you study to track your subject mastery
              </p>
            </div>

            <div className="text-right sm:shrink-0 flex items-baseline sm:flex-col justify-between sm:justify-start">
              <span className="text-2xl font-black text-[#0F2A4A] dark:text-emerald-400 font-mono">
                {progress.percent}%
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {progress.completedItems} of {progress.totalItems} Tasks Done
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                progress.isComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-blue-600 to-emerald-500'
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {/* Interactive Checklist Pills */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Written Notes Task */}
            <button
              type="button"
              onClick={() => toggleTask(selectedLesson.id, 'notes')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                progress.tasks.find((t) => t.id === 'notes')?.done
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white'
              }`}
            >
              {progress.tasks.find((t) => t.id === 'notes')?.done ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-semibold block truncate">Read Syllabus Notes</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {progress.tasks.find((t) => t.id === 'notes')?.done ? 'Completed' : 'Click to mark read'}
                </span>
              </div>
            </button>

            {/* 2. Video Lecture Task */}
            {hasVideo && (
              <button
                type="button"
                onClick={() => toggleTask(selectedLesson.id, 'video')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  progress.tasks.find((t) => t.id === 'video')?.done
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                {progress.tasks.find((t) => t.id === 'video')?.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="font-semibold block truncate">Watch Video Note</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {progress.tasks.find((t) => t.id === 'video')?.done ? 'Watched' : 'Click to mark watched'}
                  </span>
                </div>
              </button>
            )}

            {/* 3. Materials Task */}
            {hasFiles && (
              <button
                type="button"
                onClick={() => toggleTask(selectedLesson.id, 'files')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  progress.tasks.find((t) => t.id === 'files')?.done
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                {progress.tasks.find((t) => t.id === 'files')?.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="font-semibold block truncate">Review Attachments</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {progress.tasks.find((t) => t.id === 'files')?.done ? 'Accessed' : 'Click to mark reviewed'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Main Lesson Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 sm:p-8 space-y-6">
          {/* Metadata pill row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${theme.badgeBg}`}>
              {getSubjectName(selectedLesson.subjectId)}
            </span>
            <span className="text-xs text-slate-400">
              • Published {new Date(selectedLesson.createdAt).toLocaleDateString()}
            </span>
            {selectedLesson.createdBy && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                • Instructor: {selectedLesson.createdBy}
              </span>
            )}
            {hasVideo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                <Video className="w-3 h-3 fill-red-600 text-red-600" />
                <span>{videoInfo?.type === 'youtube' ? 'YouTube Video Note' : 'Video Lecture'}</span>
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2A4A] dark:text-slate-100 leading-tight">
              {selectedLesson.title}
            </h1>
          </div>

          {/* 🎬 DEDICATED YOUTUBE VIDEO PLAYER NOTE */}
          {hasVideo && selectedLesson.videoUrl && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-red-600 text-white">
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Video Lecture Note: {selectedLesson.videoTitle || selectedLesson.title}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Interactive YouTube Player • Fullscreen & Theater View Supported
                </span>
              </div>

              <LessonVideoPlayer
                url={selectedLesson.videoUrl}
                title={selectedLesson.videoTitle || selectedLesson.title}
                author={selectedLesson.createdBy}
              />
            </div>
          )}

          {/* Attached Course Materials Box */}
          {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                <Paperclip className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Downloadable Courseware Attachments ({selectedLesson.attachments.length}):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedLesson.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded bg-slate-50 dark:bg-slate-700 shrink-0">
                        {getAttachmentIcon(att.type)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate" title={att.name}>
                          {att.name}
                        </span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className="uppercase font-bold text-slate-500">{att.type}</span>
                          {att.size && <span>• {att.size}</span>}
                        </div>
                      </div>
                    </div>

                    <a
                      href={att.dataUrl || att.url || '#'}
                      download={att.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 ml-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      title="Download attachment"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rendered Lesson Body Notes with Rich Text Styling */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Written Lesson Notes & Curriculum Syllabus
            </h2>

            <div
              className="text-sm text-slate-800 dark:text-slate-200 space-y-4 leading-relaxed rich-text-content"
              dangerouslySetInnerHTML={{ __html: selectedLesson.bodyHtml }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render Lesson Library Catalog View
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Class Lesson Library
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access lecture notes, teacher YouTube video lessons, and track your visual completion across each enrolled subject
          </p>
        </div>
      </div>

      {/* 🌟 OVERALL ACADEMIC PROGRESS DASHBOARD BANNER */}
      <div className="bg-gradient-to-r from-[#0F2A4A] via-[#163b65] to-[#1E3A5F] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Award className="w-3.5 h-3.5" /> Academic Progress Tracker
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {overallStats.completedLessonsCount} of {overallStats.totalLessons} Lessons Finished
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-serif">
              Curriculum Completion: {overallStats.overallPercentage}%
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              {overallStats.overallPercentage === 100
                ? 'Outstanding work! You have completed 100% of the published curriculum lessons for your stream.'
                : overallStats.overallPercentage > 50
                ? `You're more than halfway through your curriculum! Complete the remaining ${
                    overallStats.totalLessons - overallStats.completedLessonsCount
                  } lessons to achieve full mastery.`
                : 'Study your notes and watch attached video lectures to increase your progress across subjects.'}
            </p>

            {/* Overall Visual Progress Bar */}
            <div className="pt-2">
              <div className="w-full bg-black/40 rounded-full h-3.5 p-0.5 border border-white/10 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-700 ease-out shadow-xs"
                  style={{ width: `${overallStats.overallPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15 shrink-0 md:min-w-[170px] text-center">
            <div>
              <span className="text-3xl font-black font-mono text-emerald-300 block">
                {overallStats.overallPercentage}%
              </span>
              <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider block mt-0.5">
                Total Completion
              </span>
            </div>
            <div className="text-[11px] text-slate-300 border-t border-white/10 pt-2 w-full hidden md:block">
              {overallStats.completedLessonsCount} / {overallStats.totalLessons} Mastered
            </div>
          </div>
        </div>
      </div>

      {/* 📚 SUBJECT-BY-SUBJECT VISUAL PROGRESS BREAKDOWN */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#0F2A4A] dark:text-slate-100">
                Subject Completion Rates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any subject to filter lessons and track completion
              </p>
            </div>
          </div>

          {selectedSubject !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedSubject('all')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Clear Subject Filter
            </button>
          )}
        </div>

        {/* Subject Progress Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {subjectStats.map((subj) => {
            const isSelected = selectedSubject === subj.id;

            return (
              <div
                key={subj.id}
                onClick={() => setSelectedSubject(isSelected ? 'all' : subj.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {subj.name}
                    </span>
                    <span
                      className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full ${
                        subj.percentage === 100
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {subj.percentage}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    <span>{subj.completedLessons} of {subj.totalLessons} Completed</span>
                    {subj.isFullyComplete && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3 h-3" /> Done
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      subj.percentage === 100 ? 'bg-emerald-500' : subj.theme.barColor
                    }`}
                    style={{ width: `${subj.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search lessons or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({studentLessons.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('completed')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                filterMode === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Completed ({overallStats.completedLessonsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('in_progress')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterMode === 'in_progress'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
              }`}
            >
              In Progress ({studentLessons.length - overallStats.completedLessonsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('video')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'video'
                  ? 'bg-red-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-red-500'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Notes ({videoLessonsCount})</span>
            </button>
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">All Subjects ({studentLessons.length})</option>
            {subjects
              .filter((s) => studentLessons.some((l) => l.subjectId === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Lesson Cards Grid with Visual Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLessons.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-semibold text-sm">No lesson notes found matching your criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try switching filters or search terms.</p>
          </div>
        ) : (
          filteredLessons.map((lesson) => {
            const hasVideo = Boolean(lesson.videoUrl);
            const progress = computeLessonProgress(lesson, progressMap[lesson.id]);
            const theme = getSubjectTheme(getSubjectName(lesson.subjectId));

            return (
              <div
                key={lesson.id}
                onClick={() => handleSelectLesson(lesson)}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Visual Top Colored Strip Based on Completion */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                    progress.isComplete
                      ? 'bg-emerald-500'
                      : progress.percent > 0
                      ? 'bg-blue-500'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${theme.badgeBg}`}>
                      {getSubjectName(lesson.subjectId)}
                    </span>

                    {/* Completion Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        progress.isComplete
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          : progress.percent > 0
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {progress.isComplete ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>100% Complete</span>
                        </>
                      ) : (
                        <span>{progress.percent}% Progress</span>
                      )}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0F2A4A] dark:text-slate-100 mt-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {lesson.title}
                  </h3>

                  {/* 📊 INDIVIDUAL LESSON PROGRESS BAR */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {progress.completedItems} of {progress.totalItems} tasks completed
                      </span>
                      <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                        {progress.percent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          progress.isComplete
                            ? 'bg-emerald-500'
                            : progress.percent > 0
                            ? 'bg-blue-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Task checklist chips */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                        progress.tasks.find((t) => t.id === 'notes')?.done
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {progress.tasks.find((t) => t.id === 'notes')?.done && <Check className="w-2.5 h-2.5" />}
                      <span>Notes</span>
                    </span>

                    {hasVideo && (
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                          progress.tasks.find((t) => t.id === 'video')?.done
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {progress.tasks.find((t) => t.id === 'video')?.done ? (
                          <Check className="w-2.5 h-2.5" />
                        ) : (
                          <Play className="w-2.5 h-2.5 fill-current" />
                        )}
                        <span>Video Lecture</span>
                      </span>
                    )}

                    {lesson.attachments && lesson.attachments.length > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                          progress.tasks.find((t) => t.id === 'files')?.done
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {progress.tasks.find((t) => t.id === 'files')?.done ? (
                          <Check className="w-2.5 h-2.5" />
                        ) : (
                          <Paperclip className="w-2.5 h-2.5" />
                        )}
                        <span>{lesson.attachments.length} Files</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    {hasVideo ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-red-500" />
                        <span className="text-slate-700 dark:text-slate-300">Open Lesson & Video</span>
                      </>
                    ) : (
                      <span>Open Lesson Note</span>
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
