import type {
  Exam,
  GradingResult,
  Question,
  QuestionResult,
  SubmitPayload,
  UserAnswer,
} from "./types";

function normalizeMulti(answer: string[]): string[] {
  return [...answer].sort();
}

function normalizeTextAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function answersEqual(
  user: UserAnswer,
  correct: string | string[],
  mode: "exact" | "text" = "exact"
): boolean {
  if (user === null || user === undefined || user === "") {
    return false;
  }
  if (Array.isArray(correct)) {
    if (mode === "text") {
      if (typeof user !== "string") return false;
      const u = normalizeTextAnswer(user);
      return correct.some((c) => normalizeTextAnswer(c) === u);
    }
    if (!Array.isArray(user)) return false;
    const a = normalizeMulti(user);
    const b = normalizeMulti(correct);
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  if (typeof user !== "string") return false;
  if (mode === "text") {
    return normalizeTextAnswer(user) === normalizeTextAnswer(correct);
  }
  return user === correct;
}

function isUnanswered(user: UserAnswer): boolean {
  if (user === null || user === undefined) return true;
  if (typeof user === "string" && user.trim() === "") return true;
  if (Array.isArray(user) && user.length === 0) return true;
  return false;
}

function gradeQuestion(
  question: Question,
  userAnswer: UserAnswer,
  flagged: boolean
): QuestionResult {
  const unanswered = isUnanswered(userAnswer);
  const compareMode =
    question.type === "fill_blank" || question.type === "word_order"
      ? "text"
      : "exact";
  const correct =
    !unanswered && answersEqual(userAnswer, question.correctAnswer, compareMode);

  return {
    questionId: question.id,
    status: unanswered ? "unanswered" : correct ? "correct" : "incorrect",
    pointsEarned: correct ? question.points : 0,
    pointsPossible: question.points,
    userAnswer: unanswered ? null : userAnswer,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    flagged,
  };
}

export function gradeExam(exam: Exam, payload: SubmitPayload): GradingResult {
  const flaggedSet = new Set(payload.flagged);

  const questions: QuestionResult[] = exam.questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((q) =>
      gradeQuestion(q, payload.answers[q.id] ?? null, flaggedSet.has(q.id))
    );

  const pointsEarned = questions.reduce((s, q) => s + q.pointsEarned, 0);
  const correctCount = questions.filter((q) => q.status === "correct").length;
  const incorrectCount = questions.filter((q) => q.status === "incorrect").length;
  const unansweredCount = questions.filter((q) => q.status === "unanswered").length;

  const durationSeconds = Math.max(
    0,
    Math.round((payload.submittedAt - payload.startedAt) / 1000)
  );

  const percentCorrect =
    exam.questions.length > 0
      ? Math.round((correctCount / exam.questions.length) * 1000) / 10
      : 0;

  const pointsRounded = Math.round(pointsEarned * 10) / 10;

  return {
    examId: exam.id,
    examTitle: exam.title,
    examVersion: exam.version,
    sessionId: payload.sessionId,
    startedAt: payload.startedAt,
    submittedAt: payload.submittedAt,
    durationSeconds,
    totalPoints: exam.totalPoints,
    pointsEarned: pointsRounded,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentCorrect,
    autoSubmitted: payload.autoSubmitted ?? false,
    questions,
  };
}