import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  GraduationCap,
  User,
  Sparkles,
  ChevronRight,
  X,
  HelpCircle,
  MessageCircleQuestion,
  CornerDownRight,
  Check,
  Calendar,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Users,
  Layers,
  Archive,
  RefreshCw,
  Lightbulb,
  RotateCcw,
  BookMarked,
  Plus,
  BookmarkCheck,
  FolderArchive,
  Inbox,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { dataStore } from '@/src/services/dataStore';
import { StudentInquiry, InquiryStatus, UserProfile, CannedResponse } from '@/src/types';
import { CannedResponsesModal } from '@/src/components/inquiries/CannedResponsesModal';
import { toast } from 'sonner';

export const TeacherInquiriesPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [inquiries, setInquiries] = useState<StudentInquiry[]>(() => dataStore.getInquiries());
  const classes = useMemo(() => dataStore.getClasses(), []);
  const subjects = useMemo(() => dataStore.getSubjects(), []);
  const allUsers = useMemo(() => dataStore.getUsers(), []);

  // Filter inquiries relevant to this teacher (or all for admin)
  const teacherInquiries = useMemo(() => {
    if (isAdmin) return inquiries;
    return inquiries.filter((inq) => dataStore.isTeacherAssignedToInquiry(inq, profile));
  }, [inquiries, isAdmin, profile]);

  // Filtering state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered' | 'resolved' | 'archived'>('pending');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active inquiry for drawer/modal
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Canned Responses Library modal state
  const [isCannedModalOpen, setIsCannedModalOpen] = useState(false);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>(() =>
    dataStore.getCannedResponses()
  );
  const [inquiryReadsTrigger, setInquiryReadsTrigger] = useState(0);

  // Sync listeners
  useEffect(() => {
    const handleUpdate = () => {
      setInquiries(dataStore.getInquiries());
    };
    const handleReads = () => {
      setInquiryReadsTrigger((v) => v + 1);
    };
    const handleCannedUpdate = () => {
      setCannedResponses(dataStore.getCannedResponses());
    };
    window.addEventListener('eduform_inquiries_updated', handleUpdate);
    window.addEventListener('eduform_inquiry_reads_updated', handleReads);
    window.addEventListener('eduform_canned_responses_updated', handleCannedUpdate);
    return () => {
      window.removeEventListener('eduform_inquiries_updated', handleUpdate);
      window.removeEventListener('eduform_inquiry_reads_updated', handleReads);
      window.removeEventListener('eduform_canned_responses_updated', handleCannedUpdate);
    };
  }, []);

  // Mark inquiry as read when opened by teacher
  useEffect(() => {
    if (activeInquiryId && profile?.uid) {
      dataStore.markInquiryRead(activeInquiryId, profile.uid);
    }
  }, [activeInquiryId, profile?.uid]);

  const activeInquiry = useMemo(() => {
    if (!activeInquiryId) return null;
    return inquiries.find((i) => i.id === activeInquiryId) || null;
  }, [inquiries, activeInquiryId]);

  // Filtered inquiries list
  const filteredInquiries = useMemo(() => {
    return teacherInquiries.filter((inq) => {
      if (statusFilter === 'pending' && inq.status !== 'pending') return false;
      if (statusFilter === 'answered' && inq.status !== 'answered') return false;
      if (statusFilter === 'resolved' && inq.status !== 'resolved') return false;
      if (statusFilter === 'archived' && inq.status !== 'archived') return false;
      if (classFilter !== 'all' && inq.classId !== classFilter) return false;
      if (subjectFilter !== 'all' && inq.subjectId !== subjectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStudent = inq.studentName.toLowerCase().includes(q);
        const matchesTitle = inq.title.toLowerCase().includes(q);
        const matchesSubject = inq.subjectName.toLowerCase().includes(q);
        const matchesBody = inq.question.toLowerCase().includes(q);
        if (!matchesStudent && !matchesTitle && !matchesSubject && !matchesBody) return false;
      }
      return true;
    });
  }, [teacherInquiries, statusFilter, classFilter, subjectFilter, searchQuery]);

  // Stats & Counters
  const pendingCount = teacherInquiries.filter((i) => i.status === 'pending').length;
  const answeredCount = teacherInquiries.filter((i) => i.status === 'answered').length;
  const resolvedCount = teacherInquiries.filter((i) => i.status === 'resolved').length;
  const archivedCount = teacherInquiries.filter((i) => i.status === 'archived').length;
  const unreadCount = teacherInquiries.filter(
    (i) => i.status === 'pending' && !dataStore.isInquiryRead(i.id, profile?.uid)
  ).length;

  // Send reply handler (supports optional resolution or archive)
  const handleSendReply = (
    e: React.FormEvent,
    andAction: 'none' | 'resolve' | 'archive' = 'none'
  ) => {
    e.preventDefault();
    if (!activeInquiry || !replyText.trim()) return;

    setIsSubmittingReply(true);
    const updated = dataStore.addInquiryReply(activeInquiry.id, {
      authorId: profile?.uid || 'teacher',
      authorName: profile?.fullName || 'Teacher',
      authorRole: (profile?.role as any) || 'teacher',
      content: replyText.trim(),
    });

    if (updated) {
      if (andAction === 'resolve') {
        dataStore.resolveInquiry(activeInquiry.id, profile?.uid);
      } else if (andAction === 'archive') {
        dataStore.archiveInquiry(activeInquiry.id, profile?.uid);
      } else {
        dataStore.markInquiryRead(activeInquiry.id, profile?.uid || '');
      }
      setInquiries(dataStore.getInquiries());
      setReplyText('');
      toast.success(
        andAction === 'resolve'
          ? `Response delivered and inquiry marked as resolved!`
          : andAction === 'archive'
          ? `Response delivered and inquiry moved to archive!`
          : `Response delivered to student ${activeInquiry.studentName}! Notification generated.`
      );
    }
    setIsSubmittingReply(false);
  };

  const handleApplyTemplate = (template: string) => {
    if (!activeInquiry) return;
    const filled = dataStore.interpolateCannedResponse(template, {
      studentName: activeInquiry.studentName,
      teacherName: profile?.fullName || 'Teacher',
      subjectName: activeInquiry.subjectName,
      className: activeInquiry.className,
    });
    setReplyText((prev) => (prev ? `${prev}\n\n${filled}` : filled));
  };

  const handleResolve = (inqId: string) => {
    dataStore.resolveInquiry(inqId, profile?.uid);
    setInquiries(dataStore.getInquiries());
    toast.success('Inquiry marked as resolved. Counter decremented.');
  };

  const handleArchive = (inqId: string) => {
    dataStore.archiveInquiry(inqId, profile?.uid);
    setInquiries(dataStore.getInquiries());
    toast.success('Inquiry archived and removed from active queues.');
  };

  const handleUnarchive = (inqId: string) => {
    dataStore.unarchiveInquiry(inqId);
    setInquiries(dataStore.getInquiries());
    toast.success('Inquiry restored from archive.');
  };

  const handleReopen = (inqId: string) => {
    dataStore.reopenInquiry(inqId);
    setInquiries(dataStore.getInquiries());
    toast.success('Inquiry reopened as pending response.');
  };

  const handleSaveCurrentDraftAsCanned = () => {
    if (!replyText.trim() || !activeInquiry) return;
    const cleanSnippet = replyText.trim().slice(0, 36);
    const customTitle = `${activeInquiry.subjectCode}: ${cleanSnippet}...`;
    dataStore.saveCannedResponse({
      id: `canned-custom-${Date.now()}`,
      title: customTitle,
      category: 'custom',
      categoryLabel: 'My Custom Response',
      content: replyText.trim(),
      tags: [activeInquiry.subjectCode.toLowerCase()],
      isCustom: true,
      createdBy: profile?.fullName || 'Teacher',
      createdAt: new Date().toISOString(),
    });
    setCannedResponses(dataStore.getCannedResponses());
    toast.success('Draft saved as reusable response in your library!');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F2A4A] via-[#163c68] to-[#1E3A5F] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> Class Subject Teacher Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Student Inquiries & Academic Q&A
          </h1>
          <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
            Review and respond to questions posed by students enrolled in your class subjects. Deliver
            timely explanations, share worked solutions, and clarify curriculum concepts.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-lg bg-white/10 text-xs font-medium text-slate-200 border border-white/10">
              Assigned Classes:{' '}
              <strong className="text-white">
                {profile?.classIds
                  ? profile.classIds
                      .map((cid) => classes.find((c) => c.id === cid)?.name || cid)
                      .join(', ')
                  : 'All Cohorts'}
              </strong>
            </div>
            {pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> {pendingCount} Question(s) Awaiting
                Your Response
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> All student inquiries
                answered!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Awaiting Reply</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
            <span>Needs feedback</span>
            {unreadCount > 0 && (
              <span className="text-amber-600 font-bold">({unreadCount} unread)</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Answered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{answeredCount}</p>
          <span className="text-[10px] text-slate-400">Response delivered</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Resolved</span>
            <Check className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-700">{resolvedCount}</p>
          <span className="text-[10px] text-slate-400">Closed student questions</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Archived</span>
            <FolderArchive className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{archivedCount}</p>
          <span className="text-[10px] text-slate-400">Stored history</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Inquiries</span>
            <MessageSquare className="w-4 h-4 text-[#0F2A4A]" />
          </div>
          <p className="text-2xl font-bold text-[#0F2A4A]">{teacherInquiries.length}</p>
          <span className="text-[10px] text-slate-400">Across your classes</span>
        </div>
      </div>

      {/* Filter and Inquiries Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                {
                  key: 'pending',
                  label: 'Awaiting Response',
                  count: pendingCount,
                  highlight: 'bg-amber-100 text-amber-800',
                },
                {
                  key: 'answered',
                  label: 'Answered',
                  count: answeredCount,
                  highlight: 'bg-emerald-100 text-emerald-800',
                },
                {
                  key: 'resolved',
                  label: 'Resolved',
                  count: resolvedCount,
                  highlight: 'bg-slate-100 text-slate-700',
                },
                {
                  key: 'archived',
                  label: 'Archived',
                  count: archivedCount,
                  highlight: 'bg-purple-100 text-purple-800',
                },
                { key: 'all', label: 'All Inquiries', count: teacherInquiries.length },
              ].map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
                      isActive
                        ? 'bg-[#0F2A4A] text-white border-[#0F2A4A] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.highlight || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Canned Responses launcher & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCannedModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                title="Open Canned Responses Library"
              >
                <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                <span>Response Library</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-900">
                  {cannedResponses.length}
                </span>
              </button>
            </div>

            {/* Class, Subject & Search Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students / questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20 w-36 sm:w-44"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Inquiries List */}
        {filteredInquiries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No inquiries in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {statusFilter === 'pending'
                ? 'All student questions in your assigned classes have been answered. Outstanding work!'
                : 'No inquiries match your current filter selections.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInquiries.map((inq) => {
              const studentInitial = inq.studentName ? inq.studentName.charAt(0) : 'S';
              const isPending = inq.status === 'pending';
              const messageCount = inq.messages.length;

              return (
                <div
                  key={inq.id}
                  onClick={() => setActiveInquiryId(inq.id)}
                  className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isPending ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Student Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#0F2A4A]/10 text-[#0F2A4A] font-bold text-sm flex items-center justify-center shrink-0 border border-[#0F2A4A]/20">
                      {studentInitial}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{inq.studentName}</span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {inq.className}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#0F2A4A]/5 text-[#0F2A4A] border border-[#0F2A4A]/10">
                          {inq.subjectCode} &bull; {inq.subjectName}
                        </span>

                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-700" /> Awaiting Response
                          </span>
                        ) : inq.status === 'answered' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Answered
                          </span>
                        ) : inq.status === 'resolved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Check className="w-3 h-3 text-slate-500" /> Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <FolderArchive className="w-3 h-3 text-purple-600" /> Archived
                          </span>
                        )}

                        {!dataStore.isInquiryRead(inq.id, profile?.uid) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Unread
                          </span>
                        )}

                        {inq.priority === 'urgent' && (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Urgent
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{inq.title}</h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {inq.question}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span>Submitted {new Date(inq.createdAt).toLocaleDateString()} at {new Date(inq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>&bull;</span>
                        <span>{messageCount} message(s) in thread</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {inq.status !== 'resolved' && inq.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(inq.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                        title="Mark inquiry as resolved"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Resolve</span>
                      </button>
                    )}

                    {inq.status !== 'archived' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(inq.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-colors"
                        title="Archive question"
                      >
                        <Archive className="w-3.5 h-3.5 text-slate-500" />
                        <span>Archive</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchive(inq.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 cursor-pointer transition-colors"
                        title="Restore question from archive"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        <span>Restore</span>
                      </button>
                    )}

                    {inq.status === 'resolved' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReopen(inq.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-colors"
                        title="Reopen inquiry as pending"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>Reopen</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveInquiryId(inq.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors ${
                        isPending
                          ? 'bg-[#0F2A4A] hover:bg-[#163c68] text-white font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isPending ? 'Reply to Student' : 'View Dialogue'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Teacher Answer / Dialogue Modal */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-xs text-slate-900">{activeInquiry.studentName}</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {activeInquiry.className}
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#0F2A4A]/5 text-[#0F2A4A] border border-[#0F2A4A]/10">
                    {activeInquiry.subjectCode} &bull; {activeInquiry.subjectName}
                  </span>
                  {activeInquiry.status === 'pending' ? (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Needs Response
                    </span>
                  ) : activeInquiry.status === 'answered' ? (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Answered
                    </span>
                  ) : activeInquiry.status === 'resolved' ? (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Resolved
                    </span>
                  ) : (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      Archived
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900">{activeInquiry.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Submitted on {new Date(activeInquiry.createdAt).toLocaleDateString()} at{' '}
                  {new Date(activeInquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveInquiryId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {activeInquiry.messages.map((msg) => {
                const isStudent = msg.authorRole === 'student';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      !isStudent ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-bold text-slate-700">{msg.authorName}</span>
                      {isStudent ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                          Student
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Subject Teacher
                        </span>
                      )}
                      <span>&bull;</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        !isStudent
                          ? 'bg-[#0F2A4A] text-white rounded-tr-xs shadow-2xs'
                          : 'bg-slate-100 text-slate-800 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Response Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {/* Canned Response Library Trigger & Quick Starters */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Response Starters:
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCannedModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    <span>Canned Responses Library ({cannedResponses.length})</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    `Hi {name}! Excellent question on this topic. Here is the principle:`,
                    `Hello {name}, to solve this, remember to check Section 2 of our lesson notes:`,
                    `Hi {name}, let's work through this step by step:`,
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium cursor-pointer transition-colors"
                    >
                      +{tpl.slice(0, 28)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={(e) => handleSendReply(e, 'none')} className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={`Write your educational explanation for ${activeInquiry.studentName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20 leading-relaxed font-sans"
                  />
                  {replyText.trim() && (
                    <button
                      type="button"
                      onClick={handleSaveCurrentDraftAsCanned}
                      className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs"
                      title="Save this reply to Canned Responses Library for future students"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Save as Template</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    {activeInquiry.status !== 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => handleResolve(activeInquiry.id)}
                        className="text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Mark as resolved and decrement pending counter"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mark Resolved</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReopen(activeInquiry.id)}
                        className="text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Reopen</span>
                      </button>
                    )}

                    {activeInquiry.status !== 'archived' ? (
                      <button
                        type="button"
                        onClick={() => handleArchive(activeInquiry.id)}
                        className="text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Archive inquiry and remove from active counter"
                      >
                        <Archive className="w-3.5 h-3.5 text-slate-500" />
                        <span>Archive</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnarchive(activeInquiry.id)}
                        className="text-xs text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        <span>Restore Active</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {replyText.trim() && (
                      <>
                        <button
                          type="button"
                          disabled={isSubmittingReply}
                          onClick={(e) => handleSendReply(e, 'resolve')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-40 shadow-xs transition-colors"
                          title="Send explanation and immediately mark inquiry as resolved"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Send &amp; Resolve</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReply}
                          onClick={(e) => handleSendReply(e, 'archive')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-40 shadow-xs transition-colors"
                          title="Send explanation and move inquiry to archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Send &amp; Archive</span>
                        </button>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReply || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold cursor-pointer disabled:opacity-40 shadow-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReply ? 'Delivering...' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Canned Responses Library Modal */}
      <CannedResponsesModal
        isOpen={isCannedModalOpen}
        onClose={() => setIsCannedModalOpen(false)}
        onSelectResponse={(text, mode) => {
          setReplyText((prev) =>
            mode === 'append' && prev ? `${prev}\n\n${text}` : text
          );
        }}
        studentName={activeInquiry?.studentName || 'Student'}
        teacherName={profile?.fullName || 'Teacher'}
        subjectName={activeInquiry?.subjectName || 'Subject'}
        className={activeInquiry?.className || 'Class'}
        currentDraftText={replyText}
      />
    </div>
  );
};
