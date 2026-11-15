/**
 * Map ảnh nhúng Word → (đề, sequence câu) từ file IOE.
 *
 *   npm run ioe:parse-images
 */
import fs from "fs/promises";
import path from "path";
import {
  flattenDocumentXml,
  parseRelationshipTargets,
  readDocxPackage,
  removeDocxTemp,
} from "./docx-io";
import { IMPORT_DIR, type ImportedExamFile } from "./types";

const DEFAULT_DE_DOC = path.join(
  process.env.USERPROFILE ?? "",
  "Downloads",
  "50 DE IOE K7.docx"
);

const OUT_DIR = path.join(process.cwd(), "data", "imported", "ioe-grade-7", "media");
const OUT_FILE = path.join(OUT_DIR, "image-map.json");

export interface ImageMapEntry {
  embedTarget: string;
  fileName: string;
  publicPath: string;
}

export interface ImageMapFile {
  schemaVersion: 1;
  sourceFile: string;
  parsedAt: string;
  byExam: Record<string, Record<string, ImageMapEntry>>;
  stats: { exams: number; questionsWithImage: number; uniqueFiles: number };
}

function splitExamsWithOffsets(
  fullText: string
): Array<{ examNumber: number; start: number; body: string }> {
  const marker = /SỐ:\s*/gi;
  const hits: Array<{ index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(fullText)) !== null) {
    hits.push({ index: m.index, length: m[0].length });
  }

  const out: Array<{ examNumber: number; start: number; body: string }> = [];
  for (let i = 0; i < hits.length; i++) {
    const contentStart = hits[i].index + hits[i].length;
    const contentEnd = i + 1 < hits.length ? hits[i + 1].index : fullText.length;
    let slice = fullText.slice(contentStart, contentEnd).trim();
    slice = slice.replace(/^\d+\s*/, "").trim();
    if (!slice) continue;
    out.push({ examNumber: out.length + 1, start: contentStart, body: slice });
  }
  return out;
}

function imageQuestionsInOrder(imp: ImportedExamFile) {
  return imp.questions
    .filter((q) => q.hints?.includes("image") && q.sequence != null)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

async function loadImportExam(slug: string): Promise<ImportedExamFile | null> {
  const file = path.join(process.cwd(), IMPORT_DIR, `${slug}.import.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as ImportedExamFile;
  } catch {
    return null;
  }
}

function embeddedImagesInExam(
  anchor: number,
  bodyLen: number,
  imageAt: Array<{ index: number; rId: string }>,
  rels: Map<string, string>
) {
  const end = anchor + bodyLen;
  const items: Array<{ index: number; rId: string; target: string }> = [];
  for (const img of imageAt) {
    if (img.index < anchor || img.index >= end) continue;
    const t = resolveEmbeddedImage(rels, img.rId);
    if (t) items.push({ index: img.index, rId: img.rId, target: t });
  }
  items.sort((a, b) => a.index - b.index);
  return items;
}

function resolveEmbeddedImage(
  rels: Map<string, string>,
  rId: string
): string | null {
  const target = rels.get(rId);
  if (!target || /^https?:/i.test(target)) return null;
  if (!/^media\/image/i.test(target)) return null;
  return target;
}

function findImageInRange(
  absQStart: number,
  absQEnd: number,
  imageAt: Array<{ index: number; rId: string }>,
  rels: Map<string, string>
): string | null {
  for (const img of imageAt) {
    if (img.index < absQStart || img.index >= absQEnd) continue;
    const t = resolveEmbeddedImage(rels, img.rId);
    if (t) return t;
  }
  return null;
}

function fileNameFromTarget(target: string): string {
  return target.replace(/^media\//i, "").replace(/[^\w.\-]/g, "_");
}

async function main(): Promise<void> {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DE_DOC;
  const pkg = await readDocxPackage(input);
  try {
    const rels = parseRelationshipTargets(pkg.relsXml);
    const flat = flattenDocumentXml(pkg.documentXml);
    const exams = splitExamsWithOffsets(flat.text);

    const byExam: ImageMapFile["byExam"] = {};
    const unique = new Set<string>();
    let questionsWithImage = 0;

    for (const exam of exams) {
      const slug = `de-${String(exam.examNumber).padStart(2, "0")}`;
      const body = exam.body;
      const bodyStartInFlat = flat.text.indexOf(body, exam.start);
      const anchor = bodyStartInFlat >= 0 ? bodyStartInFlat : exam.start;
      byExam[slug] = {};
      const imp = await loadImportExam(slug);
      if (!imp) continue;

      const imgs = embeddedImagesInExam(anchor, body.length, flat.imageAt, rels);
      const imageQs = imageQuestionsInOrder(imp);
      const n = Math.min(imgs.length, imageQs.length);
      for (let i = 0; i < n; i++) {
        const embedTarget = imgs[i].target;
        const fileName = fileNameFromTarget(embedTarget);
        const sequence = imageQs[i].sequence!;
        unique.add(fileName);
        questionsWithImage += 1;
        byExam[slug][String(sequence)] = {
          embedTarget,
          fileName,
          publicPath: `/ioe-media/images/${fileName}`,
        };
      }
    }

    const payload: ImageMapFile = {
      schemaVersion: 1,
      sourceFile: path.basename(input),
      parsedAt: new Date().toISOString(),
      byExam,
      stats: {
        exams: exams.length,
        questionsWithImage,
        uniqueFiles: unique.size,
      },
    };

    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2), "utf-8");
    console.log(
      `✓ Image map: ${questionsWithImage} câu, ${unique.size} file ảnh\n` +
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