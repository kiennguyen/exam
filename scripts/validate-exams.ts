import fs from "fs/promises";
import path from "path";
import { collectionSchema, examSchema } from "../src/lib/exam/schema";
import {
  validateCollectionStructure,
  validateExamStructure,
  type ValidationIssue,
} from "../src/lib/exam/validate";
import type { Exam, ExamCollection } from "../src/lib/exam/types";

const DATA_ROOT = path.join(process.cwd(), "data");

async function main(): Promise<void> {
  const allIssues: ValidationIssue[] = [];
  const examsById = new Map<string, Exam>();

  const examsDir = path.join(DATA_ROOT, "exams");
  const collectionDirs = await fs.readdir(examsDir);

  for (const colDir of collectionDirs) {
    const fullColDir = path.join(examsDir, colDir);
    const stat = await fs.stat(fullColDir);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(fullColDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(fullColDir, file);
      const relative = path.relative(process.cwd(), filePath);

      let raw: unknown;
      try {
        raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
      } catch {
        allIssues.push({ path: relative, message: "JSON không hợp lệ" });
        continue;
      }

      const parsed = examSchema.safeParse(raw);
      if (!parsed.success) {
        allIssues.push({
          path: relative,
          message: parsed.error.issues.map((i) => i.message).join("; "),
        });
        continue;
      }

      const exam = parsed.data as Exam;
      const report = validateExamStructure(exam);
      for (const issue of report.issues) {
        allIssues.push({ path: `${relative} → ${issue.path}`, message: issue.message });
      }
      examsById.set(exam.id, exam);
    }
  }

  const collectionsDir = path.join(DATA_ROOT, "collections");
  const collectionFiles = await fs.readdir(collectionsDir);

  for (const file of collectionFiles) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(collectionsDir, file);
    const relative = path.relative(process.cwd(), filePath);

    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch {
      allIssues.push({ path: relative, message: "JSON không hợp lệ" });
      continue;
    }

    const parsed = collectionSchema.safeParse(raw);
    if (!parsed.success) {
      allIssues.push({
        path: relative,
        message: parsed.error.issues.map((i) => i.message).join("; "),
      });
      continue;
    }

    const collection = parsed.data as ExamCollection;
    const report = validateCollectionStructure(collection, examsById);
    for (const issue of report.issues) {
      allIssues.push({ path: `${relative} → ${issue.path}`, message: issue.message });
    }
  }

  if (allIssues.length === 0) {
    console.log(`✓ Tất cả dữ liệu đề hợp lệ (${examsById.size} đề).`);
    process.exit(0);
  }

  console.error(`✗ Phát hiện ${allIssues.length} lỗi:\n`);
  for (const issue of allIssues) {
    console.error(`  [${issue.path}] ${issue.message}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});