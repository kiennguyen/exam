/**
 * Gắn metadata.sourceSequence vào đề đã build (khớp logic ioe:build + file import/đáp án).
 *
 *   npm run ioe:patch-sequence
 */
import fs from "fs/promises";
import path from "path";
import type { Exam } from "../../src/lib/exam/types";
import { examSchema } from "../../src/lib/exam/schema";
import {
  ANSWERS_DIR,
  EXAMS_DIR,
  IMPORT_DIR,
  type AnswerKeyFile,
  type ImportedExamFile,
} from "./types";

function examNumFromSlug(slug: string): number | null {
  const m = slug.match(/ioe-de-(\d+)/);
  return m ? Number(m[1]) : null;
}

async function loadImport(examNumber: number): Promise<ImportedExamFile> {
  const file = path.join(
    process.cwd(),
    IMPORT_DIR,
    `de-${String(examNumber).padStart(2, "0")}.import.json`
  );
  return JSON.parse(await fs.readFile(file, "utf-8")) as ImportedExamFile;
}

async function loadAnswers(examNumber: number): Promise<AnswerKeyFile> {
  const file = path.join(
    process.cwd(),
    ANSWERS_DIR,
    `de-${String(examNumber).padStart(2, "0")}.answers.json`
  );
  return JSON.parse(await fs.readFile(file, "utf-8")) as AnswerKeyFile;
}

function sequencesInBuildOrder(
  imp: ImportedExamFile,
  answers: AnswerKeyFile
): number[] {
  const pool = imp.questions.filter(
    (q) =>
      q.kind === "single_choice" ||
      q.kind === "fill_blank" ||
      q.kind === "word_order"
  );
  const out: number[] = [];
  for (const q of pool) {
    const raw = answers.answersByOrder[String(q.order)];
    if (!raw?.trim()) continue;
    if (q.sequence == null) continue;
    out.push(q.sequence);
  }
  return out;
}

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), EXAMS_DIR);
  const files = (await fs.readdir(dir)).filter(
    (f) => f.startsWith("ioe-de-") && f.endsWith(".json")
  );

  let patched = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    const exam = examSchema.parse(JSON.parse(await fs.readFile(filePath, "utf-8"))) as Exam;
    const n = examNumFromSlug(exam.slug);
    if (n == null) continue;

    let imp: ImportedExamFile;
    let answers: AnswerKeyFile;
    try {
      imp = await loadImport(n);
      answers = await loadAnswers(n);
    } catch {
      console.warn(`  Bỏ qua ${exam.slug}: thiếu import/đáp án`);
      continue;
    }

    const seqs = sequencesInBuildOrder(imp, answers);
    if (seqs.length !== exam.questions.length) {
      console.warn(
        `  ⚠ ${exam.slug}: ${seqs.length} sequence vs ${exam.questions.length} câu — gắn theo min độ dài`
      );
    }

    const nq = Math.min(seqs.length, exam.questions.length);
    let changed = 0;
    for (let i = 0; i < nq; i++) {
      const q = exam.questions[i];
      if (q.metadata?.sourceSequence === seqs[i]) continue;
      q.metadata = { ...q.metadata, sourceSequence: seqs[i] };
      changed += 1;
    }

    if (changed > 0) {
      await fs.writeFile(filePath, JSON.stringify(exam, null, 2), "utf-8");
      patched += 1;
      console.log(`✓ ${exam.slug}: ${changed} câu có sourceSequence`);
    }
  }

  console.log(`\nHoàn tất: ${patched} đề cập nhật sourceSequence.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});