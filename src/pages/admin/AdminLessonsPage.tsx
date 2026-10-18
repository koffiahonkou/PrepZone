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
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { Lesson, LessonAttachment } from '@/src/types';
import { RichTextEditor } from '@/src/components/common/RichTextEditor';
import { toast } from 'sonner';

export const AdminLessonsPage: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>(() => dataStore.getLessons());
  const subjects = dataStore.getSubjects();
  const classes = dataStore.getClasses();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubjectId, setFormSubjectId] = useState(subjects[0]?.id || '');
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formBodyHtml, setFormBodyHtml] = useState('');
  
  // Attachments State
  const [formAttachments, setFormAttachments] = useState<LessonAttachment[]>([]);
  const [newAttName, setNewAttName] = useState('');
  const [newAttType, setNewAttType] = useState('pdf');
  const [newAttUrl, setNewAttUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);

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
    setIsModalOpen(true);
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

    if (editingLesson) {
      const updated: Lesson = {
        ...editingLesson,
        title: formTitle.trim(),
        subjectId: formSubjectId,
        classIds: formClassIds,
        status: formStatus,
        bodyHtml: formBodyHtml,
        attachments: formAttachments,
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
        createdBy: 'Dr. Evelyn Reed (Admin)',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Lesson Notes & Courseware
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Author and publish rich classroom lesson materials filtered by target class streams ({lessons.length} notes)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add New Lesson Note
        </button>
      </div>

      <div className="space-y-4">
        {lessons.map((lesson) => {
          const subjName = getSubjectName(lesson.subjectId);

          return (
            <div
              key={lesson.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                    {subjName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      lesson.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {lesson.status === 'published' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Published
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" /> Draft
                      </>
                    )}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#0F2A4A] mt-2">{lesson.title}</h3>

                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-semibold text-slate-500">Target Classes:</span>
                  {lesson.classIds?.map((cid) => (
                    <span
                      key={cid}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700"
                    >
                      {getClassName(cid)}
                    </span>
                  ))}
                </div>

                {lesson.attachments && lesson.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-900 transition-colors shadow-2xs"
                          title="Click to download or view attachment"
                        >
                          {getAttachmentIcon(att.type)}
                          <span className="underline truncate max-w-xs">{att.name}</span>
                          {att.size && (
                            <span className="text-[10px] text-emerald-600 font-normal">
                              ({att.size})
                            </span>
                          )}
                          <Download className="w-3 h-3 text-emerald-700 ml-0.5" />
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
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit lesson"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(lesson)}
                    className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-400 block">
                  Updated {new Date(lesson.updatedAt).toLocaleDateString()}
                </span>
                <span className="text-[11px] text-slate-500 block">Author: {lesson.createdBy}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Lesson Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0F2A4A]">
                {editingLesson ? 'Edit Lesson Note' : 'Add New Lesson Note'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Lesson Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemical Bonding & Molecular Geometry"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'draft' | 'published')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                  >
                    <option value="published">Published (Visible to Students)</option>
                    <option value="draft">Draft (Private)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Target Classes
                </label>
                <div className="grid grid-cols-2 gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                  {classes.map((c) => {
                    const isChecked = formClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
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

              <div>
                <RichTextEditor
                  label="Lesson Body Content"
                  value={formBodyHtml}
                  onChange={setFormBodyHtml}
                  placeholder="Compose lecture notes, bold key terms, add bullet lists, or quote formulas..."
                  minHeight="220px"
                />
              </div>

              {/* ATTACHMENT SECTION */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-emerald-600" />
                      Lesson Attachments & Resources ({formAttachments.length})
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
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
                    <UploadCloud className="w-4 h-4" /> Upload Local File
                  </button>
                </div>

                {/* Preset Fast-Add Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetAttachment('Chapter_Practice_Worksheet.pdf', 'pdf', '1.2 MB')
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    + Practice Worksheet (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetAttachment('Lecture_Slide_Deck.pptx', 'slides', '3.5 MB')
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    + Lecture Slides (PPTX)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetAttachment('Formula_Cheat_Sheet.pdf', 'pdf', '480 KB')
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    + Formula Sheet (PDF)
                  </button>
                </div>

                {/* Manual Add Input Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-200/60">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Or enter resource name (e.g. Workbook_Ex_4.pdf)"
                      value={newAttName}
                      onChange={(e) => setNewAttName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={newAttType}
                      onChange={(e) => setNewAttType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
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
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Attached Materials to Save:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {formAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded bg-slate-100 shrink-0">
                              {getAttachmentIcon(att.type)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 block truncate">
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
                                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Download uploaded file preview"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                  <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No attachments added yet. Click &quot;Upload Local File&quot; or choose a quick preset above.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white"
                >
                  {editingLesson ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Delete Lesson Note?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deleteTarget.title}</strong>? Students will no longer have access to these materials.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
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
