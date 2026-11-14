/**
 * Parse answer key Word file → de-XX.answers.json
 *
 *   npm run ioe:parse-answers
 *   npm run ioe:parse-answers -- "C:\path\to\answers.docx"
 */
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { ANSWERS_DIR, IMPORT_DIR, type AnswerKeyFile, type ImportedExamFile } from "./types";
import { mapAnswerToStorage, parseRawAnswers, splitAnswerExams } from "./answer-parse-utils";

const DEFAULT_ANSWER_DOC = path.join(
  process.env.USERPROFILE ?? "",
  "Downloads",
  "ĐÁP ÁN 7 50 ĐỀ IOE K7.docx"
);

async function main(): Promise<void> {
  const answerPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ANSWER_DOC;

  try {
    await fs.access(answerPath);
  } catch {
    console.error(`Không tìm thấy file đáp án: ${answerPath}`);
    process.exit(1);
  }

  const { value: text } = await mammoth.extractRawText({ path: answerPath });
  const sections = splitAnswerExams(text);

  if (sections.length === 0) {
    console.error("Không tách được đề từ file đáp án");
    process.exit(1);
  }

  await fs.mkdir(path.join(process.cwd(), ANSWERS_DIR), { recursive: true });

  let totalMapped = 0;
  let totalMissing = 0;

  for (let i = 0; i < sections.length; i++) {
    const examNumber = i + 1;
    const slug = `de-${String(examNumber).padStart(2, "0")}`;
    const importPath = path.join(process.cwd(), IMPORT_DIR, `${slug}.import.json`);

    let imp: ImportedExamFile;
    try {
      imp = JSON.parse(await fs.readFile(importPath, "utf-8")) as ImportedExamFile;
    } catch {
      console.warn(`Bỏ qua đề ${examNumber}: chưa có import ${slug}`);
      continue;
    }

    const raw = parseRawAnswers(sections[i]);
    const answersByOrder: Record<string, string> = {};
    let mapped = 0;
    let missing = 0;

    const answerable = imp.questions.filter(
      (q) =>
        q.kind === "single_choice" ||
        q.kind === "fill_blank" ||
        q.kind === "word_order"
    );

    for (const q of answerable) {
      const rawAns = raw.get(q.order);
      if (!rawAns) {
        missing += 1;
        continue;
      }
      const stored = mapAnswerToStorage(rawAns, q);
      if (stored) {
        answersByOrder[String(q.order)] = stored;
        mapped += 1;
      } else {
        // Đề IOE đánh số lại theo phần → trùng `order`; đáp án docx chỉ có một dòng / số.
        const siblingCovers = answerable.some(
          (other) =>
            other.order === q.order &&
            other !== q &&
            mapAnswerToStorage(rawAns, other) !== null
        );
        if (!siblingCovers) {
          missing += 1;
          if (process.env.IOE_PARSE_VERBOSE === "1") {
            console.warn(
              `  ? Đề ${String(examNumber).padStart(2, "0")} câu ${q.order} (${q.kind}): raw="${rawAns.slice(0, 100)}"`
            );
          }
        }
      }
    }

    const payload: AnswerKeyFile = {
      schemaVersion: 1,
      examNumber,
      slug,
      answersByOrder,
    };

    const outPath = path.join(process.cwd(), ANSWERS_DIR, `${slug}.answers.json`);
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf-8");

    totalMapped += mapped;
    totalMissing += missing;
    console.log(`✓ Đề ${String(examNumber).padStart(2, "0")}: ${mapped} đáp án (${missing} thiếu/không khớp)`);
  }

  const report = {
    parsedAt: new Date().toISOString(),
    sourceFile: answerPath,
    examSections: sections.length,
    totalMapped,
    totalMissing,
  };
  await fs.writeFile(
    path.join(process.cwd(), ANSWERS_DIR, "_parse-answers-report.json"),
    JSON.stringify(report, null, 2),
    "utf-8"
  );

  console.log(`\nTổng: ${totalMapped} đáp án map được, ${totalMissing} thiếu.`);
  console.log("Tiếp theo: npm run ioe:build -- --all");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});