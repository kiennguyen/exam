/**
 * Trích URL audio theo (đề, số câu in trên đề) từ file Word IOE.
 * Output: data/imported/ioe-grade-7/media/audio-map.json (gitignore)
 *
 *   npm run ioe:parse-audio
 *   npm run ioe:parse-audio -- "C:\\path\\50 DE IOE K7.docx"
 */
import fs from "fs/promises";
import path from "path";
import {
  flattenDocumentXml,
  parseRelationshipTargets,
  readDocxPackage,
  removeDocxTemp,
} from "./docx-io";
import { IMPORT_DIR } from "./types";
import { listeningQuestionsInOrder, zipAudioToListening } from "./audio-map-ordered";

const DEFAULT_DE_DOC = path.join(
  process.env.USERPROFILE ?? "",
  "Downloads",
  "50 DE IOE K7.docx"
);

const OUT_DIR = path.join(process.cwd(), "data", "imported", "ioe-grade-7", "media");
const OUT_FILE = path.join(OUT_DIR, "audio-map.json");

export interface AudioMapFile {
  schemaVersion: 1;
  sourceFile: string;
  parsedAt: string;
  /**
   * de-01 → map theo vị trí câu trong đề Word (1…n, không trùng).
   * Không dùng số in trên đề vì lặp lại theo từng phần.
   */
  byExam: Record<string, Record<string, AudioMapEntry>>;
  stats: {
    exams: number;
    questionsWithAudio: number;
    uniqueFiles: number;
  };
}

export interface AudioMapEntry {
  remoteUrl: string;
  fileName: string;
  /** Gán sau khi download — /ioe-media/audio/... */
  publicPath: string;
}

function splitExamsWithOffsets(
  fullText: string
): Array<{ examNumber: number; start: number; regionStart: number; regionEnd: number; body: string }> {
  const marker = /SỐ:\s*/gi;
  const hits: Array<{ index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(fullText)) !== null) {
    hits.push({ index: m.index, length: m[0].length });
  }

  const out: Array<{
    examNumber: number;
    start: number;
    regionStart: number;
    regionEnd: number;
    body: string;
  }> = [];
  for (let i = 0; i < hits.length; i++) {
    const contentStart = hits[i].index + hits[i].length;
    const contentEnd = i + 1 < hits.length ? hits[i + 1].index : fullText.length;
    let slice = fullText.slice(contentStart, contentEnd).trim();
    slice = slice.replace(/^\d+\s*/, "").trim();
    if (!slice) continue;
    out.push({
      examNumber: out.length + 1,
      start: contentStart,
      regionStart: hits[i].index,
      regionEnd: i + 1 < hits.length ? hits[i + 1].index : fullText.length,
      body: slice,
    });
  }
  return out;
}

function audioFileNameFromUrl(url: string): string {
  const base = url.split("/").pop() ?? "audio.mp3";
  return base.replace(/[^\w.\-]/g, "_");
}

function resolveAudioUrl(
  rels: Map<string, string>,
  rId: string
): string | null {
  const target = rels.get(rId);
  if (!target || !/^https?:/i.test(target)) return null;
  if (!/_Audio\.mp3/i.test(target)) return null;
  return target;
}

async function loadImportExam(slug: string) {
  const file = path.join(process.cwd(), IMPORT_DIR, `${slug}.import.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}

function audioLinksInExam(
  anchor: number,
  bodyLen: number,
  hyperlinkAt: Array<{ index: number; rId: string }>,
  rels: Map<string, string>
) {
  const end = anchor + bodyLen;
  const items: Array<{ index: number; rId: string; url: string }> = [];
  for (const h of hyperlinkAt) {
    if (h.index < anchor || h.index >= end) continue;
    const url = resolveAudioUrl(rels, h.rId);
    if (url) items.push({ index: h.index, rId: h.rId, url });
  }
  items.sort((a, b) => a.index - b.index);
  return items;
}

async function main(): Promise<void> {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DE_DOC;
  const pkg = await readDocxPackage(input);
  try {
    const rels = parseRelationshipTargets(pkg.relsXml);
    const flat = flattenDocumentXml(pkg.documentXml);
    const exams = splitExamsWithOffsets(flat.text);

    if (exams.length === 0) {
      console.error("Không tách được đề từ file.");
      process.exit(1);
    }

    const byExam: AudioMapFile["byExam"] = {};
    const uniqueUrls = new Set<string>();
    let questionsWithAudio = 0;

    for (const exam of exams) {
      const slug = `de-${String(exam.examNumber).padStart(2, "0")}`;
      byExam[slug] = {};

      const imp = await loadImportExam(slug);
      if (!imp) {
        console.warn(`  ⚠ Thiếu import ${slug} — bỏ qua (chạy npm run import:ioe)`);
        continue;
      }

      const links = audioLinksInExam(
        exam.regionStart,
        exam.regionEnd - exam.regionStart,
        flat.hyperlinkAt,
        rels
      );
      const listening = listeningQuestionsInOrder(imp);
      const zipped = zipAudioToListening(links, listening);

      for (const [sequence, url] of zipped) {
        const fileName = audioFileNameFromUrl(url);
        uniqueUrls.add(url);
        questionsWithAudio += 1;
        byExam[slug][String(sequence)] = {
          remoteUrl: url,
          fileName,
          publicPath: `/ioe-media/audio/${fileName}`,
        };
      }
    }

    const payload: AudioMapFile = {
      schemaVersion: 1,
      sourceFile: path.basename(input),
      parsedAt: new Date().toISOString(),
      byExam,
      stats: {
        exams: exams.length,
        questionsWithAudio,
        uniqueFiles: uniqueUrls.size,
      },
    };

    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2), "utf-8");

    console.log(
      `✓ Audio map: ${questionsWithAudio} câu, ${uniqueUrls.size} file mp3 khác nhau\n` +
        `  → ${path.relative(process.cwd(), OUT_FILE)}`
    );
  } finally {
    await removeDocxTemp(pkg);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});