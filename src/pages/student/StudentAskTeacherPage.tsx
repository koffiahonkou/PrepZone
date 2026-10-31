import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
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
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { dataStore } from '@/src/services/dataStore';
import { StudentInquiry, InquiryStatus, UserProfile, Subject } from '@/src/types';
import { toast } from 'sonner';

export const StudentAskTeacherPage: React.FC = () => {
  const { profile } = useAuth();
  const [inquiries, setInquiries] = useState<StudentInquiry[]>(() =>
    dataStore.getInquiriesByStudent(profile?.uid || '')
  );
  const classes = useMemo(() => dataStore.getClasses(), []);
  const subjects = useMemo(() => dataStore.getSubjects(), []);
  const allUsers = useMemo(() => dataStore.getUsers(), []);

  // Primary student class
  const studentClassId = profile?.classIds?.[0] || '';
  const currentClass = useMemo(
    () => classes.find((c) => c.id === studentClassId),
    [classes, studentClassId]
  );

  // Available subjects for student's class
  const classSubjects = useMemo(() => {
    if (!currentClass) return subjects;
    return subjects.filter((s) => currentClass.subjectIds?.includes(s.id));
  }, [currentClass, subjects]);

  // Modal and composer state
  const [isNewQuestionOpen, setIsNewQuestionOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionBody, setQuestionBody] = useState('');
  const [questionPriority, setQuestionPriority] = useState<'normal' | 'urgent'>('normal');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'answered' | 'resolved'>('all');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Active viewing inquiry thread
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Listen for dataStore updates
  useEffect(() => {
    const handleUpdate = () => {
      setInquiries(dataStore.getInquiriesByStudent(profile?.uid || ''));
    };
    window.addEventListener('eduform_inquiries_updated', handleUpdate);
    return () => window.removeEventListener('eduform_inquiries_updated', handleUpdate);
  }, [profile?.uid]);

  // Auto-detect teacher when subject changes in composer
  useEffect(() => {
    if (selectedSubjectId && studentClassId) {
      const teacher = dataStore.getTeacherForClassSubject(studentClassId, selectedSubjectId);
      if (teacher) {
        setSelectedTeacherId(teacher.uid);
      } else {
        setSelectedTeacherId('');
      }
    }
  }, [selectedSubjectId, studentClassId]);

  // Designated teacher for selected subject
  const currentAssignedTeacher = useMemo(() => {
    if (!selectedTeacherId) return undefined;
    return allUsers.find((u) => u.uid === selectedTeacherId);
  }, [allUsers, selectedTeacherId]);

  // Filtered inquiries list
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (activeTab === 'pending' && inq.status !== 'pending') return false;
      if (activeTab === 'answered' && inq.status !== 'answered') return false;
      if (activeTab === 'resolved' && inq.status !== 'resolved') return false;
      if (filterSubjectId !== 'all' && inq.subjectId !== filterSubjectId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = inq.title.toLowerCase().includes(q);
        const matchesSubject = inq.subjectName.toLowerCase().includes(q);
        const matchesTeacher = inq.teacherName.toLowerCase().includes(q);
        const matchesBody = inq.question.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesTeacher && !matchesBody) return false;
      }
      return true;
    });
  }, [inquiries, activeTab, filterSubjectId, searchQuery]);

  // Currently active thread object
  const activeInquiry = useMemo(() => {
    if (!activeInquiryId) return null;
    return inquiries.find((i) => i.id === activeInquiryId) || null;
  }, [inquiries, activeInquiryId]);

  // Open composer with preselected subject
  const handleOpenAskModal = (subjectId?: string) => {
    const initialSubject = subjectId || (classSubjects[0]?.id ?? '');
    setSelectedSubjectId(initialSubject);
    if (initialSubject && studentClassId) {
      const teacher = dataStore.getTeacherForClassSubject(studentClassId, initialSubject);
      setSelectedTeacherId(teacher?.uid || '');
    }
    setQuestionTitle('');
    setQuestionBody('');
    setQuestionPriority('normal');
    setIsNewQuestionOpen(true);
  };

  // Submit new inquiry to teacher
  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      toast.error('Please select an academic subject.');
      return;
    }
    if (!questionTitle.trim()) {
      toast.error('Please provide a brief topic or title for your question.');
      return;
    }
    if (!questionBody.trim()) {
      toast.error('Please describe your question in detail.');
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
    const targetTeacher =
      allUsers.find((u) => u.uid === selectedTeacherId) ||
      dataStore.getTeacherForClassSubject(studentClassId, selectedSubjectId);

    if (!targetTeacher) {
      toast.error('Could not identify the assigned subject teacher. Please notify administration.');
      return;
    }

    setSubmitting(true);

    const nowIso = new Date().toISOString();
    const newInquiryId = `inq-${Date.now()}`;
    const newInquiry: StudentInquiry = {
      id: newInquiryId,
      studentId: profile?.uid || 'demo-student-alex',
      studentName: profile?.fullName || 'Student',
      studentUsername: profile?.username || 'student',
      classId: studentClassId || 'class-jss1-a',
      className: currentClass?.name || 'Class Stream',
      subjectId: selectedSubjectId,
      subjectName: selectedSubject?.name || 'Subject',
      subjectCode: selectedSubject?.code || 'SUB101',
      teacherId: targetTeacher.uid,
      teacherName: targetTeacher.fullName,
      title: questionTitle.trim(),
      question: questionBody.trim(),
      priority: questionPriority,
      status: 'pending',
      messages: [
        {
          id: `msg-${Date.now()}-initial`,
          authorId: profile?.uid || 'demo-student-alex',
          authorName: profile?.fullName || 'Student',
          authorRole: 'student',
          content: questionBody.trim(),
          createdAt: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save and sync
    dataStore.saveInquiry(newInquiry);

    // Notify teacher via in-app notification system
    const notif = {
      id: `notif-inq-${Date.now()}`,
      title: `New Student Question: ${selectedSubject?.name}`,
      bodyHtml: `<p><strong>${newInquiry.studentName}</strong> (${newInquiry.className}) submitted a new question on <strong>${newInquiry.subjectName}</strong>: "<em>${newInquiry.title}</em>"</p>`,
      priority: questionPriority === 'urgent' ? ('high' as const) : ('normal' as const),
      audience: {
        type: 'user' as const,
        ids: [targetTeacher.uid],
      },
      createdBy: profile?.uid || 'student',
      createdAt: nowIso,
      expiresAt: null,
      status: 'published' as const,
    };
    dataStore.saveNotification(notif);

    // Add audit log
    dataStore.addAuditLog({
      actorId: profile?.uid || 'student',
      action: 'STUDENT_INQUIRY_CREATED',
      targetType: 'inquiry',
      targetId: newInquiryId,
      meta: {
        subject: newInquiry.subjectName,
        teacher: newInquiry.teacherName,
        title: newInquiry.title,
      },
    });

    setInquiries(dataStore.getInquiriesByStudent(profile?.uid || ''));
    setSubmitting(false);
    setIsNewQuestionOpen(false);

    toast.success(
      `Your question was sent directly to ${targetTeacher.fullName}! You will receive a notification when they reply.`
    );

    // Open active thread
    setActiveInquiryId(newInquiryId);
  };

  // Submit student follow-up reply in thread
  const handleSendFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !replyText.trim()) return;

    setReplySubmitting(true);
    const updated = dataStore.addInquiryReply(activeInquiry.id, {
      authorId: profile?.uid || 'student',
      authorName: profile?.fullName || 'Student',
      authorRole: 'student',
      content: replyText.trim(),
    });

    if (updated) {
      setInquiries(dataStore.getInquiriesByStudent(profile?.uid || ''));
      setReplyText('');
      toast.success('Your follow-up reply was sent to your teacher.');
    }
    setReplySubmitting(false);
  };

  // Mark inquiry as resolved
  const handleMarkResolved = (inqId: string) => {
    dataStore.resolveInquiry(inqId);
    setInquiries(dataStore.getInquiriesByStudent(profile?.uid || ''));
    toast.success('Question marked as resolved. Glad your teacher could help!');
  };

  // Delete inquiry
  const handleDeleteInquiry = (inqId: string) => {
    dataStore.deleteInquiry(inqId);
    setInquiries(dataStore.getInquiriesByStudent(profile?.uid || ''));
    if (activeInquiryId === inqId) {
      setActiveInquiryId(null);
    }
    toast.info('Question withdrawn.');
  };

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-[#0F2A4A] via-[#163c68] to-[#1E3A5F] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Direct Subject Teacher Assistance
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Ask Your Subject Teacher
          </h1>
          <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
            Need clarification on lesson notes, homework proofs, or revision questions? Select your
            subject to route your question directly to the teacher assigned to your class stream (
            <span className="font-semibold text-white">{currentClass?.name || 'Your Class'}</span>).
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenAskModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Pose a New Question
            </button>
            <span className="text-xs text-slate-300">
              {inquiries.length} question(s) asked &bull;{' '}
              {inquiries.filter((i) => i.status === 'answered').length} answered
            </span>
          </div>
        </div>
      </div>

      {/* Subject Teacher Directory Quick Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0F2A4A] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" /> Teachers Taking Subjects in Your
              Class ({currentClass?.name || 'Class'})
            </h2>
            <p className="text-[11px] text-slate-500">
              Click "Ask Teacher" on any subject to initiate an inquiry with your designated educator.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {classSubjects.map((subj) => {
            const assignedTeacher = dataStore.getTeacherForClassSubject(studentClassId, subj.id);
            const teacherInquiries = inquiries.filter((i) => i.subjectId === subj.id);
            const pendingForSubj = teacherInquiries.filter((i) => i.status === 'pending').length;

            return (
              <div
                key={subj.id}
                className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F2A4A]/5 text-[#0F2A4A] border border-[#0F2A4A]/10">
                      {subj.code}
                    </span>
                    {pendingForSubj > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {pendingForSubj} pending
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{subj.name}</h3>

                  <div className="mt-2.5 flex items-center gap-2 pt-2.5 border-t border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                      {assignedTeacher ? assignedTeacher.fullName.charAt(0) : 'T'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {assignedTeacher ? assignedTeacher.fullName : 'Subject Department'}
                      </p>
                      <p className="text-[10px] text-slate-400">Class Subject Educator</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAskModal(subj.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-[#0F2A4A] hover:text-white text-slate-700 border border-slate-200 hover:border-[#0F2A4A] transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Question</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inquiries Tabs, Filter & History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'all', label: 'All Inquiries', count: inquiries.length },
                {
                  key: 'pending',
                  label: 'Awaiting Reply',
                  count: inquiries.filter((i) => i.status === 'pending').length,
                  badge: 'bg-amber-100 text-amber-800',
                },
                {
                  key: 'answered',
                  label: 'Answered',
                  count: inquiries.filter((i) => i.status === 'answered').length,
                  badge: 'bg-emerald-100 text-emerald-800',
                },
                {
                  key: 'resolved',
                  label: 'Resolved',
                  count: inquiries.filter((i) => i.status === 'resolved').length,
                  badge: 'bg-slate-100 text-slate-700',
                },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
                      isActive
                        ? 'bg-[#0F2A4A] text-white border-[#0F2A4A] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : tab.badge || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Subject Selector & Search */}
            <div className="flex items-center gap-2">
              <select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20"
              >
                <option value="all">All Subjects</option>
                {classSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20 w-36 sm:w-48"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {filteredInquiries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <MessageCircleQuestion className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No questions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || filterSubjectId !== 'all' || activeTab !== 'all'
                ? 'No inquiries match your current filter criteria. Try clearing filters.'
                : 'You have not posed any questions to your subject teachers yet.'}
            </p>
            <button
              type="button"
              onClick={() => handleOpenAskModal()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Ask a Question Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInquiries.map((inq) => {
              const teacherReplies = inq.messages.filter((m) => m.authorRole === 'teacher' || m.authorRole === 'admin');
              const lastMessage = inq.messages[inq.messages.length - 1];

              return (
                <div
                  key={inq.id}
                  onClick={() => setActiveInquiryId(inq.id)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F2A4A]/5 text-[#0F2A4A] border border-[#0F2A4A]/10">
                        {inq.subjectCode} &bull; {inq.subjectName}
                      </span>

                      {inq.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Awaiting Teacher Reply
                        </span>
                      )}

                      {inq.status === 'answered' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Teacher Answered ({teacherReplies.length})
                        </span>
                      )}

                      {inq.status === 'resolved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Check className="w-3 h-3 text-slate-500" /> Resolved
                        </span>
                      )}

                      {inq.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Urgent
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 hover:text-[#0F2A4A] transition-colors line-clamp-1">
                      {inq.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-1">{inq.question}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <User className="w-3 h-3 text-indigo-500" />
                        Teacher: {inq.teacherName}
                      </span>
                      <span>&bull;</span>
                      <span>Submitted {new Date(inq.createdAt).toLocaleDateString()}</span>
                      {lastMessage && lastMessage.authorRole !== 'student' && (
                        <>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-medium">
                            Latest response from {lastMessage.authorName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveInquiryId(inq.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-2xs transition-colors"
                    >
                      <span>View Thread</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {inq.status === 'pending' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInquiry(inq.id);
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Withdraw pending question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Pose a New Question to Assigned Subject Teacher */}
      {isNewQuestionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#0F2A4A]">
                <MessageCircleQuestion className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif font-bold text-base sm:text-lg">
                  Pose Question to Subject Teacher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewQuestionOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuestion} className="space-y-4 mt-4 text-xs">
              {/* Step 1: Subject Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Academic Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20"
                  required
                >
                  <option value="" disabled>
                    -- Choose Subject --
                  </option>
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Assigned Subject Teacher Card */}
              {selectedSubjectId && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-indigo-100 flex items-start gap-3 animate-in fade-in">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-sm text-indigo-800 shrink-0 mt-0.5">
                    {currentAssignedTeacher ? currentAssignedTeacher.fullName.charAt(0) : 'T'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {currentAssignedTeacher ? currentAssignedTeacher.fullName : 'Designated Subject Teacher'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <ShieldCheck className="w-2.5 h-2.5 text-indigo-600" /> Assigned Teacher
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Assigned to teach {subjects.find((s) => s.id === selectedSubjectId)?.name} in{' '}
                      <strong>{currentClass?.name || 'Your Class'}</strong>.
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium mt-1">
                      &bull; Questions are delivered instantly to this teacher's portal inbox.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Question Topic / Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Question Topic or Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Difficulty understanding quadratic formula proof in Lesson 2"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20"
                  maxLength={150}
                  required
                />
                {/* Quick topic pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                  <span className="text-slate-400">Quick suggestions:</span>
                  {[
                    'Homework Help',
                    'Lesson Clarification',
                    'Exam Preparation',
                    'Formula Working',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setQuestionTitle((prev) => (prev ? `${prev} - ${sug}` : sug))}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      +{sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Question Details */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Question Details & Workings <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your question clearly. Mention any specific equations, problem numbers, or paragraphs from the lesson notes you need help with..."
                  value={questionBody}
                  onChange={(e) => setQuestionBody(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20 leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Step 4: Urgency Level */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Urgency Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionPriority('normal')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      questionPriority === 'normal'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold block text-xs">Normal Inquiry</span>
                    <span className="text-[10px] text-slate-500">General lesson question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionPriority('urgent')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      questionPriority === 'urgent'
                        ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-1 ring-rose-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold block text-xs">Urgent</span>
                    <span className="text-[10px] text-slate-500">Upcoming quiz or homework deadline</span>
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewQuestionOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white font-semibold cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Sending to Teacher...' : 'Send Question to Teacher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Thread Drawer: Interactive Q&A Thread with Teacher */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            {/* Thread Header */}
            <div className="pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F2A4A]/5 text-[#0F2A4A] border border-[#0F2A4A]/10">
                    {activeInquiry.subjectCode} &bull; {activeInquiry.subjectName}
                  </span>
                  {activeInquiry.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" /> Awaiting Teacher Reply
                    </span>
                  )}
                  {activeInquiry.status === 'answered' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Teacher Answered
                    </span>
                  )}
                  {activeInquiry.status === 'resolved' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      <Check className="w-3 h-3 text-slate-500" /> Resolved
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  {activeInquiry.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct conversation with{' '}
                  <strong className="text-indigo-900">{activeInquiry.teacherName}</strong> for{' '}
                  {activeInquiry.className}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveInquiryId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thread Conversation Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {activeInquiry.messages.map((msg, idx) => {
                const isStudent = msg.authorRole === 'student';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isStudent ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-bold text-slate-700">
                        {isStudent ? 'You' : msg.authorName}
                      </span>
                      {!isStudent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Subject Teacher
                        </span>
                      )}
                      <span>&bull;</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isStudent
                          ? 'bg-[#0F2A4A] text-white rounded-tr-xs shadow-2xs'
                          : 'bg-indigo-50/70 text-slate-800 border border-indigo-100 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {activeInquiry.status === 'pending' && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Your question is in <strong>{activeInquiry.teacherName}</strong>'s portal inbox.
                    You will be notified once they reply.
                  </span>
                </div>
              )}
            </div>

            {/* Follow-up composer or Resolution Action */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              {activeInquiry.status !== 'resolved' ? (
                <form onSubmit={handleSendFollowUp} className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-600" /> Need to ask a
                      follow-up question?
                    </span>
                    {activeInquiry.status === 'answered' && (
                      <button
                        type="button"
                        onClick={() => handleMarkResolved(activeInquiry.id)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                      >
                        ✓ Mark as Answered & Resolved
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Reply back to ${activeInquiry.teacherName}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20"
                    />
                    <button
                      type="submit"
                      disabled={replySubmitting || !replyText.trim()}
                      className="px-4 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold cursor-pointer disabled:opacity-40 flex items-center gap-1 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> This question thread has
                    been marked as resolved.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAskModal(activeInquiry.subjectId)}
                    className="px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white text-[11px] font-semibold hover:bg-[#163c68]"
                  >
                    Ask New Question
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
