/**
 * Sync data/collections/ioe-grade-7.json examIds from data/exams/ioe-grade-7/*.json
 */
import fs from "fs/promises";
import path from "path";
import { examSchema } from "../../src/lib/exam/schema";
import type { Exam, ExamCollection } from "../../src/lib/exam/types";
import { COLLECTION_ID } from "./types";

const SAMPLE_ORDER = [
  "exam-ioe-g7-demo-nhanh",
  "exam-ioe-g7-practice-01",
  "exam-ioe-g7-practice-02",
];

async function main(): Promise<void> {
  const collectionPath = path.join(process.cwd(), "data/collections/ioe-grade-7.json");
  const examsDir = path.join(process.cwd(), "data/exams/ioe-grade-7");

  const collection = JSON.parse(
    await fs.readFile(collectionPath, "utf-8")
  ) as ExamCollection;

  const files = (await fs.readdir(examsDir)).filter((f) => f.endsWith(".json"));
  const exams: Exam[] = [];
  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(path.join(examsDir, file), "utf-8"));
    exams.push(examSchema.parse(raw) as Exam);
  }

  const importExams = exams
    .filter((e) => e.collectionId === COLLECTION_ID && e.id.startsWith("exam-ioe-g7-ioe-de-"))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const importIds = importExams.map((e) => e.id);
  const merged = [...SAMPLE_ORDER, ...importIds.filter((id) => !SAMPLE_ORDER.includes(id))];

  collection.examIds = merged;
  await fs.writeFile(collectionPath, JSON.stringify(collection, null, 2) + "\n", "utf-8");
  console.log(`✓ Collection cập nhật: ${merged.length} examIds (${importIds.length} đề IOE import).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});