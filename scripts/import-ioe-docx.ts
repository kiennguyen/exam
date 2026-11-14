/**
 * Parses a local IOE Grade 7 Word dump into per-exam import files.
 * Output: data/imported/ (gitignored) — NOT for public commit without rights review.
 *
 * Usage:
 *   npm run import:ioe -- [path-to.docx]
 */
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";

const DEFAULT_INPUT = path.join(
  process.env.USERPROFILE ?? "",
  "Downloads",
  "50 DE IOE K7.docx"
);

const OUT_DIR = path.join(process.cwd(), "data", "imported", "ioe-grade-7");

interface ParsedOption {
  id: string;
  label: string;
}

interface ImportedQuestion {
  order: number;
  sequence?: number;
  printedOrder?: number;
  kind: "single_choice" | "fill_blank" | "word_order" | "unsupported";
  prompt: string;
  options?: ParsedOption[];
  rawText: string;
  hints?: string[];
}

interface ImportedExamFile {
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

function normalizeSpaces(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function splitExams(fullText: string): string[] {
  const parts = fullText.split(/SỐ:\s*/i);
  return parts.slice(1).map((chunk) => chunk.replace(/^\d+\s*/, "").trim());
}

function splitQuestions(examBody: string): Array<{ order: number; body: string }> {
  const items: Array<{ order: number; body: string }> = [];
  const re = /(\d{1,3})\.\s/g;
  let match: RegExpExecArray | null;
  const hits: Array<{ order: number; index: number }> = [];

  while ((match = re.exec(examBody)) !== null) {
    const order = Number(match[1]);
    if (order < 1 || order > 250) continue;
    hits.push({ order, index: match.index });
  }

  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : examBody.length;
    const slice = examBody.slice(start, end).trim();
    const body = slice.replace(/^\d{1,3}\.\s*/, "").trim();
    if (body) items.push({ order: hits[i].order, body });
  }

  return items;
}

function parseSingleChoice(body: string): ImportedQuestion | null {
  const optionRe =
    /A\.\s*([\s\S]*?)\s+B\.\s*([\s\S]*?)\s+C\.\s*([\s\S]*?)\s+D\.\s*([\s\S]*?)$/i;
  const m = body.match(optionRe);
  if (!m) return null;

  const prompt = normalizeSpaces(body.slice(0, body.search(/A\./i)));
  const options: ParsedOption[] = [
    { id: "a", label: normalizeSpaces(m[1]) },
    { id: "b", label: normalizeSpaces(m[2]) },
    { id: "c", label: normalizeSpaces(m[3]) },
    { id: "d", label: normalizeSpaces(m[4]) },
  ];

  if (!prompt || options.some((o) => !o.label)) return null;

  const hints: string[] = [];
  if (/Nghe:/i.test(body)) hints.push("listening");
  if (/Ảnh:/i.test(body)) hints.push("image");

  return {
    order: 0,
    kind: "single_choice",
    prompt,
    options,
    rawText: body,
    hints: hints.length ? hints : undefined,
  };
}

function looksLikeFillBlank(body: string): boolean {
  return /_\s*_/.test(body) && !/\sA\.\s/i.test(body);
}

function looksLikeWordOrder(body: string): boolean {
  const parts = body.split("/").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 3 && !/\sA\.\s/i.test(body) && !/_\s*_/.test(body);
}

function parseQuestion(order: number, body: string): ImportedQuestion {
  const mc = parseSingleChoice(body);
  if (mc) {
    return { ...mc, order };
  }
  if (looksLikeWordOrder(body)) {
    return {
      order,
      kind: "word_order",
      prompt: normalizeSpaces(body),
      rawText: body,
    };
  }
  if (looksLikeFillBlank(body)) {
    return {
      order,
      kind: "fill_blank",
      prompt: normalizeSpaces(body),
      rawText: body,
      hints: [
        ...( /Nghe:/i.test(body) ? ["listening"] : []),
        ...( /Ảnh:/i.test(body) ? ["image"] : []),
      ],
    };
  }
  return {
    order,
    kind: "unsupported",
    prompt: normalizeSpaces(body.slice(0, 280)),
    rawText: body,
    hints: [
      ...( /Nghe:/i.test(body) ? ["listening"] : []),
      ...( /\//.test(body) ? ["word_order"] : []),
    ],
  };
}

async function main(): Promise<void> {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT;

  try {
    await fs.access(inputPath);
  } catch {
    console.error(`Không tìm thấy file: ${inputPath}`);
    process.exit(1);
  }

  const { value: text } = await mammoth.extractRawText({ path: inputPath });
  const exams = splitExams(text);

  if (exams.length === 0) {
    console.error("Không tách được đề từ file.");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const summary: Array<{
    examNumber: number;
    questions: number;
    singleChoice: number;
    fillBlank: number;
    wordOrder: number;
    unsupported: number;
  }> = [];

  for (let i = 0; i < exams.length; i++) {
    const examNumber = i + 1;
    const slug = `de-${String(examNumber).padStart(2, "0")}`;
    const chunks = splitQuestions(exams[i]);
    const questions = chunks.map((c, idx) => {
      const q = parseQuestion(c.order, c.body);
      // `order` = số in trên đề (lặp lại giữa các phần); `sequence` = vị trí trong file Word
      return { ...q, order: c.order, sequence: idx + 1, printedOrder: c.order };
    });
    const singleChoiceCount = questions.filter((q) => q.kind === "single_choice").length;
    const fillBlankCount = questions.filter((q) => q.kind === "fill_blank").length;
    const wordOrderCount = questions.filter((q) => q.kind === "word_order").length;
    const unsupportedCount = questions.filter((q) => q.kind === "unsupported").length;

    const payload: ImportedExamFile = {
      schemaVersion: 1,
      importFormat: "ioe-docx-v1",
      examNumber,
      slug,
      sourceFile: path.basename(inputPath),
      importedAt: new Date().toISOString(),
      title: `IOE Tiếng Anh lớp 7 — đề ${String(examNumber).padStart(2, "0")} (import nháp)`,
      questionCount: questions.length,
      singleChoiceCount,
      unsupportedCount,
      questions,
      notes: [
        "File import nháp: chưa có đáp án chuẩn trong nguồn Word.",
        "Không commit thư mục data/imported/ lên repo public khi chưa có quyền nội dung.",
        "Chỉ chuyển sang data/exams/ sau khi bổ sung correctAnswer và validate.",
      ],
    };

    const outFile = path.join(OUT_DIR, `${slug}.import.json`);
    await fs.writeFile(outFile, JSON.stringify(payload, null, 2), "utf-8");

    summary.push({
      examNumber,
      questions: questions.length,
      singleChoice: singleChoiceCount,
      fillBlank: fillBlankCount,
      wordOrder: wordOrderCount,
      unsupported: unsupportedCount,
    });
  }

  const reportPath = path.join(OUT_DIR, "_import-report.json");
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        sourceFile: inputPath,
        examCount: summary.length,
        summary,
      },
      null,
      2
    ),
    "utf-8"
  );

  const totals = summary.reduce(
    (acc, s) => {
      acc.questions += s.questions;
      acc.mc += s.singleChoice;
      acc.fill += s.fillBlank;
      acc.word += s.wordOrder;
      acc.unsupported += s.unsupported;
      return acc;
    },
    { questions: 0, mc: 0, fill: 0, word: 0, unsupported: 0 }
  );

  console.log(`✓ Đã import ${summary.length} đề → ${OUT_DIR}`);
  console.log(
    `  Câu hỏi: ${totals.questions} | MC: ${totals.mc} | Blank: ${totals.fill} | Sắp từ: ${totals.word} | Khác: ${totals.unsupported}`
  );
  console.log(`  Báo cáo: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});