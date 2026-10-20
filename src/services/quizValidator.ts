import { Quiz, QuizQuestion } from '@/src/types';
import { AppError } from '@/src/lib/errors';

export interface QuizValidationError {
  field?: 'title' | 'classIds' | 'subjectId' | 'questions' | 'totalMarks' | 'correctOption' | 'marks' | 'options' | 'prompt' | string;
  questionIndex?: number; // 1-based index for human readability
  questionId?: string;
  message: string;
}

export interface QuizValidationResult {
  isValid: boolean;
  totalMarks: number;
  errors: string[];
  detailedErrors: QuizValidationError[];
  error?: string; // Concise summary of first fatal error
  questionErrors: Record<string, string[]>; // Map from question id to its errors
}

/**
 * Strips HTML tags and checks if string contains non-whitespace content
 */
function hasVisibleText(html?: string): boolean {
  if (!html) return false;
  const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return stripped.length > 0;
}

/**
 * Formats question type for user-friendly error messages
 */
function formatQuestionType(type?: string): string {
  switch (type) {
    case 'single_choice':
      return 'Multiple Choice';
    case 'multiple_select':
      return 'Multiple Select';
    case 'true_false':
      return 'True / False';
    case 'short_text':
      return 'Short Text';
    case 'theory':
      return 'Theory / Essay';
    default:
      return type || 'Question';
  }
}

/**
 * Validates a quiz before saving to Firestore / local database.
 * 
 * Rules enforced:
 * 1. Questions must exist (at least 1 question).
 * 2. Every question with options (or objective question) MUST have at least one correct option assigned.
 * 3. Every individual question marks must be explicitly defined and > 0.
 * 4. Total marks across the quiz must be explicitly defined and > 0.
 * 5. Options must have non-empty text and at least 2 choices for choice questions.
 * 6. Required metadata (title, subject, classes) must be defined.
 */
export function validateQuiz(
  quiz: Partial<Quiz> | { questions?: QuizQuestion[]; totalMarks?: number; [key: string]: any }
): QuizValidationResult {
  const errors: string[] = [];
  const detailedErrors: QuizValidationError[] = [];
  const questionErrors: Record<string, string[]> = {};

  const addError = (err: QuizValidationError) => {
    errors.push(err.message);
    detailedErrors.push(err);
    if (err.questionId) {
      if (!questionErrors[err.questionId]) {
        questionErrors[err.questionId] = [];
      }
      questionErrors[err.questionId].push(err.message);
    }
  };

  // 1. Basic Metadata validation
  if (quiz.title !== undefined) {
    if (!quiz.title || !quiz.title.trim()) {
      addError({
        field: 'title',
        message: 'Quiz title is required and cannot be empty.',
      });
    }
  }

  if (quiz.classIds !== undefined) {
    if (!Array.isArray(quiz.classIds) || quiz.classIds.length === 0) {
      addError({
        field: 'classIds',
        message: 'At least one classroom cohort must be assigned to this quiz.',
      });
    }
  }

  if (quiz.subjectId !== undefined) {
    if (!quiz.subjectId || !quiz.subjectId.trim()) {
      addError({
        field: 'subjectId',
        message: 'A subject curriculum must be assigned to this quiz.',
      });
    }
  }

  // 2. Questions list validation
  const questions = quiz.questions;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    addError({
      field: 'questions',
      message: 'The quiz must contain at least one question before saving.',
    });
    return {
      isValid: false,
      totalMarks: 0,
      errors,
      detailedErrors,
      error: errors[0],
      questionErrors,
    };
  }

  let calculatedTotalMarks = 0;
  let hasInvalidMarks = false;

  // 3. Question-level checks
  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    const qId = q.id || `question-${qNum}`;
    const qType = q.type;
    const typeLabel = formatQuestionType(qType);

    // 3a. Prompt validation
    if (!hasVisibleText(q.promptHtml)) {
      addError({
        field: 'prompt',
        questionIndex: qNum,
        questionId: qId,
        message: `Question ${qNum} (${typeLabel}): Question prompt text cannot be blank.`,
      });
    }

    // 3b. Question Marks Explicitly Defined Check
    if (q.marks === undefined || q.marks === null || typeof q.marks !== 'number' || Number.isNaN(q.marks)) {
      hasInvalidMarks = true;
      addError({
        field: 'marks',
        questionIndex: qNum,
        questionId: qId,
        message: `Question ${qNum} (${typeLabel}): Marks are not defined. Please assign explicit positive marks.`,
      });
    } else if (q.marks <= 0) {
      hasInvalidMarks = true;
      addError({
        field: 'marks',
        questionIndex: qNum,
        questionId: qId,
        message: `Question ${qNum} (${typeLabel}): Marks must be greater than 0 (currently ${q.marks}).`,
      });
    } else {
      calculatedTotalMarks += q.marks;
    }

    // 3c. Option & Correct Answer Assignment Check
    const isOptionBased =
      qType === 'single_choice' ||
      qType === 'multiple_select' ||
      qType === 'true_false' ||
      (Array.isArray(q.options) && q.options.length > 0);

    if (isOptionBased) {
      // Must have at least 2 options for choice/boolean questions
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        addError({
          field: 'options',
          questionIndex: qNum,
          questionId: qId,
          message: `Question ${qNum} (${typeLabel}): Must provide at least 2 answer options.`,
        });
      } else {
        // Check for blank option texts
        const blankOptionIndices = q.options
          .map((opt, oIdx) => (!opt.text || !opt.text.trim() ? oIdx + 1 : null))
          .filter(Boolean);

        if (blankOptionIndices.length > 0) {
          addError({
            field: 'options',
            questionIndex: qNum,
            questionId: qId,
            message: `Question ${qNum} (${typeLabel}): Option ${blankOptionIndices.join(', ')} has blank text.`,
          });
        }

        // CRITICAL: Ensure at least one correct option assigned
        if (!q.correctOptionIds || !Array.isArray(q.correctOptionIds) || q.correctOptionIds.length === 0) {
          addError({
            field: 'correctOption',
            questionIndex: qNum,
            questionId: qId,
            message: `Question ${qNum} (${typeLabel}): Must have at least one correct option assigned. Click an option radio/checkbox to set the correct answer.`,
          });
        } else {
          // Check that assigned correct option IDs actually match existing option IDs
          const existingOptionIds = new Set(q.options.map((opt) => opt.id));
          const matchingAssigned = q.correctOptionIds.filter((cid) => existingOptionIds.has(cid));

          if (matchingAssigned.length === 0) {
            addError({
              field: 'correctOption',
              questionIndex: qNum,
              questionId: qId,
              message: `Question ${qNum} (${typeLabel}): The assigned correct option does not match any current options. Please select a valid answer.`,
            });
          }
        }
      }
    } else if (qType === 'short_text') {
      // Short text questions: must have either non-empty correctText or acceptedAnswers
      const hasCorrectText = Boolean(q.correctText && q.correctText.trim().length > 0);
      const hasAcceptedAnswers = Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.some((a) => a && a.trim().length > 0);

      if (!hasCorrectText && !hasAcceptedAnswers) {
        addError({
          field: 'correctOption',
          questionIndex: qNum,
          questionId: qId,
          message: `Question ${qNum} (${typeLabel}): Please specify the correct answer or accepted answers for auto-grading.`,
        });
      }
    }
  });

  // 4. Total Marks Explicitly Defined Check
  let finalTotalMarks = calculatedTotalMarks;

  if (hasInvalidMarks || calculatedTotalMarks <= 0) {
    addError({
      field: 'totalMarks',
      message: 'Total marks must be explicitly defined and greater than 0 before saving.',
    });
  }

  // If quiz.totalMarks is explicitly provided, verify it is a valid positive number
  if (quiz.totalMarks !== undefined && quiz.totalMarks !== null) {
    if (typeof quiz.totalMarks !== 'number' || Number.isNaN(quiz.totalMarks) || quiz.totalMarks <= 0) {
      addError({
        field: 'totalMarks',
        message: `Total marks is explicitly specified as an invalid value (${quiz.totalMarks}). Total marks must be a positive number.`,
      });
    } else {
      finalTotalMarks = quiz.totalMarks;
      // If quiz.totalMarks doesn't match question marks sum, reconcile or warn
      if (calculatedTotalMarks > 0 && quiz.totalMarks !== calculatedTotalMarks) {
        // Ensure total marks strictly represents all question marks
        finalTotalMarks = calculatedTotalMarks;
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    totalMarks: finalTotalMarks,
    errors,
    detailedErrors,
    error: errors.length > 0 ? errors[0] : undefined,
    questionErrors,
  };
}

/**
 * Asserts that a quiz is valid before saving to database.
 * Throws an AppError with full validation summary if invalid.
 */
export function assertValidQuiz(quiz: Quiz | Partial<Quiz>): QuizValidationResult {
  const result = validateQuiz(quiz);
  if (!result.isValid) {
    const summary = result.errors.length === 1
      ? result.errors[0]
      : `Quiz validation failed (${result.errors.length} issues):\n• ${result.errors.slice(0, 3).join('\n• ')}${result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more issues` : ''}`;
    throw new AppError(summary, 'quiz/validation-failed', JSON.stringify(result.detailedErrors));
  }
  return result;
}

/**
 * Convenience boolean check for UI state
 */
export function isQuizValid(quiz: Partial<Quiz>): boolean {
  return validateQuiz(quiz).isValid;
}
