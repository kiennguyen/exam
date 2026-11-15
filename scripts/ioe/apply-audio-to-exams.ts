/**
 * Gắn question.media (audio) vào JSON đề đã build, theo metadata.sourceOrder + audio-map.
 *
 *   npm run ioe:apply-audio
 */
import fs from "fs/promises";
import path from "path";
import type { Exam, Question } from "../../src/lib/exam/types";
import { examSchema } from "../../src/lib/exam/schema";
import { validateExamStructure } from "../../src/lib/exam/validate";
import type { AudioMapFile } from "./parse-docx-audio";
import { EXAMS_DIR } from "./types";

const MAP_FILE = path.join(
  process.cwd(),
  "data",
  "imported",
  "ioe-grade-7",
  "media",
  "audio-map.json"
);

export function cleanListeningPrompt(prompt: string): string {
  return prompt
    .replace(/^Nghe:\s*/i, "")
    .replace(/^Nhấn giữ Ctrl và bấm chuột để nghe:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function examSlugToMapKey(examSlug: string): string | null {
  const m = examSlug.match(/ioe-de-(\d+)/);
  if (!m) return null;
  return `de-${m[1].padStart(2, "0")}`;
}

function isListeningQuestion(q: Question): boolean {
  if (q.metadata?.requiresAudio === true) return true;
  return /^(Nghe:|Nhấn giữ Ctrl|Listen and)/i.test(q.prompt);
}

function applyToQuestion(
  q: Question,
  examMap: Record<string, { publicPath: string; fileName: string }> | undefined
): boolean {
  if (!examMap || !isListeningQuestion(q)) return false;
  const seq = q.metadata?.sourceSequence;
  if (typeof seq !== "number") return false;
  const entry = examMap[String(seq)];
  if (!entry?.publicPath) return false;

  q.media = {
    type: "audio",
    url: entry.publicPath,
    alt: `Audio (câu ${seq})`,
  };
  q.prompt = cleanListeningPrompt(q.prompt);
  return true;
}

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await fs.readFile(MAP_FILE, "utf-8");
  } catch {
    console.error("Chưa có audio-map. Chạy: npm run ioe:parse-audio && npm run ioe:download-audio");
    process.exit(1);
  }

  const map = JSON.parse(raw) as AudioMapFile;
  const dir = path.join(process.cwd(), EXAMS_DIR);
  const files = (await fs.readdir(dir)).filter(
    (f) => f.startsWith("ioe-de-") && f.endsWith(".json")
  );

  let totalAttached = 0;
  let examsUpdated = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const exam = examSchema.parse(JSON.parse(await fs.readFile(filePath, "utf-8"))) as Exam;
    const mapKey = examSlugToMapKey(exam.slug);
    const examMap = mapKey ? map.byExam[mapKey] : undefined;

    let attached = 0;
    for (const q of exam.questions) {
      if (applyToQuestion(q, examMap)) attached += 1;
    }

    if (attached === 0) continue;

    if (exam.instructions.includes("Câu nghe có thể thiếu file audio trên web.")) {
      exam.instructions = exam.instructions.replace(
        "Câu nghe có thể thiếu file audio trên web.",
        "Câu nghe có nút phát audio trên web."
      );
    }
    if (exam.version && !exam.version.includes("-audio")) {
      exam.version = `${exam.version}-audio`;
    }

    const report = validateExamStructure(exam);
    if (!report.ok) {
      console.error(`✗ ${exam.slug}: ${report.issues.map((i) => i.message).join("; ")}`);
      continue;
    }

    await fs.writeFile(filePath, JSON.stringify(exam, null, 2), "utf-8");
    totalAttached += attached;
    examsUpdated += 1;
    console.log(`✓ ${exam.slug}: ${attached} câu audio`);
  }

  console.log(`\nHoàn tất: ${examsUpdated} đề, ${totalAttached} câu có media audio.`);
  console.log("Chạy: npm run validate:exams");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});