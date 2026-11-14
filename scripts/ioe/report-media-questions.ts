/**
 * Thống kê câu cần ảnh/audio trong đề đã build (và câu đã gắn media.url).
 *
 *   npm run ioe:media-report
 */
import fs from "fs/promises";
import path from "path";
import type { Exam, Question } from "../../src/lib/exam/types";
import { examSchema } from "../../src/lib/exam/schema";
import { EXAMS_DIR } from "./types";

function tallyQuestion(q: Question) {
  const needsImage = q.metadata?.requiresImage === true;
  const needsAudio = q.metadata?.requiresAudio === true;
  const hasImage = q.media?.type === "image" && Boolean(q.media.url);
  const hasAudio = q.media?.type === "audio" && Boolean(q.media.url);
  return { needsImage, needsAudio, hasImage, hasAudio };
}

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), EXAMS_DIR);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));

  let exams = 0;
  let questions = 0;
  let needImage = 0;
  let needAudio = 0;
  let hasImage = 0;
  let hasAudio = 0;

  const samples: Array<{ exam: string; qid: string; kind: string }> = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), "utf-8");
    const exam = examSchema.parse(JSON.parse(raw)) as Exam;
    exams += 1;
    for (const q of exam.questions) {
      questions += 1;
      const t = tallyQuestion(q);
      if (t.needsImage) needImage += 1;
      if (t.needsAudio) needAudio += 1;
      if (t.hasImage) hasImage += 1;
      if (t.hasAudio) hasAudio += 1;
      if (t.needsImage && !t.hasImage && samples.length < 15) {
        samples.push({
          exam: exam.slug,
          qid: q.id,
          kind: "image",
        });
      }
    }
  }

  const out = {
    reportedAt: new Date().toISOString(),
    exams,
    scorableQuestions: questions,
    needsImage: needImage,
    needsAudio: needAudio,
    withImageUrl: hasImage,
    withAudioUrl: hasAudio,
    sampleMissingImages: samples,
  };

  const outPath = path.join(process.cwd(), "data", "imported", "ioe-grade-7", "_media-report.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf-8");

  console.log(
    `${exams} đề · ${questions} câu chấm được\n` +
      `  Cần ảnh: ${needImage} (đã gắn URL: ${hasImage})\n` +
      `  Cần audio: ${needAudio} (đã gắn URL: ${hasAudio})\n` +
      `  Báo cáo: ${path.relative(process.cwd(), outPath)}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});