/** Helper logic: zip audio hyperlinks with import listening questions by document order. */
import type { ImportedExamFile } from "./types";

export interface OrderedAudioCandidate {
  index: number;
  rId: string;
  url: string;
}

export function listeningQuestionsInOrder(imp: ImportedExamFile) {
  return imp.questions
    .filter((q) => q.hints?.includes("listening") && q.sequence != null)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

export function zipAudioToListening(
  hyperlinks: OrderedAudioCandidate[],
  listening: ReturnType<typeof listeningQuestionsInOrder>
): Map<number, string> {
  const out = new Map<number, string>();
  const n = Math.min(hyperlinks.length, listening.length);
  for (let i = 0; i < n; i++) {
    out.set(listening[i].sequence!, hyperlinks[i].url);
  }
  return out;
}