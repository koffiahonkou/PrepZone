import React, { useState } from 'react';
import {
  Award,
  Download,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Filter,
  Users,
  Search,
  BookOpen,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { toast } from 'sonner';

export const AdminGradebookPage: React.FC = () => {
  const users = dataStore.getUsers().filter((u) => u.role === 'student');
  const quizzes = dataStore.getQuizzes();
  const submissions = dataStore.getSubmissions();
  const classes = dataStore.getClasses();

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getScore = (studentId: string, quizId: string) => {
    return submissions.find((s) => s.userId === studentId && s.quizId === quizId);
  };

  const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || cid;

  // Filter students
  const filteredStudents = users.filter((u) => {
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

  // Filter quizzes for display
  const displayedQuizzes = quizzes.filter((q) => {
    if (selectedQuizId !== 'all' && q.id !== selectedQuizId) {
      return false;
    }
    return true;
  });

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
            <Award className="w-6 h-6 text-emerald-600" /> Class Gradebook & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Performance matrix across student cohorts and quizzes with multi-line wrapped headers and scroll-free presentation (Pass mark: 50%)
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" /> Export to CSV
        </button>
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
                    <span className="text-[10px] text-slate-400 font-normal lowercase block mt-0.5">
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
                                className={`inline-block px-2 py-1 rounded text-xs font-bold leading-none break-words ${
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
