/**
 * Trích ảnh từ file đề Word (không map tự động vào câu hỏi).
 * Output: public/ioe-media/extracted/ (nên gitignore hoặc upload CDN thủ công).
 *
 *   npm run ioe:extract-media
 */
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const DEFAULT_DE_DOC = path.join(
  process.env.USERPROFILE ?? "",
  "Downloads",
  "50 DE IOE K7.docx"
);

const OUT_DIR = path.join(process.cwd(), "public", "ioe-media", "extracted");

async function main(): Promise<void> {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DE_DOC;
  await fs.access(input);

  const tmpZip = path.join(process.cwd(), "data", "imported", "_tmp-de.docx.zip");
  const tmpDir = path.join(process.cwd(), "data", "imported", "_tmp-de-unzip");

  await fs.mkdir(path.dirname(tmpZip), { recursive: true });
  await fs.copyFile(input, tmpZip);

  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });

  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit" }
  );

  const mediaDir = path.join(tmpDir, "word", "media");
  await fs.mkdir(OUT_DIR, { recursive: true });

  let count = 0;
  try {
    const files = await fs.readdir(mediaDir);
    for (const file of files) {
      await fs.copyFile(path.join(mediaDir, file), path.join(OUT_DIR, file));
      count += 1;
    }
  } catch {
    console.warn("Không có thư mục word/media trong docx");
  }

  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.rm(tmpZip, { force: true });

  const manifest = {
    extractedAt: new Date().toISOString(),
    sourceFile: path.basename(input),
    fileCount: count,
    directory: path.relative(process.cwd(), OUT_DIR),
    note: "Gán URL ảnh vào question.media thủ công hoặc qua pipeline riêng.",
  };
  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  console.log(`✓ Đã trích ${count} file media → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});