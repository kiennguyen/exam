/**
 * Convert filled CSV template → de-XX.answers.json
 *
 *   npm run ioe:answers-from-csv -- --exam 1
 */
import fs from "fs/promises";
import path from "path";
import { ANSWERS_DIR } from "./types";

function parseExamNumber(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--exam" && args[i + 1]) return Number(args[++i]);
  }
  console.error("Dùng: npm run ioe:answers-from-csv -- --exam 1");
  process.exit(1);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function main(): Promise<void> {
  const n = parseExamNumber();
  const slug = `de-${String(n).padStart(2, "0")}`;
  const csvPath = path.join(process.cwd(), ANSWERS_DIR, `${slug}.answers.template.csv`);

  const raw = await fs.readFile(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0]?.toLowerCase() ?? "";
  if (!header.startsWith("order")) {
    console.error("CSV không đúng định dạng");
    process.exit(1);
  }

  const hasTypeColumn = header.includes("type");
  const answersByOrder: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const order = hasTypeColumn ? cols[1]?.trim() : cols[0]?.trim();
    const type = hasTypeColumn ? cols[0]?.trim().toLowerCase() : "mc";
    const answerRaw = hasTypeColumn ? cols[2]?.trim() : cols[1]?.trim();
    if (!order || !answerRaw) continue;

    if (type === "order" || type === "word_order" || type === "blank" || type === "fill_blank") {
      answersByOrder[order] = answerRaw;
    } else if (type === "mc" || type === "single_choice") {
      const answer = answerRaw.toLowerCase();
      if (!["a", "b", "c", "d"].includes(answer)) {
        console.warn(`Bỏ qua MC ${order}: answer không hợp lệ (${answer})`);
        continue;
      }
      answersByOrder[order] = answer;
    }
  }

  const payload = {
    schemaVersion: 1 as const,
    examNumber: n,
    slug,
    answersByOrder,
  };

  const outPath = path.join(process.cwd(), ANSWERS_DIR, `${slug}.answers.json`);
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`✓ ${Object.keys(answersByOrder).length} đáp án → ${path.relative(process.cwd(), outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});