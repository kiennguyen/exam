export interface ImportedQuestion {
  /** Số in trên đề (có thể lặp lại giữa các phần; khớp file đáp án) */
  order: number;
  /** Vị trí tuần tự trong file Word (1…n, không trùng) */
  sequence?: number;
  printedOrder?: number;
  kind: "single_choice" | "fill_blank" | "word_order" | "unsupported";
  prompt: string;
  options?: { id: string; label: string }[];
  rawText: string;
  hints?: string[];
}

export interface ImportedExamFile {
  schemaVersion: 1;
  importFormat: "ioe-docx-v1";
  examNumber: number;
  slug: string;
  sourceFile: string;
  importedAt: string;
  title: string;
  questionCount: number;
  singleChoiceCount: number;
  unsupportedCount: number;
  questions: ImportedQuestion[];
  notes: string[];
}

export interface AnswerKeyFile {
  schemaVersion: 1;
  examNumber: number;
  slug: string;
  answersByOrder: Record<string, string>;
}

export const COLLECTION_ID = "col-ioe-en-g7";
export const IMPORT_DIR = "data/imported/ioe-grade-7";
export const ANSWERS_DIR = "data/imported/ioe-grade-7/answers";
export const EXAMS_DIR = "data/exams/ioe-grade-7";