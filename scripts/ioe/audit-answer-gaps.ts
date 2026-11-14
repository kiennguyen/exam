/**
 * List scorable import questions missing from answer JSON (or unmapped in docx).
 *
 *   npm run ioe:audit-gaps
 */
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import {
  ANSWERS_DIR,
  IMPORT_DIR,
  type AnswerKeyFile,
  type ImportedExamFile,
} from "./types";
import { mapAnswerToStorage, parseRawAnswers, splitAnswerExams } from "./answer-parse-utils";

const DEFAULT_ANSWER_DOC = path.join(
  process.env.USERPROFILE ?? "",
  "Downloads",
  "ĐÁP ÁN 7 50 ĐỀ IOE K7.docx"
);

async function main(): Promise<void> {
  const answerPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ANSWER_DOC;

  let docxSections: Map<number, Map<number, string>> | null = null;
  try {
    await fs.access(answerPath);
    const { value: text } = await mammoth.extractRawText({ path: answerPath });
    const sections = splitAnswerExams(text);
    docxSections = new Map();
    for (let i = 0; i < sections.length; i++) {
      docxSections.set(i + 1, parseRawAnswers(sections[i]));
    }
  } catch {
    console.warn(`Không đọc được file đáp án: ${answerPath} (chỉ audit JSON)`);
  }

  const gaps: Array<{
    exam: number;
    order: number;
    kind: string;
    prompt: string;
    rawFromDocx?: string;
    reason: string;
  }> = [];

  for (let exam = 1; exam <= 50; exam++) {
    const slug = `de-${String(exam).padStart(2, "0")}`;
    const importPath = path.join(process.cwd(), IMPORT_DIR, `${slug}.import.json`);
    const answersPath = path.join(process.cwd(), ANSWERS_DIR, `${slug}.answers.json`);

    let imp: ImportedExamFile;
    let ans: AnswerKeyFile;
    try {
      imp = JSON.parse(await fs.readFile(importPath, "utf-8")) as ImportedExamFile;
      ans = JSON.parse(await fs.readFile(answersPath, "utf-8")) as AnswerKeyFile;
    } catch {
      continue;
    }

    const pool = imp.questions.filter(
      (q) =>
        q.kind === "single_choice" || q.kind === "fill_blank" || q.kind === "word_order"
    );

    const rawByOrder = docxSections?.get(exam);

    for (const q of pool) {
      const key = String(q.order);
      const stored = ans.answersByOrder[key];
      const raw = rawByOrder?.get(q.order);

      if (stored) continue;

      let reason = "thiếu trong answers.json";
      if (rawByOrder) {
        if (!raw) reason = "không có dòng đáp án trong docx";
        else if (!mapAnswerToStorage(raw, q)) reason = `docx có nhưng không map được: ${raw.slice(0, 120)}`;
      }

      gaps.push({
        exam,
        order: q.order,
        kind: q.kind,
        prompt: q.prompt.slice(0, 160),
        rawFromDocx: raw,
        reason,
      });
    }
  }

  const outPath = path.join(process.cwd(), ANSWERS_DIR, "_answer-gaps.json");
  await fs.writeFile(
    outPath,
    JSON.stringify({ checkedAt: new Date().toISOString(), gapCount: gaps.length, gaps }, null, 2),
    "utf-8"
  );

  console.log(`Tìm thấy ${gaps.length} câu thiếu đáp án (chi tiết: ${path.relative(process.cwd(), outPath)})`);
  for (const g of gaps.slice(0, 30)) {
    console.log(`  Đề ${String(g.exam).padStart(2, "0")} câu ${g.order} (${g.kind}): ${g.reason}`);
  }
  if (gaps.length > 30) {
    console.log(`  … và ${gaps.length - 30} câu nữa`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});