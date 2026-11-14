import fs from "fs/promises";
import path from "path";

const REPORT = path.join(process.cwd(), "data", "imported", "ioe-grade-7", "_import-report.json");

async function main(): Promise<void> {
  try {
    const raw = await fs.readFile(REPORT, "utf-8");
    const data = JSON.parse(raw) as {
      examCount: number;
      summary: Array<{
        examNumber: number;
        questions: number;
        singleChoice: number;
        unsupported: number;
      }>;
    };

    console.log(`Nguồn import: ${data.examCount} đề\n`);
    console.log(" #  | Câu | MC | Blank | Khác");
    console.log("----+-----+----+-------+------");
    for (const row of data.summary) {
      const n = String(row.examNumber).padStart(2, " ");
      const fill = "fillBlank" in row ? (row as { fillBlank: number }).fillBlank : 0;
      console.log(
        ` ${n} | ${String(row.questions).padStart(3)} | ${String(row.singleChoice).padStart(2)} | ${String(fill).padStart(5)} | ${String(row.unsupported).padStart(4)}`
      );
    }
  } catch {
    console.error("Chưa có báo cáo. Chạy: npm run import:ioe");
    process.exit(1);
  }
}

main();