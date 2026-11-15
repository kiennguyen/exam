const PREFIX = "vaijob-exam:duration";

export const PRACTICE_DURATION_MINUTES = [30, 40, 50, 60] as const;

export function defaultDurationSeconds(examDurationSeconds: number): number {
  const mins = Math.round(examDurationSeconds / 60);
  if ((PRACTICE_DURATION_MINUTES as readonly number[]).includes(mins)) {
    return mins * 60;
  }
  return 30 * 60;
}

export function durationPreferenceKey(
  collectionSlug: string,
  examSlug: string
): string {
  return `${PREFIX}:${collectionSlug}:${examSlug}`;
}

export function getDurationPreferenceSeconds(
  collectionSlug: string,
  examSlug: string,
  fallbackSeconds: number
): number {
  if (typeof window === "undefined") return fallbackSeconds;
  try {
    const raw = localStorage.getItem(durationPreferenceKey(collectionSlug, examSlug));
    if (!raw) return fallbackSeconds;
    const n = Number(raw);
    if (
      Number.isFinite(n) &&
      (PRACTICE_DURATION_MINUTES as readonly number[]).includes(n / 60)
    ) {
      return n;
    }
  } catch {
    /* ignore */
  }
  return fallbackSeconds;
}

export function setDurationPreferenceSeconds(
  collectionSlug: string,
  examSlug: string,
  seconds: number
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(durationPreferenceKey(collectionSlug, examSlug), String(seconds));
  } catch {
    /* ignore */
  }
}

export function parseDurationParam(
  value: string | undefined,
  _fallbackSeconds: number
): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    !(PRACTICE_DURATION_MINUTES as readonly number[]).includes(n / 60)
  ) {
    return undefined;
  }
  return n;
}