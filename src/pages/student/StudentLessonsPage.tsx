import React, { useState } from 'react';
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
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';
import { Lesson } from '@/src/types';

export const StudentLessonsPage: React.FC = () => {
  const { profile } = useAuth();
  const lessons = dataStore.getLessons();
  const subjects = dataStore.getSubjects();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Filter lessons matching student's enrolled classes or published for all
  const studentLessons = lessons.filter(
    (l) =>
      l.status === 'published' &&
      (!profile?.classIds.length || l.classIds.some((cid) => profile.classIds.includes(cid)))
  );

  const getSubjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || subjId;

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

  if (selectedLesson) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelectedLesson(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Lessons
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
              {getSubjectName(selectedLesson.subjectId)}
            </span>
            <span className="text-xs text-slate-400">
              • Published {new Date(selectedLesson.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2A4A]">
            {selectedLesson.title}
          </h1>

          {/* Attached Course Materials Box */}
          {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
            <div className="mt-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                <Paperclip className="w-4 h-4 text-emerald-600" />
                <span>Downloadable Courseware Attachments ({selectedLesson.attachments.length}):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedLesson.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded bg-slate-50 shrink-0">
                        {getAttachmentIcon(att.type)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 text-xs block truncate" title={att.name}>
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
                      title="Download or open attachment"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Get File</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rendered Lesson Body Notes with Rich Text Styling */}
          <div
            className="mt-8 pt-6 border-t border-slate-100 text-sm text-slate-800 space-y-4 leading-relaxed rich-text-content"
            dangerouslySetInnerHTML={{ __html: selectedLesson.bodyHtml }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-600" /> Class Lesson Library
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Lecture notes and curated educational materials for your enrolled classes ({studentLessons.length} available lessons)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {studentLessons.map((lesson) => {
          return (
            <div
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                    {getSubjectName(lesson.subjectId)}
                  </span>
                  {lesson.attachments && lesson.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Paperclip className="w-3 h-3" /> {lesson.attachments.length} {lesson.attachments.length === 1 ? 'file' : 'files'}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-[#0F2A4A] mt-3 line-clamp-2">
                  {lesson.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3">
                  Click to open the complete lesson note, worked examples, and references.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-semibold">
                <span>Read Lesson Note</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
