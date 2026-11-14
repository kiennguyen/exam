import type { GradingResult, UserAnswer } from "@/lib/exam/types";

const PREFIX = "vaijob-exam";
const RECENT_KEY = `${PREFIX}:recent-results`;
const MAX_RECENT = 20;

export interface ExamSessionState {
  sessionId: string;
  collectionSlug: string;
  examSlug: string;
  examId: string;
  examVersion: string;
  startedAt: number;
  deadlineAt: number;
  answers: Record<string, UserAnswer>;
  flagged: string[];
  currentIndex: number;
  submitted: boolean;
  result?: GradingResult;
}

export interface StorageNotice {
  type: "warning" | "error";
  message: string;
}

export function sessionStorageKey(
  collectionSlug: string,
  examSlug: string,
  sessionId: string
): string {
  return `${PREFIX}:session:${collectionSlug}:${examSlug}:${sessionId}`;
}

function canUseStorage(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const key = `${PREFIX}:probe`;
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getStorageAvailability(): { available: boolean; notice?: StorageNotice } {
  if (typeof window === "undefined") {
    return { available: false };
  }
  if (!canUseStorage()) {
    return {
      available: false,
      notice: {
        type: "warning",
        message:
          "Trình duyệt không lưu được tiến độ (chế độ ẩn danh hoặc bộ nhớ đầy). Bạn vẫn làm bài trong phiên này, nhưng tải lại trang có thể mất dữ liệu.",
      },
    };
  }
  return { available: true };
}

export function saveSession(state: ExamSessionState): boolean {
  if (!canUseStorage()) return false;
  try {
    localStorage.setItem(
      sessionStorageKey(state.collectionSlug, state.examSlug, state.sessionId),
      JSON.stringify(state)
    );
    return true;
  } catch {
    return false;
  }
}

export function loadSession(
  collectionSlug: string,
  examSlug: string,
  sessionId: string
): ExamSessionState | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(
      sessionStorageKey(collectionSlug, examSlug, sessionId)
    );
    if (!raw) return null;
    return JSON.parse(raw) as ExamSessionState;
  } catch {
    return null;
  }
}

export function findActiveSession(
  collectionSlug: string,
  examSlug: string
): ExamSessionState | null {
  if (!canUseStorage()) return null;
  const prefix = `${PREFIX}:session:${collectionSlug}:${examSlug}:`;

  let latest: ExamSessionState | null = null;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const state = JSON.parse(localStorage.getItem(key)!) as ExamSessionState;
      if (state.submitted) continue;
      if (Date.now() > state.deadlineAt) continue;
      if (!latest || state.startedAt > latest.startedAt) {
        latest = state;
      }
    } catch {
      /* ignore corrupt entry */
    }
  }

  return latest;
}

export function clearSession(
  collectionSlug: string,
  examSlug: string,
  sessionId: string
): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(sessionStorageKey(collectionSlug, examSlug, sessionId));
}

export function clearAllExamProgress(): void {
  if (!canUseStorage()) return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${PREFIX}:`)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export interface RecentResultEntry {
  collectionSlug: string;
  examSlug: string;
  examTitle: string;
  sessionId: string;
  submittedAt: number;
  pointsEarned: number;
  totalPoints: number;
  percentCorrect: number;
  examVersion: string;
  result: GradingResult;
}

export function appendRecentResult(entry: RecentResultEntry): void {
  if (!canUseStorage()) return;
  try {
    const existing = loadRecentResults();
    const filtered = existing.filter((e) => e.sessionId !== entry.sessionId);
    filtered.unshift(entry);
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

export function loadRecentResults(): RecentResultEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentResultEntry[];
  } catch {
    return [];
  }
}

export function loadRecentResultBySession(
  collectionSlug: string,
  examSlug: string,
  sessionId: string
): RecentResultEntry | null {
  return (
    loadRecentResults().find(
      (r) =>
        r.collectionSlug === collectionSlug &&
        r.examSlug === examSlug &&
        r.sessionId === sessionId
    ) ?? null
  );
}

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}