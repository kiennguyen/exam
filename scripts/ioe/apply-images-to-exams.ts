/**
 * Gắn question.media (image) vào JSON đề theo sourceSequence + image-map.
 *
 *   npm run ioe:apply-images
 */
import fs from "fs/promises";
import path from "path";
import type { Exam, Question } from "../../src/lib/exam/types";
import { examSchema } from "../../src/lib/exam/schema";
import { validateExamStructure } from "../../src/lib/exam/validate";
import type { ImageMapFile } from "./parse-docx-images";
import { EXAMS_DIR } from "./types";

const MAP_FILE = path.join(
  process.cwd(),
  "data",
  "imported",
  "ioe-grade-7",
  "media",
  "image-map.json"
);

function examSlugToMapKey(examSlug: string): string | null {
  const m = examSlug.match(/ioe-de-(\d+)/);
  if (!m) return null;
  return `de-${m[1].padStart(2, "0")}`;
}

function applyToQuestion(
  q: Question,
  examMap: Record<string, { publicPath: string; fileName: string }> | undefined
): boolean {
  if (!examMap) return false;
  const seq = q.metadata?.sourceSequence;
  if (typeof seq !== "number") return false;
  const entry = examMap[String(seq)];
  if (!entry?.publicPath) return false;
  if (q.media?.type === "audio") return false;

  q.media = {
    type: "image",
    url: entry.publicPath,
    alt: `Minh họa câu ${seq}`,
  };
  q.metadata = { ...q.metadata, requiresImage: true };
  q.prompt = q.prompt.replace(/^Ảnh:\s*/i, "").trim();
  return true;
}

async function main(): Promise<void> {
  let map: ImageMapFile;
  try {
    map = JSON.parse(await fs.readFile(MAP_FILE, "utf-8")) as ImageMapFile;
  } catch {
    console.error("Chưa có image-map. Chạy ioe:parse-images && ioe:copy-images");
    process.exit(1);
  }

  const dir = path.join(process.cwd(), EXAMS_DIR);
  const files = (await fs.readdir(dir)).filter(
    (f) => f.startsWith("ioe-de-") && f.endsWith(".json")
  );

  let total = 0;
  let examsUpdated = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const exam = examSchema.parse(JSON.parse(await fs.readFile(filePath, "utf-8"))) as Exam;
    const mapKey = examSlugToMapKey(exam.slug);
    const examMap = mapKey ? map.byExam[mapKey] : undefined;

    let attached = 0;
    for (const q of exam.questions) {
      if (q.media?.type === "image" || q.media?.type === "audio") continue;
      if (q.metadata?.requiresImage !== true) continue;
      if (applyToQuestion(q, examMap)) attached += 1;
    }

    if (attached === 0) continue;

    if (exam.version && !exam.version.includes("-img")) {
      exam.version = `${exam.version}-img`;
    }

    const report = validateExamStructure(exam);
    if (!report.ok) {
      console.error(`✗ ${exam.slug}: ${report.issues.map((i) => i.message).join("; ")}`);
      continue;
    }

    await fs.writeFile(filePath, JSON.stringify(exam, null, 2), "utf-8");
    total += attached;
    examsUpdated += 1;
    console.log(`✓ ${exam.slug}: ${attached} câu ảnh`);
  }

  console.log(`\nHoàn tất: ${examsUpdated} đề, ${total} ảnh.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});