import React, { useState } from 'react';
import {
  FileQuestion,
  Clock,
  CheckCircle2,
  Award,
  Plus,
  Pencil,
  Trash2,
  Copy,
  X,
  AlertTriangle,
  Check,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { Quiz, QuizQuestion, QuestionType, QuestionOption } from '@/src/types';
import { RichTextEditor } from '@/src/components/common/RichTextEditor';
import { toast } from 'sonner';

export type SectionKey = 'multiple_choice' | 'true_false' | 'short_text' | 'theory';

export interface SectionDef {
  key: SectionKey;
  letter: string;
  title: string;
  shortTitle: string;
  badge: string;
  badgeColor: string;
  borderColor: string;
  headerBg: string;
  accentBg: string;
  description: string;
  instructions: string;
  defaultType: QuestionType;
  defaultMarks: number;
}

export const SECTION_DEFS: SectionDef[] = [
  {
    key: 'multiple_choice',
    letter: 'A',
    title: 'Section A: Multiple Choice Questions',
    shortTitle: 'Multiple Choice',
    badge: 'Radio Buttons Selection • Auto-Graded',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-300',
    headerBg: 'bg-emerald-50/60',
    accentBg: 'bg-emerald-500',
    description: 'Students choose one suggested answer via radio buttons. Evaluated automatically upon student submission.',
    instructions: 'Select the one best answer from the options provided by clicking the corresponding radio button.',
    defaultType: 'single_choice',
    defaultMarks: 5,
  },
  {
    key: 'true_false',
    letter: 'B',
    title: 'Section B: True / False Questions',
    shortTitle: 'True / False',
    badge: 'Binary Choice Key • Auto-Graded',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    headerBg: 'bg-blue-50/60',
    accentBg: 'bg-blue-500',
    description: 'Students select True or False via radio buttons. Evaluated automatically upon submission.',
    instructions: 'Read each statement carefully and select whether it is True or False using the radio buttons.',
    defaultType: 'true_false',
    defaultMarks: 5,
  },
  {
    key: 'short_text',
    letter: 'C',
    title: 'Section C: Short Text Questions',
    shortTitle: 'Short Text',
    badge: 'Exact Term / Match • Auto-Graded',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-300',
    headerBg: 'bg-purple-50/60',
    accentBg: 'bg-purple-500',
    description: 'Students type a specific word, formula, or term. Automatically graded with case-insensitive matching.',
    instructions: 'Type the exact answer or terminology in the space provided.',
    defaultType: 'short_text',
    defaultMarks: 5,
  },
  {
    key: 'theory',
    letter: 'D',
    title: 'Section D: Theory & Essay Questions',
    shortTitle: 'Theory / Essay',
    badge: 'Teacher Manual Rubric',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    borderColor: 'border-amber-300',
    headerBg: 'bg-amber-50/60',
    accentBg: 'bg-amber-500',
    description: 'Extended written answers evaluated against your model answers and grading rubrics.',
    instructions: 'Provide written explanations, workings, or essays in the response boxes provided.',
    defaultType: 'theory',
    defaultMarks: 10,
  },
];

export const getQuestionSectionKey = (q: QuizQuestion): SectionKey => {
  if (
    q.section === 'multiple_choice' ||
    q.section === 'true_false' ||
    q.section === 'short_text' ||
    q.section === 'theory'
  ) {
    return q.section;
  }
  if (q.type === 'single_choice' || q.type === 'multiple_select') return 'multiple_choice';
  if (q.type === 'true_false') return 'true_false';
  if (q.type === 'short_text') return 'short_text';
  return 'theory';
};

export const AdminQuizzesPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => dataStore.getQuizzes());
  const subjects = dataStore.getSubjects();
  const classes = dataStore.getClasses();
  const submissions = dataStore.getSubmissions();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubjectId, setFormSubjectId] = useState(subjects[0]?.id || '');
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [formTimeLimit, setFormTimeLimit] = useState(20);
  const [formPassMark, setFormPassMark] = useState(50);
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'closed'>('published');
  const [formQuestions, setFormQuestions] = useState<QuizQuestion[]>([]);

  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | SectionKey>('all');
  const [batchCountInputs, setBatchCountInputs] = useState<Record<SectionKey, number>>({
    multiple_choice: 2,
    true_false: 2,
    short_text: 2,
    theory: 1,
  });
  const [bulkMarksInputs, setBulkMarksInputs] = useState<Record<SectionKey, number>>({
    multiple_choice: 5,
    true_false: 5,
    short_text: 5,
    theory: 10,
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);

  const getSubjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || subjId;
  const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || cid;
  const getAttemptCount = (quizId: string) => submissions.filter((s) => s.quizId === quizId).length;

  const openAddModal = () => {
    setEditingQuiz(null);
    setFormTitle('');
    setFormDescription('');
    setFormSubjectId(subjects[0]?.id || '');
    setFormClassIds(classes.slice(0, 2).map((c) => c.id));
    setFormTimeLimit(20);
    setFormPassMark(50);
    setFormStatus('published');
    setActiveSectionFilter('all');
    setFormQuestions([
      // Section A: Multiple Choice Questions (2 questions to demonstrate multiple)
      {
        id: `q-${Date.now()}-1`,
        type: 'single_choice',
        section: 'multiple_choice',
        promptHtml: '<p>What is the value of <strong>3x</strong> when x = 4?</p>',
        marks: 5,
        options: [
          { id: 'opt-1', text: '7' },
          { id: 'opt-2', text: '12' },
          { id: 'opt-3', text: '15' },
          { id: 'opt-4', text: '24' },
        ],
        correctOptionIds: ['opt-2'],
        explanationHtml: '<p>Multiply: <code>3 × 4 = 12</code>.</p>',
      },
      {
        id: `q-${Date.now()}-2`,
        type: 'single_choice',
        section: 'multiple_choice',
        promptHtml: '<p>Which organelle is known as the <em>powerhouse of the eukaryotic cell</em>?</p>',
        marks: 5,
        options: [
          { id: 'opt-2a', text: 'Ribosome' },
          { id: 'opt-2b', text: 'Golgi Apparatus' },
          { id: 'opt-2c', text: 'Mitochondrion' },
          { id: 'opt-2d', text: 'Endoplasmic Reticulum' },
        ],
        correctOptionIds: ['opt-2c'],
        explanationHtml: '<p>Mitochondria generate most of the chemical energy needed by the cell (ATP).</p>',
      },
      // Section B: True / False Questions (2 questions to demonstrate multiple)
      {
        id: `q-${Date.now()}-3`,
        type: 'true_false',
        section: 'true_false',
        promptHtml: '<p>Matter can exist simultaneously in solid, liquid, and gaseous phases under specific pressure and temperature.</p>',
        marks: 5,
        options: [
          { id: 'opt-t1', text: 'True' },
          { id: 'opt-f1', text: 'False' },
        ],
        correctOptionIds: ['opt-t1'],
        explanationHtml: '<p>True. This thermodynamic state is called the triple point of a substance.</p>',
      },
      {
        id: `q-${Date.now()}-4`,
        type: 'true_false',
        section: 'true_false',
        promptHtml: '<p>Sound waves travel significantly faster in an absolute vacuum than in atmospheric air.</p>',
        marks: 5,
        options: [
          { id: 'opt-t2', text: 'True' },
          { id: 'opt-f2', text: 'False' },
        ],
        correctOptionIds: ['opt-f2'],
        explanationHtml: '<p>False. Sound requires a mechanical physical medium to propagate and cannot travel through a vacuum.</p>',
      },
      // Section C: Short Text Questions (Auto-Graded Exact Match)
      {
        id: `q-${Date.now()}-5`,
        type: 'short_text',
        section: 'short_text',
        promptHtml: '<p>What is the chemical symbol for <strong>Water</strong>?</p>',
        marks: 5,
        correctText: 'H2O',
        acceptedAnswers: ['H2O', 'H₂O', 'h2o'],
        explanationHtml: '<p>Water consists of two hydrogen atoms and one oxygen atom.</p>',
      },
      // Section D: Theory / Essay Questions
      {
        id: `q-${Date.now()}-6`,
        type: 'theory',
        section: 'theory',
        promptHtml: '<p>Clearly differentiate between a <strong>physical change</strong> and a <strong>chemical change</strong>. Provide one everyday example of each.</p>',
        marks: 10,
        modelAnswerHtml: '<p><strong>Grading Rubric:</strong><br/>1. Physical change: Reversible, no new chemical substance produced (e.g. ice melting to water).<br/>2. Chemical change: Irreversible alteration of molecular bonds, new substance produced (e.g. rusting of iron).</p>',
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormTitle(quiz.title);
    setFormDescription(quiz.description);
    setFormSubjectId(quiz.subjectId);
    setFormClassIds(quiz.classIds || []);
    setFormTimeLimit(quiz.settings.timeLimitMins);
    setFormPassMark(quiz.settings.passMarkPercent);
    setFormStatus(quiz.status);
    setFormQuestions(quiz.questions || []);
    setIsModalOpen(true);
  };

  const handleDuplicate = (quiz: Quiz) => {
    const duplicated: Quiz = {
      ...quiz,
      id: `quiz-copy-${Date.now()}`,
      title: `${quiz.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    dataStore.saveQuiz(duplicated);
    setQuizzes(dataStore.getQuizzes());
    toast.success(`Quiz duplicated as "${duplicated.title}".`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Quiz title is required.');
      return;
    }
    if (formClassIds.length === 0) {
      toast.error('Assign at least one class stream.');
      return;
    }
    if (formQuestions.length === 0) {
      toast.error('Add at least one question to the assessment.');
      return;
    }

    // Validate that objective questions have a selected correct answer
    for (let i = 0; i < formQuestions.length; i++) {
      const q = formQuestions[i];
      if (q.type === 'single_choice' || q.type === 'true_false') {
        if (!q.correctOptionIds || q.correctOptionIds.length === 0) {
          toast.error(`Question ${i + 1} is missing a selected correct answer. Please click a radio button.`);
          return;
        }
      }
    }

    const totalMarks = formQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);

    if (editingQuiz) {
      const updated: Quiz = {
        ...editingQuiz,
        title: formTitle.trim(),
        description: formDescription.trim(),
        subjectId: formSubjectId,
        classIds: formClassIds,
        status: formStatus,
        settings: {
          ...editingQuiz.settings,
          timeLimitMins: formTimeLimit,
          passMarkPercent: formPassMark,
        },
        questions: formQuestions,
        totalMarks,
      };
      dataStore.saveQuiz(updated);
      toast.success(`Quiz "${updated.title}" updated.`);
    } else {
      const newQuiz: Quiz = {
        id: `quiz-${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        subjectId: formSubjectId,
        classIds: formClassIds,
        levelIds: [],
        status: formStatus,
        settings: {
          timeLimitMins: formTimeLimit,
          shuffleQuestions: false,
          shuffleOptions: false,
          maxAttempts: 2,
          instantFeedback: true,
          showCorrectAnswers: true,
          passMarkPercent: formPassMark,
          releaseResultsAt: null,
        },
        questions: formQuestions,
        totalMarks,
        createdBy: 'Dr. Evelyn Reed (Admin)',
        createdAt: new Date().toISOString(),
      };
      dataStore.saveQuiz(newQuiz);
      toast.success(`Quiz "${newQuiz.title}" created with ${formQuestions.length} questions.`);
    }

    setQuizzes(dataStore.getQuizzes());
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    dataStore.deleteQuiz(deleteTarget.id);
    setQuizzes(dataStore.getQuizzes());
    setDeleteTarget(null);
    toast.success('Quiz assessment deleted.');
  };

  const toggleClass = (cid: string) => {
    setFormClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  // Question Management Helpers - By Section
  const addQuestionsToSection = (sectionKey: SectionKey, count: number = 1) => {
    const def = SECTION_DEFS.find((d) => d.key === sectionKey);
    const newQuestions: QuizQuestion[] = [];
    const baseTime = Date.now();
    const currentSectionCount = formQuestions.filter(
      (q) => getQuestionSectionKey(q) === sectionKey
    ).length;

    for (let i = 0; i < count; i++) {
      const qNum = currentSectionCount + i + 1;
      const qId = `q-${baseTime}-${formQuestions.length + i + 1}`;
      let defaultOptions: QuestionOption[] | undefined;
      let defaultCorrectOptionIds: string[] | undefined;

      if (sectionKey === 'multiple_choice') {
        defaultOptions = [
          { id: `opt-${baseTime}-${i}-1`, text: 'Suggested Choice A' },
          { id: `opt-${baseTime}-${i}-2`, text: 'Suggested Choice B' },
          { id: `opt-${baseTime}-${i}-3`, text: 'Suggested Choice C' },
          { id: `opt-${baseTime}-${i}-4`, text: 'Suggested Choice D' },
        ];
        defaultCorrectOptionIds = [defaultOptions[0].id];
      } else if (sectionKey === 'true_false') {
        defaultOptions = [
          { id: `opt-tf-${baseTime}-${i}-true`, text: 'True' },
          { id: `opt-tf-${baseTime}-${i}-false`, text: 'False' },
        ];
        defaultCorrectOptionIds = [defaultOptions[0].id];
      }

      const newQ: QuizQuestion = {
        id: qId,
        type: def?.defaultType || 'single_choice',
        section: sectionKey,
        sectionTitle: def?.title,
        promptHtml: `<p>New ${def?.shortTitle || 'Question'} prompt #${qNum}...</p>`,
        marks: def?.defaultMarks || 5,
        options: defaultOptions,
        correctOptionIds: defaultCorrectOptionIds,
        correctText: sectionKey === 'short_text' ? 'Sample Answer' : undefined,
        explanationHtml: '',
        modelAnswerHtml:
          sectionKey === 'theory' ? '<p>Instructor grading criteria and key points...</p>' : undefined,
      };

      newQuestions.push(newQ);
    }

    setFormQuestions((prev) => [...prev, ...newQuestions]);
    toast.success(
      count === 1
        ? `Added 1 question to ${def?.shortTitle || 'section'}.`
        : `Added ${count} questions to ${def?.shortTitle || 'section'}.`
    );
  };

  const duplicateQuestion = (qId: string) => {
    const index = formQuestions.findIndex((q) => q.id === qId);
    if (index === -1) return;
    const original = formQuestions[index];
    const newId = `q-${Date.now()}`;

    let clonedOptions: QuestionOption[] | undefined = undefined;
    let clonedCorrectOptionIds = original.correctOptionIds;

    if (original.options) {
      const idMap: Record<string, string> = {};
      clonedOptions = original.options.map((opt, oIdx) => {
        const newOptId = `opt-${Date.now()}-${oIdx + 1}`;
        idMap[opt.id] = newOptId;
        return { id: newOptId, text: opt.text };
      });
      if (original.correctOptionIds) {
        clonedCorrectOptionIds = original.correctOptionIds.map((cid) => idMap[cid] || cid);
      }
    }

    const duplicated: QuizQuestion = {
      ...original,
      id: newId,
      promptHtml: original.promptHtml
        ? original.promptHtml.includes('</p>')
          ? original.promptHtml.replace('</p>', ' (Copy)</p>')
          : `${original.promptHtml} (Copy)`
        : '<p>Duplicated Question Prompt</p>',
      options: clonedOptions,
      correctOptionIds: clonedCorrectOptionIds,
    };

    const updated = [...formQuestions];
    updated.splice(index + 1, 0, duplicated);
    setFormQuestions(updated);
    toast.success('Question duplicated successfully.');
  };

  const moveQuestionInSection = (qId: string, direction: 'up' | 'down') => {
    const q = formQuestions.find((item) => item.id === qId);
    if (!q) return;
    const sec = getQuestionSectionKey(q);
    const sectionQuestions = formQuestions.filter((item) => getQuestionSectionKey(item) === sec);
    const secIndex = sectionQuestions.findIndex((item) => item.id === qId);
    if (secIndex === -1) return;
    if (direction === 'up' && secIndex === 0) return;
    if (direction === 'down' && secIndex === sectionQuestions.length - 1) return;

    const targetSecIndex = direction === 'up' ? secIndex - 1 : secIndex + 1;
    const otherQ = sectionQuestions[targetSecIndex];

    const idxA = formQuestions.findIndex((item) => item.id === qId);
    const idxB = formQuestions.findIndex((item) => item.id === otherQ.id);

    const newQuestions = [...formQuestions];
    const temp = newQuestions[idxA];
    newQuestions[idxA] = newQuestions[idxB];
    newQuestions[idxB] = temp;
    setFormQuestions(newQuestions);
  };

  const setSectionMarksForAll = (sectionKey: SectionKey, newMarks: number) => {
    if (isNaN(newMarks) || newMarks < 1) {
      toast.warning('Marks must be at least 1.');
      return;
    }
    setFormQuestions((prev) =>
      prev.map((q) => (getQuestionSectionKey(q) === sectionKey ? { ...q, marks: newMarks } : q))
    );
    toast.success(`Set marks for all ${sectionKey.replace('_', ' ')} questions to ${newMarks}.`);
  };

  const removeQuestion = (qId: string) => {
    setFormQuestions(formQuestions.filter((q) => q.id !== qId));
    toast.info('Question removed.');
  };

  const updateQuestionPrompt = (qId: string, text: string) => {
    setFormQuestions(
      formQuestions.map((q) =>
        q.id === qId ? { ...q, promptHtml: `<p>${text}</p>` } : q
      )
    );
  };

  const updateQuestionMarks = (qId: string, marks: number) => {
    setFormQuestions(
      formQuestions.map((q) => (q.id === qId ? { ...q, marks: Math.max(1, marks) } : q))
    );
  };

  const setQuestionCorrectOption = (qId: string, optId: string) => {
    setFormQuestions(
      formQuestions.map((q) =>
        q.id === qId ? { ...q, correctOptionIds: [optId] } : q
      )
    );
  };

  const updateOptionText = (qId: string, optId: string, newText: string) => {
    setFormQuestions(
      formQuestions.map((q) => {
        if (q.id !== qId || !q.options) return q;
        const updatedOptions = q.options.map((opt) =>
          opt.id === optId ? { ...opt, text: newText } : opt
        );
        return { ...q, options: updatedOptions };
      })
    );
  };

  const addOptionToQuestion = (qId: string) => {
    setFormQuestions(
      formQuestions.map((q) => {
        if (q.id !== qId || !q.options) return q;
        const newOpt: QuestionOption = {
          id: `opt-${Date.now()}-${q.options.length + 1}`,
          text: `Suggested Choice ${q.options.length + 1}`,
        };
        return { ...q, options: [...q.options, newOpt] };
      })
    );
  };

  const removeOptionFromQuestion = (qId: string, optId: string) => {
    setFormQuestions(
      formQuestions.map((q) => {
        if (q.id !== qId || !q.options || q.options.length <= 2) {
          toast.warning('A multiple choice question must have at least 2 options.');
          return q;
        }
        const filteredOptions = q.options.filter((opt) => opt.id !== optId);
        let newCorrect = q.correctOptionIds;
        if (q.correctOptionIds?.includes(optId)) {
          newCorrect = [filteredOptions[0].id];
        }
        return { ...q, options: filteredOptions, correctOptionIds: newCorrect };
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-emerald-600" /> Quiz Builder & Assessments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Author objective tests with radio-button answer keys for automatic grading, plus theory assessments ({quizzes.length} quizzes)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New Quiz Assessment
        </button>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        {quizzes.map((quiz) => {
          const subjName = getSubjectName(quiz.subjectId);
          const attempts = getAttemptCount(quiz.id);
          const theoryCount = quiz.questions?.filter((q) => q.type === 'theory').length || 0;
          const objectiveCount = (quiz.questions?.length || 0) - theoryCount;

          return (
            <div
              key={quiz.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                    {subjName}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      quiz.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : quiz.status === 'draft'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {quiz.status.toUpperCase()}
                  </span>
                  {theoryCount > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Hybrid ({theoryCount} Theory Queued)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      100% Instant Auto-Graded
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-[#0F2A4A] mt-2">{quiz.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{quiz.description}</p>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Total Questions</span>
                    <span className="font-bold text-slate-800">
                      {quiz.questions?.length || 0} ({objectiveCount} obj + {theoryCount} theory)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Max Marks</span>
                    <span className="font-bold text-emerald-600">{quiz.totalMarks} Marks</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Time Limit</span>
                    <span className="font-bold text-slate-800">
                      {quiz.settings.timeLimitMins > 0 ? `${quiz.settings.timeLimitMins} mins` : 'Untimed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Submissions</span>
                    <span className="font-bold text-blue-600">{attempts} Attempts</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-semibold text-slate-500">Assigned Classes:</span>
                  {quiz.classIds?.map((cid) => (
                    <span
                      key={cid}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700"
                    >
                      {getClassName(cid)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(quiz)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Duplicate quiz"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(quiz)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit quiz"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(quiz)}
                    className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  Pass mark: {quiz.settings.passMarkPercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Quiz Modal with Detailed Radio Button Question Builder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-[#0F2A4A]">
                  {editingQuiz ? 'Edit Quiz Assessment' : 'Create New Quiz Assessment'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set question prompts, define radio button answer choices, and mark correct keys for automatic submission grading.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-6">
              {/* Meta details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mid-Term Assessment: Force, Motion & Newton's Laws"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Description / Instructions for Students
                </label>
                <input
                  type="text"
                  placeholder="e.g. Answer all objective questions. Theory questions will be manually marked by the instructor."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">0 = Unlimited</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Pass Mark Percentage
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={formPassMark}
                    onChange={(e) => setFormPassMark(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as 'draft' | 'published' | 'closed')
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Class streams */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Target Classes (Eligible Students)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
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

              {/* QUESTIONS BUILDER SECTION WITH MULTI-QUESTION SECTIONS */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#0F2A4A] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" /> Assessment Sections & Questions ({formQuestions.length})
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Each section supports adding multiple questions. Total assessment score:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {formQuestions.reduce((acc, q) => acc + (q.marks || 0), 0)} Marks
                      </strong>
                    </p>
                  </div>

                  {/* Section View Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveSectionFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeSectionFilter === 'all'
                          ? 'bg-[#0F2A4A] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      All Sections ({formQuestions.length})
                    </button>
                    {SECTION_DEFS.map((s) => {
                      const count = formQuestions.filter(
                        (q) => getQuestionSectionKey(q) === s.key
                      ).length;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setActiveSectionFilter(s.key)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            activeSectionFilter === s.key
                              ? 'bg-[#0F2A4A] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <span>{s.letter}: {s.shortTitle}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              activeSectionFilter === s.key
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Add Bar Across Top */}
                <div className="p-3 mb-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Quick Add Questions:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addQuestionsToSection('multiple_choice', 1)}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" /> +1 Multiple Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuestionsToSection('true_false', 1)}
                      className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" /> +1 True/False
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuestionsToSection('short_text', 1)}
                      className="px-2.5 py-1 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-600" /> +1 Short Text
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuestionsToSection('theory', 1)}
                      className="px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" /> +1 Theory / Essay
                    </button>
                  </div>
                </div>

                {/* SECTIONS RENDERING */}
                <div className="space-y-8">
                  {SECTION_DEFS.filter(
                    (sec) => activeSectionFilter === 'all' || activeSectionFilter === sec.key
                  ).map((sec) => {
                    const secQuestions = formQuestions.filter(
                      (q) => getQuestionSectionKey(q) === sec.key
                    );
                    const secMarks = secQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);

                    return (
                      <div
                        key={sec.key}
                        className={`rounded-2xl border-2 transition-all overflow-hidden ${sec.borderColor} bg-white shadow-xs`}
                      >
                        {/* Section Header Banner */}
                        <div className={`p-4 sm:p-5 border-b ${sec.headerBg} border-slate-200/80`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <span className="w-8 h-8 rounded-xl bg-[#0F2A4A] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                {sec.letter}
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-serif font-bold text-[#0F2A4A]">
                                    {sec.title}
                                  </h3>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sec.badgeColor}`}
                                  >
                                    {sec.badge}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0F2A4A] text-white shadow-2xs">
                                    {secQuestions.length} {secQuestions.length === 1 ? 'Question' : 'Questions'} • {secMarks} Marks
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                                  {sec.description}
                                </p>
                              </div>
                            </div>

                            {/* Section Level Action Toolbar: Add More Than One Question */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => addQuestionsToSection(sec.key, 1)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-2xs transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add 1 Question
                              </button>

                              {/* Multi-Question Fast Add Buttons */}
                              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase text-slate-500 px-2 select-none">
                                  Add Multiple:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addQuestionsToSection(sec.key, 2)}
                                  className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-[#0F2A4A] hover:bg-slate-100 rounded transition-colors"
                                  title="Add 2 questions to this section"
                                >
                                  +2
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addQuestionsToSection(sec.key, 3)}
                                  className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-[#0F2A4A] hover:bg-slate-100 rounded transition-colors"
                                  title="Add 3 questions to this section"
                                >
                                  +3
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addQuestionsToSection(sec.key, 5)}
                                  className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-[#0F2A4A] hover:bg-slate-100 rounded transition-colors"
                                  title="Add 5 questions to this section"
                                >
                                  +5
                                </button>
                              </div>

                              {/* Bulk Set Marks for this section */}
                              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                                  Set marks:
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={bulkMarksInputs[sec.key]}
                                  onChange={(e) =>
                                    setBulkMarksInputs({
                                      ...bulkMarksInputs,
                                      [sec.key]: Number(e.target.value),
                                    })
                                  }
                                  className="w-12 px-1.5 py-1 text-xs border border-slate-300 rounded text-center bg-white font-bold text-[#0F2A4A]"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSectionMarksForAll(sec.key, bulkMarksInputs[sec.key])
                                  }
                                  className="px-2 py-1 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                                  title="Apply these marks to all questions in this section"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section Content: Questions or Empty State */}
                        <div className="p-4 sm:p-6 space-y-6">
                          {secQuestions.length === 0 ? (
                            <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                              <p className="text-sm font-semibold text-slate-700">
                                No questions in {sec.title} yet.
                              </p>
                              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                You can add multiple questions to this section for your students.
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                                <button
                                  type="button"
                                  onClick={() => addQuestionsToSection(sec.key, 1)}
                                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0F2A4A] text-white hover:bg-[#163c68] inline-flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" /> + Add 1 Question
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addQuestionsToSection(sec.key, 3)}
                                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" /> + Add 3 Questions at once
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addQuestionsToSection(sec.key, 5)}
                                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" /> + Add 5 Questions
                                </button>
                              </div>
                            </div>
                          ) : (
                            secQuestions.map((q, secIdx) => {
                              const globalIndex = formQuestions.findIndex((item) => item.id === q.id);
                              const isMultipleChoice = q.type === 'single_choice';
                              const isTrueFalse = q.type === 'true_false';
                              const isShortText = q.type === 'short_text';
                              const isTheory = q.type === 'theory';

                              return (
                                <div
                                  key={q.id}
                                  className={`p-5 rounded-2xl border transition-all ${
                                    isTheory
                                      ? 'border-amber-200 bg-amber-50/15'
                                      : 'border-slate-200 bg-slate-50/40'
                                  }`}
                                >
                                  {/* Question Header & Controls */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 mb-4">
                                    <div className="flex items-center gap-2">
                                      <span className="w-7 h-7 rounded-full bg-[#0F2A4A] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                                        {secIdx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800">
                                        Question {secIdx + 1} of {secQuestions.length}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        (Global #{globalIndex + 1})
                                      </span>
                                      {isMultipleChoice && (
                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                          Radio Choice • Auto-Graded
                                        </span>
                                      )}
                                      {isTrueFalse && (
                                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                          True/False • Auto-Graded
                                        </span>
                                      )}
                                    </div>

                                    {/* Action Buttons: Marks, Re-order, Duplicate, Delete */}
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                      <div className="flex items-center gap-1.5 mr-1">
                                        <label className="text-xs font-semibold text-slate-600">Marks:</label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={100}
                                          value={q.marks}
                                          onChange={(e) => updateQuestionMarks(q.id, Number(e.target.value))}
                                          className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-[#0F2A4A] text-center"
                                        />
                                      </div>

                                      {/* Move Up/Down within Section */}
                                      <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs">
                                        <button
                                          type="button"
                                          onClick={() => moveQuestionInSection(q.id, 'up')}
                                          disabled={secIdx === 0}
                                          className="p-1.5 text-slate-400 hover:text-[#0F2A4A] disabled:opacity-30 disabled:hover:text-slate-400 rounded-l transition-colors"
                                          title="Move question up"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveQuestionInSection(q.id, 'down')}
                                          disabled={secIdx === secQuestions.length - 1}
                                          className="p-1.5 text-slate-400 hover:text-[#0F2A4A] disabled:opacity-30 disabled:hover:text-slate-400 rounded-r border-l border-slate-200 transition-colors"
                                          title="Move question down"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Duplicate Question in Section */}
                                      <button
                                        type="button"
                                        onClick={() => duplicateQuestion(q.id)}
                                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 bg-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs text-xs font-semibold"
                                        title="Duplicate this question"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="hidden md:inline">Duplicate</span>
                                      </button>

                                      {/* Delete Question */}
                                      <button
                                        type="button"
                                        onClick={() => removeQuestion(q.id)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 bg-white rounded-lg transition-colors shadow-2xs"
                                        title="Delete Question"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Question Prompt with RichTextEditor */}
                                  <div className="mb-4">
                                    <RichTextEditor
                                      label="Question Prompt"
                                      value={q.promptHtml}
                                      onChange={(html) => {
                                        setFormQuestions(
                                          formQuestions.map((item) =>
                                            item.id === q.id ? { ...item, promptHtml: html } : item
                                          )
                                        );
                                      }}
                                      placeholder="Type the question prompt, format with Bold, Underline, or Bullet Lists..."
                                      minHeight="90px"
                                      helperText="Highlight any text and click Bold, Underline, or Heading. No HTML knowledge required."
                                    />
                                  </div>

                                  {/* MULTIPLE CHOICE: SUGGESTED ANSWERS WITH RADIO BUTTON FOR CORRECT SELECTION */}
                                  {isMultipleChoice && (
                                    <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div>
                                          <span className="text-xs font-bold uppercase text-[#0F2A4A] tracking-wider flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            Suggested Answers & Radio Auto-Marking Key
                                          </span>
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            Students will see these suggested answers as radio buttons to select one option. Select the radio button below to mark which choice is correct for automatic scoring.
                                          </p>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => addOptionToQuestion(q.id)}
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 shrink-0 transition-colors"
                                        >
                                          + Add Another Choice
                                        </button>
                                      </div>

                                      {/* Options List */}
                                      <div className="space-y-3 mt-3">
                                        {q.options?.map((opt, optIdx) => {
                                          const isCorrect = q.correctOptionIds?.includes(opt.id);
                                          const letter = String.fromCharCode(65 + optIdx);

                                          return (
                                            <div
                                              key={opt.id}
                                              className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                                isCorrect
                                                  ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-200 shadow-2xs'
                                                  : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                                              }`}
                                            >
                                              {/* Prominent Radio Button Selector for Correct Key */}
                                              <label
                                                className="flex items-center gap-2 cursor-pointer shrink-0 select-none"
                                                title="Click to set this suggested answer as the automatically graded correct answer"
                                              >
                                                <input
                                                  type="radio"
                                                  name={`correct-option-${q.id}`}
                                                  checked={isCorrect}
                                                  onChange={() => setQuestionCorrectOption(q.id, opt.id)}
                                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                                />
                                                <span
                                                  className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${
                                                    isCorrect
                                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                                  }`}
                                                >
                                                  {isCorrect ? (
                                                    <>
                                                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer (Auto-Graded)
                                                    </>
                                                  ) : (
                                                    `Choice ${letter}: Mark as Correct`
                                                  )}
                                                </span>
                                              </label>

                                              {/* Option Text Input */}
                                              <div className="flex-1 flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500">
                                                  {letter}.
                                                </span>
                                                <input
                                                  type="text"
                                                  value={opt.text}
                                                  onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                                                  placeholder={`Type answer choice ${letter} text (e.g. Mitochondria)...`}
                                                  className={`w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:outline-hidden ${
                                                    isCorrect
                                                      ? 'border-emerald-300 font-semibold text-emerald-950 focus:border-emerald-500'
                                                      : 'border-slate-300 text-slate-800 focus:border-[#0F2A4A]'
                                                  }`}
                                                />
                                              </div>

                                              {/* Delete Option Button */}
                                              <button
                                                type="button"
                                                onClick={() => removeOptionFromQuestion(q.id, opt.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors self-end sm:self-center"
                                                title="Remove this suggested choice"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Live Student Preview Box */}
                                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                                          Student Exam View Preview:
                                        </span>
                                        <div className="space-y-1.5">
                                          {q.options?.map((opt, optIdx) => (
                                            <div
                                              key={opt.id}
                                              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                                            >
                                              <span className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[9px] text-slate-400">
                                                ○
                                              </span>
                                              <span className="font-semibold text-slate-500">
                                                {String.fromCharCode(65 + optIdx)}.
                                              </span>
                                              <span className="text-slate-800">
                                                {opt.text || `(Empty choice ${String.fromCharCode(65 + optIdx)})`}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* TRUE / FALSE: RADIO BUTTON SELECTION */}
                                  {isTrueFalse && (
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                      <span className="text-xs font-bold uppercase text-[#0F2A4A] tracking-wider block">
                                        Select the Correct Answer (Radio Button Key):
                                      </span>
                                      <p className="text-[11px] text-slate-500">
                                        Students will be presented with True and False radio buttons. Choose which answer is correct below for automatic grading.
                                      </p>
                                      <div className="flex flex-wrap items-center gap-4 pt-1">
                                        <label
                                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                                            q.correctOptionIds?.includes(q.options?.[0]?.id || 'opt-t1') ||
                                            q.correctOptionIds?.includes('opt-true') ||
                                            q.correctOptionIds?.includes('opt-t')
                                              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`correct-tf-${q.id}`}
                                            checked={
                                              q.correctOptionIds?.includes(q.options?.[0]?.id || 'opt-t1') ||
                                              q.correctOptionIds?.includes('opt-true') ||
                                              q.correctOptionIds?.includes('opt-t')
                                            }
                                            onChange={() =>
                                              setQuestionCorrectOption(q.id, q.options?.[0]?.id || 'opt-true')
                                            }
                                            className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                                          />
                                          <span className="text-xs font-bold text-slate-800">
                                            True is Correct (Auto-Graded)
                                          </span>
                                        </label>

                                        <label
                                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                                            q.correctOptionIds?.includes(q.options?.[1]?.id || 'opt-f1') ||
                                            q.correctOptionIds?.includes('opt-false') ||
                                            q.correctOptionIds?.includes('opt-f')
                                              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`correct-tf-${q.id}`}
                                            checked={
                                              q.correctOptionIds?.includes(q.options?.[1]?.id || 'opt-f1') ||
                                              q.correctOptionIds?.includes('opt-false') ||
                                              q.correctOptionIds?.includes('opt-f')
                                            }
                                            onChange={() =>
                                              setQuestionCorrectOption(q.id, q.options?.[1]?.id || 'opt-false')
                                            }
                                            className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                                          />
                                          <span className="text-xs font-bold text-slate-800">
                                            False is Correct (Auto-Graded)
                                          </span>
                                        </label>
                                      </div>
                                    </div>
                                  )}

                                  {/* SHORT TEXT: EXACT ANSWER KEY */}
                                  {isShortText && (
                                    <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-2xs space-y-2">
                                      <span className="text-xs font-bold uppercase text-purple-900 tracking-wider block">
                                        Expected Short Answer (Auto-Graded Exact Match):
                                      </span>
                                      <p className="text-[11px] text-slate-500">
                                        Students type a short word or phrase. It is automatically compared (case-insensitive) against this key.
                                      </p>
                                      <input
                                        type="text"
                                        value={q.correctText || ''}
                                        onChange={(e) => {
                                          setFormQuestions(
                                            formQuestions.map((item) =>
                                              item.id === q.id ? { ...item, correctText: e.target.value } : item
                                            )
                                          );
                                        }}
                                        placeholder="e.g. Mitochondria, H2O, Photosynthesis..."
                                        className="w-full px-3 py-2 text-xs border border-purple-300 rounded-lg bg-white font-medium text-slate-900 focus:outline-hidden focus:border-purple-600"
                                      />
                                    </div>
                                  )}

                                  {/* THEORY / ESSAY: MODEL ANSWER WITH RICHTEXTEDITOR */}
                                  {isTheory && (
                                    <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-2xs space-y-3">
                                      <span className="text-xs font-bold uppercase text-amber-900 tracking-wider block">
                                        Model Answer / Instructor Grading Rubric:
                                      </span>
                                      <p className="text-[11px] text-slate-500">
                                        Theory submissions are automatically queued for manual grading. Format key points or rubric below using Bold, Underline, and Headings for reference while grading.
                                      </p>
                                      <RichTextEditor
                                        value={q.modelAnswerHtml || ''}
                                        onChange={(html) => {
                                          setFormQuestions(
                                            formQuestions.map((item) =>
                                              item.id === q.id ? { ...item, modelAnswerHtml: html } : item
                                            )
                                          );
                                        }}
                                        placeholder="Type instructor grading rubric, key facts required, or sample essay response..."
                                        minHeight="120px"
                                        helperText="Highlight text to format with Bold, Underline, or Headings. No HTML required."
                                      />
                                    </div>
                                  )}

                                  {/* OPTIONAL ANSWER EXPLANATION / REVIEW NOTES WITH RICHTEXTEDITOR */}
                                  <div className="mt-4 pt-3 border-t border-slate-200/80">
                                    <RichTextEditor
                                      label="Answer Explanation & Review Notes (Shown to Students Post-Submission)"
                                      value={q.explanationHtml || ''}
                                      onChange={(html) => {
                                        setFormQuestions(
                                          formQuestions.map((item) =>
                                            item.id === q.id ? { ...item, explanationHtml: html } : item
                                          )
                                        );
                                      }}
                                      placeholder="Explain why the answer is correct to help students learn after taking the test..."
                                      minHeight="80px"
                                      helperText="Students will see this formatted explanation after submitting their assessment."
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Section Bottom Footer: Fast Add More Questions To This Section */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-600">
                            {sec.title}: <strong>{secQuestions.length} Questions</strong> ({secMarks} Marks)
                          </span>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addQuestionsToSection(sec.key, 1)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0F2A4A] text-white hover:bg-[#163c68] inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> + Add Another Question
                            </button>
                            <button
                              type="button"
                              onClick={() => addQuestionsToSection(sec.key, 2)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                            >
                              + Add 2 Questions
                            </button>
                            <button
                              type="button"
                              onClick={() => addQuestionsToSection(sec.key, 3)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                            >
                              + Add 3 Questions
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-xs"
                >
                  {editingQuiz ? 'Save Quiz Changes' : 'Create & Publish Quiz'}
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
            <h3 className="text-lg font-bold text-[#0F2A4A]">Delete Quiz Assessment?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deleteTarget.title}</strong>? All student attempts associated with this test will also be deleted.
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
