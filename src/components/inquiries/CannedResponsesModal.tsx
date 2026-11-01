import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  BookMarked,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  GraduationCap,
  HelpCircle,
  FileText,
  Clock,
  HeartHandshake,
  MessageSquare,
  CornerDownRight,
  Filter,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { CannedResponse, CannedResponseCategory } from '@/src/types';
import { toast } from 'sonner';

interface CannedResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResponse: (text: string, mode: 'replace' | 'append') => void;
  studentName?: string;
  teacherName?: string;
  subjectName?: string;
  className?: string;
  currentDraftText?: string;
}

const CATEGORIES: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'all', label: 'All Responses', icon: BookMarked },
  { key: 'worked_solutions', label: 'Worked Solutions', icon: GraduationCap },
  { key: 'lesson_reference', label: 'Study References', icon: FileText },
  { key: 'explanations', label: 'Explanations', icon: Sparkles },
  { key: 'clarification', label: 'Clarifications', icon: HelpCircle },
  { key: 'encouragement', label: 'Encouragement', icon: HeartHandshake },
  { key: 'office_hours', label: 'Office Hours', icon: Clock },
  { key: 'custom', label: 'My Custom', icon: MessageSquare },
];

export const CannedResponsesModal: React.FC<CannedResponsesModalProps> = ({
  isOpen,
  onClose,
  onSelectResponse,
  studentName = 'Alex',
  teacherName = 'Teacher',
  subjectName = 'Mathematics',
  className = 'Basic 6 Alpha',
  currentDraftText = '',
}) => {
  const [responses, setResponses] = useState<CannedResponse[]>(() =>
    dataStore.getCannedResponses()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Custom Template Form State
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CannedResponseCategory>('custom');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  // Sync with datastore updates
  useEffect(() => {
    const handleUpdate = () => {
      setResponses(dataStore.getCannedResponses());
    };
    window.addEventListener('eduform_canned_responses_updated', handleUpdate);
    return () => window.removeEventListener('eduform_canned_responses_updated', handleUpdate);
  }, []);

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responses.filter((item) => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'custom') {
          if (!item.isCustom) return false;
        } else if (item.category !== selectedCategory) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags) return false;
      }
      return true;
    });
  }, [responses, selectedCategory, searchQuery]);

  // Set default preview if current previewId not in filtered list
  useEffect(() => {
    if (filteredResponses.length > 0) {
      if (!previewId || !filteredResponses.some((r) => r.id === previewId)) {
        setPreviewId(filteredResponses[0].id);
      }
    } else {
      setPreviewId(null);
    }
  }, [filteredResponses, previewId]);

  const activeResponse = useMemo(() => {
    return responses.find((r) => r.id === previewId) || filteredResponses[0] || null;
  }, [responses, previewId, filteredResponses]);

  // Interpolated text with real placeholders
  const getInterpolated = (raw: string) => {
    return dataStore.interpolateCannedResponse(raw, {
      studentName,
      teacherName,
      subjectName,
      className,
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied template to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please enter a title and template text.');
      return;
    }

    const custom: CannedResponse = {
      id: `canned-custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      categoryLabel: CATEGORIES.find((c) => c.key === newCategory)?.label || 'Custom Response',
      content: newContent.trim(),
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isCustom: true,
      createdBy: teacherName,
      createdAt: new Date().toISOString(),
    };

    dataStore.saveCannedResponse(custom);
    setResponses(dataStore.getCannedResponses());
    setIsCreatingCustom(false);
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setPreviewId(custom.id);
    toast.success('New canned response saved to your library!');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dataStore.deleteCannedResponse(id);
    setResponses(dataStore.getCannedResponses());
    toast.success('Template removed from library.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
              <BookMarked className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 font-serif">
                  Canned Responses Library
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {responses.length} Templates
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardized, high-impact pedagogical explanations &amp; guidance tailored for {studentName} ({subjectName})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingCustom && (
              <button
                type="button"
                onClick={() => setIsCreatingCustom(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Template</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        {isCreatingCustom ? (
          /* Create New Custom Template Panel */
          <form onSubmit={handleSaveCustom} className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600" /> Dynamic Variable Substitution
              </div>
              <p className="text-[11px] text-amber-800">
                You can insert any of these automatic placeholders in your template:
              </p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                <code className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900">
                  {'{student_name}'}
                </code>
                <code className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900">
                  {'{teacher_name}'}
                </code>
                <code className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900">
                  {'{subject_name}'}
                </code>
                <code className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900">
                  {'{class_name}'}
                </code>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Quadratic Formula Step-by-Step, Lab Safety Reminder..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F2A4A]/20 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-[#0F2A4A]/20 focus:outline-hidden"
                  >
                    {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Search Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., algebra, formula, revision"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#0F2A4A]/20 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  placeholder={`Hi {student_name},\n\nWhen working on this {subject_name} exercise, remember to...`}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs leading-relaxed focus:ring-2 focus:ring-[#0F2A4A]/20 focus:outline-hidden font-sans"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Save to Response Library
              </button>
            </div>
          </form>
        ) : (
          /* Normal Library View: List & Live Preview */
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            {/* Search and Category Filters */}
            <div className="space-y-2.5 pb-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search canned templates by title, content, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F2A4A]/20"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.key;
                  const count =
                    cat.key === 'all'
                      ? responses.length
                      : cat.key === 'custom'
                      ? responses.filter((r) => r.isCustom).length
                      : responses.filter((r) => r.category === cat.key).length;

                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-all border ${
                        isActive
                          ? 'bg-[#0F2A4A] text-white border-[#0F2A4A] shadow-2xs font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split View: Template List (Left) and Live Preview (Right) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 pt-3 overflow-hidden">
              {/* Left Column: Response Card List */}
              <div className="md:col-span-5 overflow-y-auto space-y-2 pr-1 max-h-[50vh] md:max-h-full">
                {filteredResponses.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <BookMarked className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No responses match your search</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try a different category or create a custom template.</p>
                  </div>
                ) : (
                  filteredResponses.map((item) => {
                    const isSelected = activeResponse?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setPreviewId(item.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative group ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {item.title}
                          </h4>
                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(item.id, e)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete custom response"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {item.categoryLabel}
                          </span>
                          {item.isCustom && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              My Custom
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed font-sans">
                          {getInterpolated(item.content)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Live Contextual Preview & Insertion Actions */}
              <div className="md:col-span-7 flex flex-col bg-slate-50/80 rounded-xl border border-slate-200 p-4 overflow-hidden">
                {activeResponse ? (
                  <>
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/80 shrink-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F2A4A] text-white">
                            {activeResponse.categoryLabel}
                          </span>
                          {activeResponse.isCustom && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Custom Template
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeResponse.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Context applied: <strong>{studentName}</strong> &bull; {subjectName} ({className})
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(getInterpolated(activeResponse.content), activeResponse.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                        title="Copy to clipboard"
                      >
                        {copiedId === activeResponse.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Preview Box */}
                    <div className="flex-1 overflow-y-auto my-3 bg-white p-3.5 rounded-lg border border-slate-200/80 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans shadow-2xs">
                      {getInterpolated(activeResponse.content)}
                    </div>

                    {/* Quick Insertion Actions */}
                    <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
                      <span className="text-[11px] text-slate-500">
                        {currentDraftText.trim() ? 'Current draft has text' : 'Draft is empty'}
                      </span>

                      <div className="flex items-center gap-2">
                        {currentDraftText.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectResponse(getInterpolated(activeResponse.content), 'append');
                              onClose();
                              toast.success('Appended response to current reply.');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Append to Draft</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onSelectResponse(getInterpolated(activeResponse.content), 'replace');
                            onClose();
                            toast.success('Inserted response into reply box.');
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Use This Response</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <BookMarked className="w-10 h-10 mb-2 text-slate-300" />
                    <p className="text-xs font-medium">Select a response on the left to preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
