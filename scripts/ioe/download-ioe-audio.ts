/**
 * Tải mp3 từ audio-map (res.ioe.vn) → public/ioe-media/audio/
 *
 *   npm run ioe:download-audio
 */
import fs from "fs/promises";
import path from "path";
import type { AudioMapFile } from "./parse-docx-audio";

const MAP_FILE = path.join(
  process.cwd(),
  "data",
  "imported",
  "ioe-grade-7",
  "media",
  "audio-map.json"
);
const OUT_DIR = path.join(process.cwd(), "public", "ioe-media", "audio");

const CONCURRENCY = 6;

async function downloadOne(url: string, dest: string): Promise<void> {
  try {
    await fs.access(dest);
    return;
  } catch {
    /* new file */
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>
): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await fs.readFile(MAP_FILE, "utf-8");
  } catch {
    console.error(`Chưa có audio-map. Chạy: npm run ioe:parse-audio`);
    process.exit(1);
  }

  const map = JSON.parse(raw) as AudioMapFile;
  const byUrl = new Map<string, string>();

  for (const exam of Object.values(map.byExam)) {
    for (const entry of Object.values(exam)) {
      byUrl.set(entry.remoteUrl, entry.fileName);
    }
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const urls = [...byUrl.entries()];
  let ok = 0;
  let failed = 0;

  await runPool(urls, async ([url, fileName]) => {
    const dest = path.join(OUT_DIR, fileName);
    try {
      await downloadOne(url, dest);
      ok += 1;
      if (ok % 50 === 0) {
        console.log(`  … đã xử lý ${ok}/${urls.length}`);
      }
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${fileName}: ${err instanceof Error ? err.message : err}`);
    }
  });

  const manifest = {
    downloadedAt: new Date().toISOString(),
    total: urls.length,
    succeeded: ok,
    failed,
    directory: path.relative(process.cwd(), OUT_DIR),
  };
  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  console.log(
    `✓ Tải audio: ${ok} thành công (mới hoặc đã có), ${failed} lỗi / ${urls.length} file\n` +
      `  → ${path.relative(process.cwd(), OUT_DIR)}`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});