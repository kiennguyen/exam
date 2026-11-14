import type { ImportedQuestion } from "./types";

export function normalizeText(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeChoiceText(s: string): string {
  return normalizeText(s)
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\b(sa|sáng)\b/g, "am")
    .replace(/\b(ch|chiều|tối)\b/g, "pm")
    .replace(/a\.m\./g, "am")
    .replace(/p\.m\./g, "pm");
}

function matchOptionByTimeLabel(raw: string, options: ImportedQuestion["options"]): string | null {
  if (!options) return null;
  const norm = normalizeChoiceText(raw);
  const timeMatch = norm.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!timeMatch) return null;
  const hour = timeMatch[1];
  const meridian = timeMatch[3] ?? (norm.includes("am") ? "am" : norm.includes("pm") ? "pm" : null);
  for (const opt of options) {
    const on = normalizeChoiceText(opt.label);
    if (!on.includes(hour)) continue;
    if (!meridian || on.includes(meridian)) return opt.id;
  }
  return null;
}

export function splitAnswerExams(fullText: string): string[] {
  const parts = fullText.split(/ĐỀ SỐ:\s*/i);
  return parts.slice(1).map((chunk) => chunk.trim());
}

export function parseRawAnswers(section: string): Map<number, string> {
  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let i = 0;
  if (lines[0] && /^\d{1,2}$/.test(lines[0])) i = 1;

  const map = new Map<number, string>();
  while (i < lines.length) {
    if (/^\d{1,3}$/.test(lines[i])) {
      const order = Number(lines[i]);
      i += 1;
      const parts: string[] = [];
      while (i < lines.length && !/^\d{1,3}$/.test(lines[i])) {
        parts.push(lines[i]);
        i += 1;
      }
      map.set(order, parts.join(" ").trim());
    } else {
      i += 1;
    }
  }
  return map;
}

export function mapAnswerToStorage(raw: string, question: ImportedQuestion): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const pick =
    trimmed.match(/Chọn đáp án:\s*([A-D])/i) ??
    trimmed.match(/^([A-D])$/i) ??
    trimmed.match(/^Chọn\s+([A-D])$/i) ??
    trimmed.match(/Chọn\s+đáp\s+án\s+([A-D])/i) ??
    trimmed.match(/đáp\s+án\s*:\s*([A-D])/i);

  if (pick && question.kind === "single_choice") {
    return pick[1].toLowerCase();
  }

  if (question.kind === "single_choice" && question.options) {
    const norm = normalizeChoiceText(trimmed);
    const byTime = matchOptionByTimeLabel(trimmed, question.options);
    if (byTime) return byTime;

    for (const opt of question.options) {
      const labelNorm = normalizeChoiceText(opt.label);
      if (labelNorm === norm) return opt.id;
    }
    for (const opt of question.options) {
      const labelNorm = normalizeChoiceText(opt.label);
      if (norm.length > 8 && (norm.includes(labelNorm) || labelNorm.includes(norm))) {
        return opt.id;
      }
    }
    const letterInText = trimmed.match(/\b([A-D])\b/i);
    if (letterInText && question.options.some((o) => o.id === letterInText[1].toLowerCase())) {
      return letterInText[1].toLowerCase();
    }
    if (pick) return pick[1].toLowerCase();
    return null;
  }

  if (question.kind === "fill_blank" || question.kind === "word_order") {
    let text = trimmed;
    text = text.replace(/^Chọn đáp án:\s*/i, "");
    text = text.replace(/^đáp\s+án\s*:\s*/i, "");
    text = text.replace(/^([A-D])\s*[-–—:]\s*/i, "");
    return text.trim() || null;
  }

  return null;
}