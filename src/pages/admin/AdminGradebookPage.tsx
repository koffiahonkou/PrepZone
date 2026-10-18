import React from 'react';
import { Award, Download, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { toast } from 'sonner';

export const AdminGradebookPage: React.FC = () => {
  const users = dataStore.getUsers().filter((u) => u.role === 'student');
  const quizzes = dataStore.getQuizzes();
  const submissions = dataStore.getSubmissions();
  const classes = dataStore.getClasses();

  const getScore = (studentId: string, quizId: string) => {
    const sub = submissions.find((s) => s.userId === studentId && s.quizId === quizId);
    return sub;
  };

  const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || cid;

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Username', 'Class', ...quizzes.map((q) => q.title)];
    const rows = users.map((u) => {
      const cls = u.classIds.length > 0 ? getClassName(u.classIds[0]) : 'None';
      const scores = quizzes.map((q) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600" /> Class Gradebook & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional performance matrix across student cohorts and quizzes (Pass mark: 50%)
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export to CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                {quizzes.map((q) => (
                  <th key={q.id} className="py-3 px-4 min-w-[160px]">
                    <span className="block truncate">{q.title}</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">
                      ({q.totalMarks} marks max)
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((student) => {
                const primaryClass =
                  student.classIds.length > 0 ? getClassName(student.classIds[0]) : 'Unassigned';

                return (
                  <tr key={student.uid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{student.fullName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">@{student.username}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {primaryClass}
                      </span>
                    </td>
                    {quizzes.map((quiz) => {
                      const sub = getScore(student.uid, quiz.id);

                      if (!sub) {
                        return (
                          <td key={quiz.id} className="py-3 px-4 text-slate-300 italic">
                            Not taken
                          </td>
                        );
                      }

                      const isPassed = sub.percent >= 50;

                      return (
                        <td key={quiz.id} className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                sub.status === 'pending_manual'
                                  ? 'bg-amber-100 text-amber-800'
                                  : isPassed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {sub.percent}% ({sub.totalScore}/{sub.totalPossible})
                            </span>
                            {sub.status === 'pending_manual' && (
                              <span className="text-[10px] text-amber-600 font-semibold">*Theory</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
