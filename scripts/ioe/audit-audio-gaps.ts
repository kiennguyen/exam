/**
 * So sánh số link audio trong XML vs câu listening trong import (theo đề).
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

function splitExamRegions(
  fullText: string
): Array<{ regionStart: number; regionEnd: number }> {
  const marker = /SỐ:\s*/gi;
  const hits: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(fullText)) !== null) {
    hits.push(m.index);
  }
  return hits.map((start, i) => ({
    regionStart: start,
    regionEnd: i + 1 < hits.length ? hits[i + 1] : fullText.length,
  }));
}

async function main(): Promise<void> {
  const doc =
    process.argv[2] ??
    path.join(process.env.USERPROFILE ?? "", "Downloads", "50 DE IOE K7.docx");
  const pkg = await readDocxPackage(path.resolve(doc));
  try {
    const flat = flattenDocumentXml(pkg.documentXml);
    const rels = parseRelationshipTargets(pkg.relsXml);
    const regions = splitExamRegions(flat.text);

    const gaps: Array<{ exam: number; links: number; listen: number }> = [];
    for (let i = 0; i < regions.length; i++) {
      const { regionStart: start, regionEnd: end } = regions[i];
      let links = 0;
      for (const h of flat.hyperlinkAt) {
        if (h.index < start || h.index >= end) continue;
        const t = rels.get(h.rId);
        if (t && /^https?:/i.test(t) && /_Audio\.mp3/i.test(t)) links += 1;
      }
      const slug = `de-${String(i + 1).padStart(2, "0")}`;
      const impRaw = await fs.readFile(
        path.join(process.cwd(), IMPORT_DIR, `${slug}.import.json`),
        "utf-8"
      );
      const imp = JSON.parse(impRaw) as {
        questions: Array<{ hints?: string[] }>;
      };
      const listen = imp.questions.filter((q) =>
        q.hints?.includes("listening")
      ).length;
      if (links !== listen) gaps.push({ exam: i + 1, links, listen });
    }

    console.log(`Đề lệch link/listen: ${gaps.length}`);
    for (const g of gaps.slice(0, 15)) {
      console.log(`  đề ${String(g.exam).padStart(2)}: ${g.links} link, ${g.listen} listen`);
    }
    const totalMissing = gaps.reduce((s, g) => s + Math.max(0, g.listen - g.links), 0);
    console.log(`Ước tính thiếu map (listen > links): ${totalMissing} câu`);
  } finally {
    await removeDocxTemp(pkg);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});