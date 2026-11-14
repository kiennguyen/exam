import type { Exam, ExamCollection, Question } from "./types";
import { collectionSchema, examSchema } from "./schema";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

function validateQuestionContent(
  examId: string,
  question: Question,
  optionIds: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const base = `exam[${examId}].question[${question.id}]`;

  if (!question.prompt.trim()) {
    issues.push(issue(base, "Câu hỏi không có nội dung"));
  }

  if (question.points < 0) {
    issues.push(issue(base, "Điểm âm không hợp lệ"));
  }

  if (question.type === "fill_blank" || question.type === "word_order") {
    const answers = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer];
    if (answers.length === 0 || answers.some((a) => !String(a).trim())) {
      issues.push(issue(base, "Câu điền khuyết thiếu đáp án"));
    }
    if (question.options && question.options.length > 0) {
      issues.push(issue(base, "Câu điền khuyết không dùng options"));
    }
    return issues;
  }

  const needsOptions =
    question.type === "single_choice" || question.type === "multiple_choice";

  if (needsOptions) {
    if (!question.options || question.options.length < 2) {
      issues.push(issue(base, "Câu lựa chọn thiếu phương án"));
    } else {
      const seen = new Set<string>();
      for (const opt of question.options) {
        if (seen.has(opt.id)) {
          issues.push(issue(`${base}.option[${opt.id}]`, "ID phương án bị trùng"));
        }
        seen.add(opt.id);
        optionIds.add(opt.id);
      }

      const answers = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];

      for (const ans of answers) {
        if (!seen.has(ans)) {
          issues.push(
            issue(base, `Đáp án chuẩn "${ans}" không nằm trong danh sách lựa chọn`)
          );
        }
      }

      if (question.type === "single_choice" && Array.isArray(question.correctAnswer)) {
        issues.push(issue(base, "Câu một lựa chọn phải có đáp án là một chuỗi"));
      }

      if (
        question.type === "multiple_choice" &&
        !Array.isArray(question.correctAnswer)
      ) {
        issues.push(issue(base, "Câu nhiều lựa chọn phải có đáp án là mảng"));
      }
    }
  }

  return issues;
}

export function validateExamStructure(exam: Exam): ValidationReport {
  const issues: ValidationIssue[] = [];
  const parsed = examSchema.safeParse(exam);
  if (!parsed.success) {
    for (const err of parsed.error.issues) {
      issues.push(
        issue(`exam[${exam.id ?? "unknown"}]`, `${err.path.join(".")}: ${err.message}`)
      );
    }
    return { ok: false, issues };
  }

  const questionIds = new Set<string>();
  for (const q of exam.questions) {
    if (questionIds.has(q.id)) {
      issues.push(issue(`exam[${exam.id}].question[${q.id}]`, "ID câu hỏi bị trùng"));
    }
    questionIds.add(q.id);
    issues.push(...validateQuestionContent(exam.id, q, new Set()));
  }

  if (exam.questions.length === 0) {
    issues.push(issue(`exam[${exam.id}]`, "Đề không có câu hỏi"));
  }

  const sectionIds = new Set<string>();
  const referencedQuestions = new Set<string>();

  for (const section of exam.sections) {
    if (sectionIds.has(section.id)) {
      issues.push(issue(`exam[${exam.id}].section[${section.id}]`, "ID section bị trùng"));
    }
    sectionIds.add(section.id);

    for (const qid of section.questionIds) {
      if (!questionIds.has(qid)) {
        issues.push(
          issue(
            `exam[${exam.id}].section[${section.id}]`,
            `Section tham chiếu question id không tồn tại: ${qid}`
          )
        );
      }
      referencedQuestions.add(qid);
    }
  }

  for (const qid of questionIds) {
    if (!referencedQuestions.has(qid)) {
      issues.push(
        issue(`exam[${exam.id}].question[${qid}]`, "Câu hỏi không thuộc section nào")
      );
    }
  }

  const sumPoints = exam.questions.reduce((s, q) => s + q.points, 0);
  if (Math.abs(sumPoints - exam.totalPoints) > 0.001) {
    issues.push(
      issue(
        `exam[${exam.id}]`,
        `Tổng điểm không nhất quán: totalPoints=${exam.totalPoints}, tổng câu=${sumPoints}`
      )
    );
  }

  if (exam.durationSeconds <= 0) {
    issues.push(issue(`exam[${exam.id}]`, "durationSeconds không hợp lệ"));
  }

  return { ok: issues.length === 0, issues };
}

export function validateCollectionStructure(
  collection: ExamCollection,
  examsById: Map<string, Exam>
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const parsed = collectionSchema.safeParse(collection);
  if (!parsed.success) {
    for (const err of parsed.error.issues) {
      issues.push(
        issue(
          `collection[${collection.id ?? "unknown"}]`,
          `${err.path.join(".")}: ${err.message}`
        )
      );
    }
    return { ok: false, issues };
  }

  const seenExamIds = new Set<string>();
  for (const examId of collection.examIds) {
    if (seenExamIds.has(examId)) {
      issues.push(issue(`collection[${collection.id}]`, `examId trùng: ${examId}`));
    }
    seenExamIds.add(examId);

    const exam = examsById.get(examId);
    if (!exam) {
      issues.push(
        issue(`collection[${collection.id}]`, `examIds tham chiếu đề không tồn tại: ${examId}`)
      );
    } else if (exam.collectionId !== collection.id) {
      issues.push(
        issue(
          `collection[${collection.id}]`,
          `Đề ${examId} có collectionId không khớp`
        )
      );
    }
  }

  return { ok: issues.length === 0, issues };
}