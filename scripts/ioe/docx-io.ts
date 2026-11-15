/**
 * Đọc nội dung DOCX (Office Open XML) từ đường dẫn .docx.
 */
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import os from "os";

export interface UnzippedDocx {
  tempRoot: string;
  wordDir: string;
  documentXml: string;
  relsXml: string;
}

export async function readDocxPackage(docxPath: string): Promise<UnzippedDocx> {
  await fs.access(docxPath);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ioe-docx-"));
  const zipCopy = path.join(tempRoot, "package.zip");
  const unzipped = path.join(tempRoot, "unzipped");

  await fs.copyFile(docxPath, zipCopy);
  await fs.mkdir(unzipped, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipCopy.replace(/'/g, "''")}' -DestinationPath '${unzipped.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" }
  );

  const wordDir = path.join(unzipped, "word");
  const documentXml = await fs.readFile(path.join(wordDir, "document.xml"), "utf-8");
  const relsXml = await fs.readFile(
    path.join(wordDir, "_rels", "document.xml.rels"),
    "utf-8"
  );

  return { tempRoot, wordDir, documentXml, relsXml };
}

export async function removeDocxTemp(pkg: UnzippedDocx): Promise<void> {
  await fs.rm(pkg.tempRoot, { recursive: true, force: true });
}

/** rId → Target (URL ngoài hoặc media/imageN.jpeg) */
export function parseRelationshipTargets(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

export interface FlattenResult {
  text: string;
  /** Vị trí ký tự (đầu đoạn text ngay trước hyperlink) → relationship id */
  hyperlinkAt: Array<{ index: number; rId: string }>;
  /** Ảnh nhúng (blip embed) tại vị trí ký tự */
  imageAt: Array<{ index: number; rId: string }>;
}

/**
 * Dựng chuỗi text thuần từ document.xml và vị trí các hyperlink (theo index ký tự).
 */
export function flattenDocumentXml(documentXml: string): FlattenResult {
  const hyperlinkAt: Array<{ index: number; rId: string }> = [];
  const imageAt: Array<{ index: number; rId: string }> = [];
  let text = "";

  const tagRe =
    /<w:hyperlink[^>]*\br:id="(rId\d+)"[^>]*>|<a:blip[^>]*\br:embed="(rId\d+)"[^>]*\/>|<\/w:hyperlink>|<w:tab\/>|<w:br[^>]*\/>|<w:t[^>]*>([^<]*)<\/w:t>/gi;

  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(documentXml)) !== null) {
    const full = match[0];
    if (full.startsWith("<w:hyperlink")) {
      hyperlinkAt.push({ index: text.length, rId: match[1] });
    } else if (full.startsWith("<a:blip")) {
      imageAt.push({ index: text.length, rId: match[2] });
    } else if (full === "</w:hyperlink>") {
      /* no-op */
    } else if (full.startsWith("<w:tab") || full.startsWith("<w:br")) {
      text += " ";
    } else if (match[3] !== undefined) {
      text += match[3].replace(/\u00a0/g, " ");
    }
  }

  return { text, hyperlinkAt, imageAt };
}