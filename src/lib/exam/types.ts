export const SCHEMA_VERSION = 1 as const;

export type PublishStatus = "draft" | "published";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "fill_blank"
  | "word_order";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  order: number;
  options?: QuestionOption[];
  correctAnswer: string | string[];
  explanation?: string;
  media?: { type: "image" | "audio"; url: string; alt?: string };
  metadata?: Record<string, string | number | boolean>;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  questionIds: string[];
}

export interface Exam {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  collectionId: string;
  slug: string;
  title: string;
  instructions: string;
  durationSeconds: number;
  totalPoints: number;
  version: string;
  sections: Section[];
  questions: Question[];
  status: PublishStatus;
}

export interface ExamCollection {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  examType: string;
  academicYear: string | null;
  language: string;
  status: PublishStatus;
  examIds: string[];
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  order: number;
  options?: QuestionOption[];
  media?: Question["media"];
  metadata?: Question["metadata"];
}

export interface PublicExam {
  id: string;
  collectionId: string;
  slug: string;
  title: string;
  instructions: string;
  durationSeconds: number;
  totalPoints: number;
  version: string;
  sections: Section[];
  questions: PublicQuestion[];
}

export type UserAnswer = string | string[] | null;

export interface SubmitPayload {
  collectionSlug: string;
  examSlug: string;
  sessionId: string;
  examVersion: string;
  startedAt: number;
  submittedAt: number;
  answers: Record<string, UserAnswer>;
  flagged: string[];
  autoSubmitted?: boolean;
}

export interface QuestionResult {
  questionId: string;
  status: "correct" | "incorrect" | "unanswered";
  pointsEarned: number;
  pointsPossible: number;
  userAnswer: UserAnswer;
  correctAnswer: string | string[];
  explanation?: string;
  flagged: boolean;
}

export interface GradingResult {
  examId: string;
  examTitle: string;
  examVersion: string;
  sessionId: string;
  startedAt: number;
  submittedAt: number;
  durationSeconds: number;
  totalPoints: number;
  pointsEarned: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentCorrect: number;
  autoSubmitted: boolean;
  questions: QuestionResult[];
}