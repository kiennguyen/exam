export interface WordOrderPiece {
  id: string;
  text: string;
}

export function wordOrderPieces(questionId: string, prompt: string): WordOrderPiece[] {
  return prompt
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
  .map((text, i) => ({ id: `${questionId}-w${i}`, text }));
}

export function sentenceFromPieces(
  selectedIds: string[],
  pieces: WordOrderPiece[]
): string {
  const map = new Map(pieces.map((p) => [p.id, p.text]));
  return selectedIds
    .map((id) => map.get(id))
    .filter(Boolean)
    .join(" ");
}

export function sequenceFromAnswer(
  answer: string,
  pieces: WordOrderPiece[]
): string[] | null {
  const trimmed = answer.trim();
  if (!trimmed) return [];

  const remaining = [...pieces];
  const selected: string[] = [];
  let pos = 0;

  while (pos < trimmed.length && remaining.length > 0) {
    let matched = false;
    const candidates = [...remaining].sort((a, b) => b.text.length - a.text.length);
    for (const piece of candidates) {
      const slice = trimmed.slice(pos);
      if (!slice.toLowerCase().startsWith(piece.text.toLowerCase())) continue;
      const after = slice[piece.text.length];
      if (after !== undefined && after !== " ") continue;
      selected.push(piece.id);
      const idx = remaining.findIndex((p) => p.id === piece.id);
      if (idx >= 0) remaining.splice(idx, 1);
      pos += piece.text.length;
      if (pos < trimmed.length && trimmed[pos] === " ") pos += 1;
      matched = true;
      break;
    }
    if (!matched) return null;
  }

  if (pos < trimmed.length) return null;
  return selected;
}