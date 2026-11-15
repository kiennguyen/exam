/**
 * Build Exam JSON from import + answer key (MC only).
 *
 *   npm run ioe:build -- --exam 1
 *   npm run ioe:build -- --all
 *   npm run ioe:build -- --exam 1 --status published
 */
import fs from "fs/promises";
import path from "path";
import type { Exam, Question } from "../../src/lib/exam/types";
import { validateExamStructure } from "../../src/lib/exam/validate";
import { examSchema } from "../../src/lib/exam/schema";
import {
  ANSWERS_DIR,
  COLLECTION_ID,
  EXAMS_DIR,
  IMPORT_DIR,
  type AnswerKeyFile,
  type ImportedExamFile,
} from "./types";

interface CliOptions {
  examNumbers: number[];
  mcOnly: boolean;
  status: "draft" | "published";
  durationSeconds: number;
  sectionSize: number;
  versionTag: string;
  dryRun: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let examNumbers: number[] = [];
  let mcOnly = false;
  let status: "draft" | "published" = "draft";
  let durationSeconds = 1800; // 30 phút (đề ~200 câu)
  let sectionSize = 50;
  let versionTag = "ioe-import";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--all") {
      examNumbers = Array.from({ length: 50 }, (_, n) => n + 1);
    } else if (a === "--exam" && args[i + 1]) {
      examNumbers.push(Number(args[++i]));
    } else if (a === "--mc-only") {
      mcOnly = true;
    } else if (a === "--status" && args[i + 1]) {
      status = args[++i] === "published" ? "published" : "draft";
    } else if (a === "--duration" && args[i + 1]) {
      durationSeconds = Number(args[++i]);
    } else if (a === "--version" && args[i + 1]) {
      versionTag = args[++i];
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--section-size" && args[i + 1]) {
      sectionSize = Math.max(10, Number(args[++i]));
    }
  }

  if (examNumbers.length === 0) {
    console.error("Chỉ định --exam <n> hoặc --all");
    process.exit(1);
  }

  return {
    examNumbers,
    mcOnly,
    status,
    durationSeconds,
    sectionSize,
    versionTag,
    dryRun,
  };
}

function examSlugFor(n: number): string {
  return `ioe-de-${String(n).padStart(2, "0")}`;
}

function examIdFor(n: number): string {
  return `exam-ioe-g7-${examSlugFor(n)}`;
}

function cleanPrompt(prompt: string): string {
  return prompt
    .replace(/^(Ảnh|Nghe):\s*/i, "")
    .replace(/^Nhấn giữ Ctrl và bấm chuột để nghe:\s*/i, "")
    .trim();
}

async function loadImport(examNumber: number): Promise<ImportedExamFile> {
  const slug = `de-${String(examNumber).padStart(2, "0")}`;
  const file = path.join(process.cwd(), IMPORT_DIR, `${slug}.import.json`);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as ImportedExamFile;
}

async function loadAnswers(examNumber: number): Promise<AnswerKeyFile | null> {
  const slug = `de-${String(examNumber).padStart(2, "0")}`;
  const file = path.join(process.cwd(), ANSWERS_DIR, `${slug}.answers.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as AnswerKeyFile;
  } catch {
    return null;
  }
}

function buildExam(
  imp: ImportedExamFile,
  answers: AnswerKeyFile,
  opts: CliOptions
): { exam: Exam | null; issues: string[] } {
  const issues: string[] = [];
  const slug = examSlugFor(imp.examNumber);
  const questions: Question[] = [];
  let seq = 0;

  const pool = imp.questions.filter((q) =>
    opts.mcOnly
      ? q.kind === "single_choice"
      : q.kind === "single_choice" ||
        q.kind === "fill_blank" ||
        q.kind === "word_order"
  );

  for (const q of pool) {
    const key = String(q.order);
    const rawAns = answers.answersByOrder[key];
    if (!rawAns?.trim()) continue;

    seq += 1;
    const qid = `${slug}-q${String(seq).padStart(3, "0")}`;
    const meta = {
      sourceOrder: q.order,
      ...(q.printedOrder != null ? { printedOrder: q.printedOrder } : {}),
      ...(q.sequence != null ? { sourceSequence: q.sequence } : {}),
      ...(q.hints?.includes("listening") ? { requiresAudio: true } : {}),
      ...(q.hints?.includes("image") ? { requiresImage: true } : {}),
    };

    if (q.kind === "single_choice") {
      const ans = rawAns.toLowerCase();
      if (!q.options?.some((o) => o.id === ans)) {
        issues.push(`Câu ${q.order}: đáp án "${ans}" không hợp lệ`);
        seq -= 1;
        continue;
      }
      questions.push({
        id: qid,
        type: "single_choice",
        order: seq,
        points: 1,
        prompt: cleanPrompt(q.prompt),
        options: q.options,
        correctAnswer: ans,
        metadata: meta,
      });
    } else if (q.kind === "fill_blank") {
      questions.push({
        id: qid,
        type: "fill_blank",
        order: seq,
        points: 1,
        prompt: cleanPrompt(q.prompt),
        correctAnswer: rawAns.trim(),
        metadata: meta,
      });
    } else if (q.kind === "word_order") {
      questions.push({
        id: qid,
        type: "word_order",
        order: seq,
        points: 1,
        prompt: cleanPrompt(q.prompt),
        correctAnswer: rawAns.trim(),
        metadata: meta,
      });
    }
  }

  if (questions.length === 0) {
    issues.push("Không có câu nào có đáp án (MC hoặc điền khuyết)");
    return { exam: null, issues };
  }

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  const sections: Exam["sections"] = [];
  for (let i = 0; i < questions.length; i += opts.sectionSize) {
    const chunk = questions.slice(i, i + opts.sectionSize);
    const part = Math.floor(i / opts.sectionSize) + 1;
    sections.push({
      id: `${slug}-sec-${part}`,
      title: `Phần ${part} (câu ${i + 1}–${i + chunk.length})`,
      order: part - 1,
      questionIds: chunk.map((q) => q.id),
    });
  }

  const estimatedDuration = opts.durationSeconds;

  const exam: Exam = {
    schemaVersion: 1,
    id: examIdFor(imp.examNumber),
    collectionId: COLLECTION_ID,
    slug,
    title: `IOE lớp 7 — Đề ${String(imp.examNumber).padStart(2, "0")}`,
    instructions:
      `Đề gồm ${sections.length} phần (~${opts.sectionSize} câu/phần). Có trắc nghiệm, điền khuyết và sắp xếp từ. Câu nghe có thể thiếu file audio trên web. Dùng thanh phần bên dưới để nhảy nhanh giữa các phần.`,
    durationSeconds: estimatedDuration,
    totalPoints,
    version: `${opts.versionTag}-${slug}-${questions.length}q`,
    status: opts.status,
    sections,
    questions,
  };

  const report = validateExamStructure(exam);
  if (!report.ok) {
    for (const it of report.issues) {
      issues.push(`${it.path}: ${it.message}`);
    }
  }

  const parsed = examSchema.safeParse(exam);
  if (!parsed.success) {
    issues.push(parsed.error.issues.map((i) => i.message).join("; "));
  }

  return { exam: report.ok && parsed.success ? exam : null, issues };
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const outDir = path.join(process.cwd(), EXAMS_DIR);
  await fs.mkdir(outDir, { recursive: true });

  const built: string[] = [];
  const skipped: Array<{ exam: number; reason: string }> = [];

  for (const n of opts.examNumbers) {
    try {
      await loadImport(n);
    } catch {
      skipped.push({ exam: n, reason: "Chưa import (chạy npm run import:ioe)" });
      continue;
    }

    const imp = await loadImport(n);
    const answers = await loadAnswers(n);
    if (!answers) {
      skipped.push({
        exam: n,
        reason: `Thiếu ${ANSWERS_DIR}/de-${String(n).padStart(2, "0")}.answers.json`,
      });
      continue;
    }

    const mcWithKey = imp.questions.filter(
      (q) => q.kind === "single_choice" && answers.answersByOrder[String(q.order)]
    ).length;

    const { exam, issues } = buildExam(imp, answers, opts);
    if (!exam) {
      skipped.push({ exam: n, reason: issues.join("; ") || "Build thất bại" });
      continue;
    }

    const outFile = path.join(outDir, `${exam.slug}.json`);
    if (opts.dryRun) {
      console.log(`[dry-run] Đề ${n}: ${exam.questions.length} câu MC (có key: ${mcWithKey})`);
      built.push(exam.slug);
      continue;
    }

    await fs.writeFile(outFile, JSON.stringify(exam, null, 2), "utf-8");
    console.log(`✓ Đề ${n} → ${path.relative(process.cwd(), outFile)} (${exam.questions.length} câu)`);
    built.push(exam.slug);
  }

  console.log(`\nHoàn tất: ${built.length} đề build, ${skipped.length} bỏ qua.`);
  if (skipped.length > 0 && skipped.length <= 10) {
    for (const s of skipped) {
      console.log(`  - Đề ${s.exam}: ${s.reason}`);
    }
  } else if (skipped.length > 10) {
    console.log(`  (Xem log đầu để biết lý do từng đề bỏ qua)`);
  }

  if (built.length > 0 && !opts.dryRun) {
    console.log("\nChạy tiếp: npm run ioe:sync-collection && npm run validate:exams");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});