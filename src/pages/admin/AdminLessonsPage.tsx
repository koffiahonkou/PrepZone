import React, { useState, useRef } from 'react';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  Paperclip,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  UploadCloud,
  Download,
  File,
  Image,
  Presentation,
  ExternalLink,
  Film,
  Video,
  Play,
  Sparkles,
  Check,
  Search,
  Filter,
  Eye,
  Tv,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';
import { Lesson, LessonAttachment } from '@/src/types';
import { RichTextEditor } from '@/src/components/common/RichTextEditor';
import { LessonVideoPlayer, parseVideoUrl } from '@/src/components/video/LessonVideoPlayer';
import { toast } from 'sonner';

const EDUCATIONAL_VIDEO_PRESETS = [
  {
    title: 'Algebra: Linear Equations & Variables (Khan Academy)',
    subject: 'subj-mth',
    url: 'https://www.youtube.com/watch?v=NybHckSEQBI',
    type: 'youtube',
    source: 'Khan Academy Lecture',
  },
  {
    title: 'States of Matter & Particle Kinetics (Crash Course)',
    subject: 'subj-sci',
    url: 'https://www.youtube.com/watch?v=bMbmfx-TU3k',
    type: 'youtube',
    source: 'Crash Course Science',
  },
  {
    title: 'Active vs. Passive Voice in Syntax (Grammar Masterclass)',
    subject: 'subj-eng',
    url: 'https://www.youtube.com/watch?v=hNffLg9hCkk',
    type: 'youtube',
    source: 'Grammar Masterclass',
  },
  {
    title: 'Inside Computer Hardware & CPU Cycle (Computer Science)',
    subject: 'subj-cmp',
    url: 'https://www.youtube.com/watch?v=AkFi90lZmXA',
    type: 'youtube',
    source: 'Computer Science Fundamentals',
  },
  {
    title: 'Chemical Reactions & Stoichiometry (Crash Course Chemistry)',
    subject: 'subj-sci',
    url: 'https://www.youtube.com/watch?v=7CqJoxUG4r4',
    type: 'youtube',
    source: 'Crash Course Chemistry',
  },
];

export const AdminLessonsPage: React.FC = () => {
  const { profile } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>(() => dataStore.getLessons());
  const subjects = React.useMemo(() => dataStore.getSubjects(), []);
  const classes = React.useMemo(() => dataStore.getClasses(), []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'video' | 'published' | 'draft'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubjectId, setFormSubjectId] = useState(subjects[0]?.id || '');
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formBodyHtml, setFormBodyHtml] = useState('');

  // Video Note State
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formVideoTitle, setFormVideoTitle] = useState('');
  const [formVideoSourceMode, setFormVideoSourceMode] = useState<'youtube' | 'upload' | 'preset'>('youtube');
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Attachments State
  const [formAttachments, setFormAttachments] = useState<LessonAttachment[]>([]);
  const [newAttName, setNewAttName] = useState('');
  const [newAttType, setNewAttType] = useState('pdf');
  const [newAttUrl, setNewAttUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);

  // Quick Watch Video Preview Modal
  const [previewVideoLesson, setPreviewVideoLesson] = useState<Lesson | null>(null);

  const getSubjectName = (subjId: string) => {
    return subjects.find((s) => s.id === subjId)?.name || subjId;
  };

  const getClassName = (cid: string) => {
    return classes.find((c) => c.id === cid)?.name || cid;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openAddModal = () => {
    setEditingLesson(null);
    setFormTitle('');
    setFormSubjectId(subjects[0]?.id || '');
    setFormClassIds(classes.slice(0, 2).map((c) => c.id));
    setFormStatus('published');
    setFormBodyHtml(
      '<h2>1. Introduction & Overview</h2>\n<p>Enter the main lesson body notes, worked mathematical proofs, or reading explanations here.</p>\n\n<h3>Key Concepts:</h3>\n<ul>\n  <li>Concept 1: Definition and scope.</li>\n  <li>Concept 2: Practical applications.</li>\n</ul>\n\n<blockquote><p>Key Takeaway: Highlight important laws, definitions, or exam reminders here.</p></blockquote>'
    );
    setFormAttachments([]);
    setNewAttName('');
    setNewAttType('pdf');
    setNewAttUrl('');
    setFormVideoUrl('');
    setFormVideoTitle('');
    setFormVideoSourceMode('youtube');
    setIsModalOpen(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormTitle(lesson.title);
    setFormSubjectId(lesson.subjectId);
    setFormClassIds(lesson.classIds || []);
    setFormStatus(lesson.status);
    setFormBodyHtml(lesson.bodyHtml);
    setFormAttachments(lesson.attachments || []);
    setNewAttName('');
    setNewAttType('pdf');
    setNewAttUrl('');
    setFormVideoUrl(lesson.videoUrl || '');
    setFormVideoTitle(lesson.videoTitle || '');
    setFormVideoSourceMode(
      lesson.videoType === 'upload' || (lesson.videoUrl && lesson.videoUrl.startsWith('data:video'))
        ? 'upload'
        : 'youtube'
    );
    setIsModalOpen(true);
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      toast.error('Video file size exceeds 80MB. For larger recordings, embedding a YouTube link is recommended.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormVideoUrl(dataUrl);
      if (!formVideoTitle.trim()) {
        setFormVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      toast.success(`Video "${file.name}" (${formatFileSize(file.size)}) uploaded successfully.`);
    };
    reader.onerror = () => {
      toast.error('Failed to read video file.');
    };
    reader.readAsDataURL(file);

    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  const handleApplyVideoPreset = (preset: typeof EDUCATIONAL_VIDEO_PRESETS[0]) => {
    setFormVideoUrl(preset.url);
    setFormVideoTitle(preset.title);
    setFormVideoSourceMode('youtube');
    toast.success(`Applied lecture video: "${preset.title}"`);
  };

  const handleClearVideo = () => {
    setFormVideoUrl('');
    setFormVideoTitle('');
    toast.info('Video note removed.');
  };

  const handleAddManualAttachment = () => {
    if (!newAttName.trim()) {
      toast.error('Please enter an attachment or document name.');
      return;
    }
    const att: LessonAttachment = {
      name: newAttName.trim(),
      type: newAttType,
      url: newAttUrl.trim() || '#',
      size: 'Course Material',
    };
    setFormAttachments((prev) => [...prev, att]);
    setNewAttName('');
    setNewAttUrl('');
    toast.success(`Attached "${att.name}"`);
  };

  const addPresetAttachment = (name: string, type: string, size: string) => {
    const att: LessonAttachment = {
      name,
      type,
      url: '#',
      size,
    };
    setFormAttachments((prev) => [...prev, att]);
    toast.success(`Attached template: "${name}"`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
    let detectedType = 'file';
    if (['pdf'].includes(extension)) detectedType = 'pdf';
    else if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) detectedType = 'doc';
    else if (['ppt', 'pptx'].includes(extension)) detectedType = 'slides';
    else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(extension)) detectedType = 'image';

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const att: LessonAttachment = {
        name: file.name,
        type: detectedType,
        url: dataUrl,
        size: formatFileSize(file.size),
        dataUrl,
      };
      setFormAttachments((prev) => [...prev, att]);
      toast.success(`File "${file.name}" (${formatFileSize(file.size)}) uploaded successfully.`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setFormAttachments((prev) => prev.filter((_, i) => i !== index));
    toast.info('Attachment removed.');
  };

  const getAttachmentIcon = (type: string) => {
    switch (type.toLowerCase()) {
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Lesson title is required.');
      return;
    }
    if (formClassIds.length === 0) {
      toast.error('Please assign at least one target class.');
      return;
    }

    const now = new Date().toISOString();
    const videoInfo = parseVideoUrl(formVideoUrl);
    const finalVideoType = formVideoUrl.trim()
      ? videoInfo.type === 'youtube'
        ? 'youtube'
        : videoInfo.type === 'vimeo'
        ? 'vimeo'
        : 'upload'
      : undefined;

    const authorName = profile?.fullName
      ? `${profile.fullName} (${profile.role === 'admin' ? 'Admin' : 'Teacher'})`
      : 'Faculty Instructor';

    if (editingLesson) {
      const updated: Lesson = {
        ...editingLesson,
        title: formTitle.trim(),
        subjectId: formSubjectId,
        classIds: formClassIds,
        status: formStatus,
        bodyHtml: formBodyHtml,
        attachments: formAttachments,
        videoUrl: formVideoUrl.trim() || undefined,
        videoTitle: formVideoTitle.trim() || undefined,
        videoType: finalVideoType,
        updatedAt: now,
      };
      dataStore.saveLesson(updated);
      toast.success(`Lesson "${updated.title}" updated successfully.`);
    } else {
      const newLesson: Lesson = {
        id: `lesson-${Date.now()}`,
        title: formTitle.trim(),
        subjectId: formSubjectId,
        classIds: formClassIds,
        levelIds: [],
        status: formStatus,
        bodyHtml: formBodyHtml,
        attachments: formAttachments,
        videoUrl: formVideoUrl.trim() || undefined,
        videoTitle: formVideoTitle.trim() || undefined,
        videoType: finalVideoType,
        createdBy: authorName,
        createdAt: now,
        updatedAt: now,
      };
      dataStore.saveLesson(newLesson);
      toast.success(`Lesson "${newLesson.title}" created successfully.`);
    }

    setLessons(dataStore.getLessons());
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    dataStore.deleteLesson(deleteTarget.id);
    setLessons(dataStore.getLessons());
    setDeleteTarget(null);
    toast.success('Lesson deleted successfully.');
  };

  const toggleClass = (cid: string) => {
    setFormClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  // Filter lessons
  const filteredLessons = lessons.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSubjectName(l.subjectId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === 'all' || l.subjectId === selectedSubjectFilter;

    let matchesMode = true;
    if (filterMode === 'video') matchesMode = Boolean(l.videoUrl);
    else if (filterMode === 'published') matchesMode = l.status === 'published';
    else if (filterMode === 'draft') matchesMode = l.status === 'draft';

    return matchesSearch && matchesSubject && matchesMode;
  });

  const parsedFormVideo = parseVideoUrl(formVideoUrl);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Lesson Notes & Video Lectures
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Author classroom lesson materials and upload YouTube video notes for student learning ({lessons.length} notes available)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Lesson Note
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search lessons by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
              All ({lessons.length})
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
              <span>With Video ({lessons.filter((l) => l.videoUrl).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('published')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterMode === 'published'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('draft')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterMode === 'draft'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Drafts
            </button>
          </div>

          {/* Subject Dropdown */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lesson List */}
      <div className="space-y-4">
        {filteredLessons.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-semibold text-sm">No lesson notes matched your search.</p>
            <p className="text-xs text-slate-400 mt-1">Try modifying your filter or create a new lesson note.</p>
          </div>
        ) : (
          filteredLessons.map((lesson) => {
            const subjName = getSubjectName(lesson.subjectId);
            const hasVideo = Boolean(lesson.videoUrl);
            const videoInfo = hasVideo ? parseVideoUrl(lesson.videoUrl!) : null;

            return (
              <div
                key={lesson.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                      {subjName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        lesson.status === 'published'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {lesson.status === 'published' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Published
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Draft
                        </>
                      )}
                    </span>

                    {/* Prominent Video Note Badge */}
                    {hasVideo && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                        <Video className="w-3 h-3 text-red-600 fill-red-600" />
                        <span>{videoInfo?.type === 'youtube' ? 'YouTube Video Note' : 'Video Lecture'}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[#0F2A4A] dark:text-slate-100 mt-2">{lesson.title}</h3>

                  <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target Classes:</span>
                    {lesson.classIds?.map((cid) => (
                      <span
                        key={cid}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {getClassName(cid)}
                      </span>
                    ))}
                  </div>

                  {/* Video Note Spotlight Strip */}
                  {hasVideo && (
                    <div className="mt-4 p-3 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {lesson.videoTitle || 'Educational Video Lecture'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {videoInfo?.type === 'youtube'
                              ? 'Interactive YouTube Player ready for student stream'
                              : 'Uploaded Video Recording attached'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewVideoLesson(lesson)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Watch Video</span>
                      </button>
                    </div>
                  )}

                  {/* Attached Documents */}
                  {lesson.attachments && lesson.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Attached Courseware ({lesson.attachments.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {lesson.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.dataUrl || att.url || '#'}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                            title="Click to download attachment"
                          >
                            {getAttachmentIcon(att.type)}
                            <span className="underline truncate max-w-xs">{att.name}</span>
                            {att.size && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                                ({att.size})
                              </span>
                            )}
                            <Download className="w-3 h-3 text-emerald-700 dark:text-emerald-300 ml-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(lesson)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit lesson note"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(lesson)}
                      className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete lesson note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 block">
                    Updated {new Date(lesson.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Author: {lesson.createdBy}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT LESSON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-[#0F2A4A] dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  {editingLesson ? 'Edit Lesson Note & Video' : 'Add New Lesson Note & Video'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Publish written materials, YouTube video lectures, and downloadable files for enrolled students
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-5">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemical Bonding, Molecular Geometry & Valence Electrons"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                />
              </div>

              {/* Subject & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Subject Stream *
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'draft' | 'published')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                  >
                    <option value="published">Published (Visible to Enrolled Students)</option>
                    <option value="draft">Draft (Private / Work in progress)</option>
                  </select>
                </div>
              </div>

              {/* Target Classes */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Enrolled Classes *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 max-h-36 overflow-y-auto">
                  {classes.map((c) => {
                    const isChecked = formClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                          isChecked
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleClass(c.id)}
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 🎬 DEDICATED VIDEO NOTE SECTION (YOUTUBE / UPLOAD / PRESET) */}
              <div className="p-4 rounded-xl border-2 border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-red-600 fill-red-600" />
                      <span>Video Note / Video Lecture (YouTube Player)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Provide a video lecture or demonstration for students to watch directly inside their lesson note
                    </p>
                  </div>

                  {formVideoUrl && (
                    <button
                      type="button"
                      onClick={handleClearVideo}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Video
                    </button>
                  )}
                </div>

                {/* Source Selection Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setFormVideoSourceMode('youtube')}
                    className={`flex-1 py-1.5 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      formVideoSourceMode === 'youtube'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span>YouTube Video Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormVideoSourceMode('upload')}
                    className={`flex-1 py-1.5 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      formVideoSourceMode === 'upload'
                        ? 'bg-slate-900 text-white dark:bg-slate-700 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Video File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormVideoSourceMode('preset')}
                    className={`flex-1 py-1.5 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      formVideoSourceMode === 'preset'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Curated Presets</span>
                  </button>
                </div>

                {/* MODE 1: YouTube URL Input */}
                {formVideoSourceMode === 'youtube' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        YouTube Video URL or Video ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. https://www.youtube.com/watch?v=NybHckSEQBI or https://youtu.be/..."
                          value={formVideoUrl}
                          onChange={(e) => setFormVideoUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-red-500 font-mono"
                        />
                        {formVideoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormVideoUrl('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* YouTube Validation Indicator */}
                      {formVideoUrl.trim() && (
                        <div className="mt-1.5">
                          {parsedFormVideo.type === 'youtube' ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <Check className="w-3.5 h-3.5" />
                              <span>Valid YouTube video detected (Video ID: {parsedFormVideo.videoId}). Embedded player ready!</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>URL does not match standard YouTube format. Direct player mode will be attempted.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Video Lecture Caption / Title (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Khan Academy Lesson on Algebraic Expressions"
                        value={formVideoTitle}
                        onChange={(e) => setFormVideoTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                      />
                    </div>
                  </div>
                )}

                {/* MODE 2: Upload Video File */}
                {formVideoSourceMode === 'upload' && (
                  <div className="space-y-3 pt-1">
                    <input
                      type="file"
                      ref={videoFileInputRef}
                      onChange={handleVideoFileUpload}
                      className="hidden"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.m4v"
                    />

                    <div
                      onClick={() => videoFileInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-400 rounded-xl bg-white dark:bg-slate-800/70 text-center cursor-pointer transition-colors"
                    >
                      <Film className="w-8 h-8 mx-auto text-red-500 mb-2 opacity-80" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to browse or drop lecture recording file (.mp4, .webm, .mov)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Recommended max 80MB. For larger videos, YouTube embedding is recommended for fast streaming.
                      </p>
                      <button
                        type="button"
                        className="mt-3 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Select Video File
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Video Lecture Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Teacher Recorded Lesson Demonstration"
                        value={formVideoTitle}
                        onChange={(e) => setFormVideoTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                      />
                    </div>
                  </div>
                )}

                {/* MODE 3: Curated Educational Presets */}
                {formVideoSourceMode === 'preset' && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select one of our curated high-yield educational lectures to attach instantly:
                    </p>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {EDUCATIONAL_VIDEO_PRESETS.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs hover:border-red-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="p-1 rounded bg-red-100 dark:bg-red-950/60 text-red-600 shrink-0">
                              <Play className="w-3 h-3 fill-current" />
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                {p.title}
                              </span>
                              <span className="text-[10px] text-slate-400">{p.source}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyVideoPreset(p)}
                            className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] shrink-0 ml-2 cursor-pointer"
                          >
                            Use Lecture
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LIVE EMBEDDED PLAYER PREVIEW */}
                {formVideoUrl.trim() && (
                  <div className="pt-2 border-t border-red-200/60 dark:border-red-900/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-red-600" />
                        Live Video Player Preview (How Students Will See It):
                      </span>
                    </div>

                    <LessonVideoPlayer
                      url={formVideoUrl}
                      title={formVideoTitle || formTitle || 'Lesson Video Lecture'}
                      author={profile?.fullName || 'Teacher / Instructor'}
                    />
                  </div>
                )}
              </div>

              {/* Lesson Body Content Editor */}
              <div>
                <RichTextEditor
                  label="Lesson Written Notes & Curriculum Content *"
                  value={formBodyHtml}
                  onChange={setFormBodyHtml}
                  placeholder="Compose lecture notes, bold key terms, add bullet lists, or quote formulas..."
                  minHeight="200px"
                />
              </div>

              {/* ATTACHMENT SECTION */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Supplementary Documents & Worksheets ({formAttachments.length})
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload exercises, lecture slides, worksheets, or reference links for students to download
                    </p>
                  </div>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" /> Upload Local Document
                  </button>
                </div>

                {/* Preset Fast-Add Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Quick Templates:</span>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetAttachment('Chapter_Practice_Worksheet.pdf', 'pdf', '1.2 MB')
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    + Practice Worksheet (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetAttachment('Lecture_Slide_Deck.pptx', 'slides', '3.5 MB')
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    + Lecture Slides (PPTX)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetAttachment('Formula_Cheat_Sheet.pdf', 'pdf', '480 KB')
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    + Formula Sheet (PDF)
                  </button>
                </div>

                {/* Manual Add Input Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Or enter resource name (e.g. Workbook_Ex_4.pdf)"
                      value={newAttName}
                      onChange={(e) => setNewAttName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={newAttType}
                      onChange={(e) => setNewAttType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                    >
                      <option value="pdf">PDF Document (.pdf)</option>
                      <option value="slides">Slides Presentation (.pptx)</option>
                      <option value="doc">Word / Text Document (.docx)</option>
                      <option value="image">Diagram / Chart (.png)</option>
                      <option value="link">External Web Link (.url)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="URL (optional)"
                      value={newAttUrl}
                      onChange={(e) => setNewAttUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddManualAttachment}
                      className="w-full px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Attach
                    </button>
                  </div>
                </div>

                {/* Current Attachments List */}
                {formAttachments.length > 0 ? (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Attached Materials to Save:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {formAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 shrink-0">
                              {getAttachmentIcon(att.type)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                {att.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="uppercase font-bold text-slate-500">{att.type}</span>
                                {att.size && <span>• {att.size}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {att.dataUrl && (
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                title="Download uploaded file preview"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Remove attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                    No attachments added yet. Click &quot;Upload Local Document&quot; or choose a quick template above.
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white cursor-pointer shadow-xs"
                >
                  {editingLesson ? 'Save Changes' : 'Publish Lesson Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK WATCH VIDEO PREVIEW MODAL */}
      {previewVideoLesson && previewVideoLesson.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-600 text-white">
                  <Play className="w-4 h-4 fill-white" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white truncate max-w-lg">
                    {previewVideoLesson.videoTitle || previewVideoLesson.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {getSubjectName(previewVideoLesson.subjectId)} • Author: {previewVideoLesson.createdBy}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideoLesson(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <LessonVideoPlayer
              url={previewVideoLesson.videoUrl}
              title={previewVideoLesson.videoTitle || previewVideoLesson.title}
              author={previewVideoLesson.createdBy}
            />

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
              <span>This video note is actively accessible by enrolled students.</span>
              <button
                type="button"
                onClick={() => setPreviewVideoLesson(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
              >
                Close Video Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A] dark:text-slate-100">Delete Lesson Note?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deleteTarget.title}</strong>? Students will no longer have access to these materials or video note.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
