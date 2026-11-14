/**
 * Generate answer templates (CSV + JSON) for imported exams.
 *
 *   npm run ioe:template -- --exam 1
 *   npm run ioe:template -- --all
 */
import fs from "fs/promises";
import path from "path";
import { ANSWERS_DIR, IMPORT_DIR, type ImportedExamFile } from "./types";

function parseExamNumbers(): number[] {
  const args = process.argv.slice(2);
  if (args.includes("--all")) {
    return Array.from({ length: 50 }, (_, i) => i + 1);
  }
  const nums: number[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--exam" && args[i + 1]) nums.push(Number(args[++i]));
  }
  if (nums.length === 0) {
    console.error("Dùng --exam <n> hoặc --all");
    process.exit(1);
  }
  return nums;
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main(): Promise<void> {
  const examNumbers = parseExamNumbers();
  const outDir = path.join(process.cwd(), ANSWERS_DIR);
  await fs.mkdir(outDir, { recursive: true });

  for (const n of examNumbers) {
    const impPath = path.join(
      process.cwd(),
      IMPORT_DIR,
      `de-${String(n).padStart(2, "0")}.import.json`
    );
    let imp: ImportedExamFile;
    try {
      imp = JSON.parse(await fs.readFile(impPath, "utf-8")) as ImportedExamFile;
    } catch {
      console.warn(`Bỏ qua đề ${n}: chưa có import`);
      continue;
    }

    const answerable = imp.questions.filter(
      (q) =>
        q.kind === "single_choice" ||
        q.kind === "fill_blank" ||
        q.kind === "word_order"
    );
    const slug = `de-${String(n).padStart(2, "0")}`;

    const jsonTemplate = {
      schemaVersion: 1 as const,
      examNumber: n,
      slug,
      answersByOrder: {} as Record<string, string>,
    };
    const jsonPath = path.join(outDir, `${slug}.answers.template.json`);
    if (!(await fileExists(path.join(outDir, `${slug}.answers.json`)))) {
      await fs.writeFile(jsonPath, JSON.stringify(jsonTemplate, null, 2), "utf-8");
    }

    const lines = ["type,order,answer,prompt,a,b,c,d"];
    for (const q of answerable) {
      const opts = q.options ?? [];
      const row = [
        q.kind === "fill_blank"
          ? "blank"
          : q.kind === "word_order"
            ? "order"
            : "mc",
        String(q.order),
        "",
        q.prompt.slice(0, 120),
        opts[0]?.label ?? "",
        opts[1]?.label ?? "",
        opts[2]?.label ?? "",
        opts[3]?.label ?? "",
      ].map(csvEscape);
      lines.push(row.join(","));
    }

    const csvPath = path.join(outDir, `${slug}.answers.template.csv`);
    await fs.writeFile(csvPath, lines.join("\n"), "utf-8");
    const mc = answerable.filter((q) => q.kind === "single_choice").length;
    const blank = answerable.filter((q) => q.kind === "fill_blank").length;
    console.log(
      `✓ Đề ${n}: ${answerable.length} dòng (MC ${mc}, blank ${blank}) → ${path.relative(process.cwd(), csvPath)}`
    );
  }

  console.log(
    "\nĐiền cột answer: MC = a|b|c|d; blank = từ/cụm từ. Rồi npm run ioe:answers-from-csv và ioe:build"
  );
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});