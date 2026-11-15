/**
 * Sao chép ảnh nhúng từ Word → public/ioe-media/images/
 *
 *   npm run ioe:copy-images
 */
import fs from "fs/promises";
import path from "path";
import { readDocxPackage, removeDocxTemp } from "./docx-io";
import type { ImageMapFile } from "./parse-docx-images";

const DEFAULT_DE_DOC = path.join(
  process.env.USERPROFILE ?? "",
  "Downloads",
  "50 DE IOE K7.docx"
);

const MAP_FILE = path.join(
  process.cwd(),
  "data",
  "imported",
  "ioe-grade-7",
  "media",
  "image-map.json"
);
const OUT_DIR = path.join(process.cwd(), "public", "ioe-media", "images");

async function main(): Promise<void> {
  let map: ImageMapFile;
  try {
    map = JSON.parse(await fs.readFile(MAP_FILE, "utf-8")) as ImageMapFile;
  } catch {
    console.error("Chưa có image-map. Chạy: npm run ioe:parse-images");
    process.exit(1);
  }

  const needed = new Set<string>();
  for (const exam of Object.values(map.byExam)) {
    for (const entry of Object.values(exam)) {
      needed.add(entry.fileName);
    }
  }

  const input = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DE_DOC;
  const pkg = await readDocxPackage(input);
  try {
    const mediaDir = path.join(pkg.wordDir, "media");
    await fs.mkdir(OUT_DIR, { recursive: true });
    let copied = 0;
    for (const fileName of needed) {
      const src = path.join(mediaDir, fileName);
      const dest = path.join(OUT_DIR, fileName);
      try {
        await fs.access(dest);
        copied += 1;
        continue;
      } catch {
        /* copy */
      }
      try {
        await fs.copyFile(src, dest);
        copied += 1;
      } catch {
        console.warn(`  ✗ Thiếu trong docx: ${fileName}`);
      }
    }
    console.log(`✓ Ảnh: ${copied}/${needed.size} → ${path.relative(process.cwd(), OUT_DIR)}`);
  } finally {
    await removeDocxTemp(pkg);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});