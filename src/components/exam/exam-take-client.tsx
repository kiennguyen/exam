"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GradingResult, PublicExam, PublicQuestion, UserAnswer } from "@/lib/exam/types";
import { formatCountdown } from "@/lib/format";
import {
  appendRecentResult,
  createSessionId,
  findActiveSession,
  getStorageAvailability,
  loadSession,
  saveSession,
  type ExamSessionState,
} from "@/lib/session/storage";
import {
  getDurationPreferenceSeconds,
  setDurationPreferenceSeconds,
} from "@/lib/session/duration-preference";
import { QuestionPanel } from "./question-panel";
import { SectionTabs } from "./section-tabs";
import { Button } from "@/components/ui/button";

interface Props {
  collectionSlug: string;
  examSlug: string;
  initialExam: PublicExam;
  resumeSessionId?: string;
  durationSecondsOverride?: number;
}

function isAnswered(answer: UserAnswer): boolean {
  if (answer === null || answer === undefined) return false;
  if (typeof answer === "string") return answer.trim() !== "";
  return answer.length > 0;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="mt-1 ml-auto h-2 w-32 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-teal-600 transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function QuestionGrid({
  currentIndex,
  session,
  questions,
  onSelect,
}: {
  currentIndex: number;
  session: ExamSessionState;
  questions: PublicQuestion[];
  onSelect: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
      {questions.map((q, i) => {
        const answered = isAnswered(session.answers[q.id] ?? null);
        const flagged = session.flagged.includes(q.id);
        const current = i === currentIndex;
        let cls =
          "flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors";
        if (current) cls += " ring-2 ring-teal-600 ring-offset-1";
        if (answered) cls += " bg-teal-100 text-teal-900";
        else cls += " bg-slate-100 text-slate-600";
        if (flagged) cls += " border border-amber-400";

        return (
          <button
            key={q.id}
            type="button"
            className={cls}
            onClick={() => onSelect(i)}
            aria-current={current ? "true" : undefined}
            aria-label={`Câu ${i + 1}${answered ? ", đã làm" : ""}${flagged ? ", đánh dấu" : ""}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function SubmitConfirmDialog({
  unanswered,
  onCancel,
  onConfirm,
}: {
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 id="submit-title" className="text-lg font-semibold text-slate-900">
          Nộp bài?
        </h3>
        <p className="mt-2 text-slate-600">
          Bạn còn <strong>{unanswered}</strong> câu chưa trả lời. Bạn vẫn muốn nộp
          bài?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Tiếp tục làm
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Nộp bài
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExamTakeClient({
  collectionSlug,
  examSlug,
  initialExam,
  resumeSessionId,
  durationSecondsOverride,
}: Props) {
  const router = useRouter();
  const questions = useMemo(
    () => [...initialExam.questions].sort((a, b) => a.order - b.order),
    [initialExam.questions]
  );

  const questionIndexById = useMemo(
    () => new Map(questions.map((q, i) => [q.id, i])),
    [questions]
  );

  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [session, setSession] = useState<ExamSessionState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUpNotice, setTimeUpNotice] = useState(false);
  const autoSubmitRef = useRef(false);

  const initSession = useCallback(() => {
    const { available, notice } = getStorageAvailability();
    if (notice) setStorageNotice(notice.message);

    const resumed = resumeSessionId
      ? loadSession(collectionSlug, examSlug, resumeSessionId)
      : findActiveSession(collectionSlug, examSlug);

    if (
      resumed &&
      !resumed.submitted &&
      resumed.examVersion === initialExam.version
    ) {
      setSession(resumed);
      setCurrentIndex(resumed.currentIndex);
      if (resumed.deadlineAt <= Date.now()) {
        setTimeUpNotice(true);
      }
      return;
    }

    const sessionId = createSessionId();
    const startedAt = Date.now();
    const durationSeconds =
      durationSecondsOverride ??
      getDurationPreferenceSeconds(
        collectionSlug,
        examSlug,
        initialExam.durationSeconds
      );
    if (durationSecondsOverride) {
      setDurationPreferenceSeconds(collectionSlug, examSlug, durationSeconds);
    }
    const fresh: ExamSessionState = {
      sessionId,
      collectionSlug,
      examSlug,
      examId: initialExam.id,
      examVersion: initialExam.version,
      startedAt,
      deadlineAt: startedAt + durationSeconds * 1000,
      answers: {},
      flagged: [],
      currentIndex: 0,
      submitted: false,
    };
    setSession(fresh);
    if (available) saveSession(fresh);
  }, [collectionSlug, examSlug, initialExam, resumeSessionId, durationSecondsOverride]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const persist = useCallback((next: ExamSessionState) => {
    setSession(next);
    saveSession(next);
  }, []);

  const msLeft = session ? session.deadlineAt - now : 0;
  const answeredCount = session
    ? questions.filter((q) => isAnswered(session.answers[q.id] ?? null)).length
    : 0;

  const doSubmit = useCallback(
    async (autoSubmitted: boolean) => {
      if (!session || submitting) return;
      setSubmitting(true);
      const submittedAt = Date.now();

      try {
        const res = await fetch("/api/exams/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionSlug,
            examSlug,
            sessionId: session.sessionId,
            examVersion: session.examVersion,
            startedAt: session.startedAt,
            submittedAt,
            answers: session.answers,
            flagged: session.flagged,
            autoSubmitted,
          }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          alert(err.error ?? "Không thể nộp bài. Thử lại sau.");
          setSubmitting(false);
          return;
        }

        const data = (await res.json()) as { result: GradingResult };
        const done: ExamSessionState = {
          ...session,
          submitted: true,
          result: data.result,
        };
        persist(done);

        appendRecentResult({
          collectionSlug,
          examSlug,
          examTitle: initialExam.title,
          sessionId: session.sessionId,
          submittedAt,
          pointsEarned: data.result.pointsEarned,
          totalPoints: data.result.totalPoints,
          percentCorrect: data.result.percentCorrect,
          examVersion: data.result.examVersion,
          result: data.result,
        });

        router.push(
          `/exams/${collectionSlug}/${examSlug}/ket-qua?session=${session.sessionId}`
        );
      } catch {
        alert("Lỗi kết nối khi nộp bài.");
        setSubmitting(false);
      }
    },
    [
      session,
      submitting,
      collectionSlug,
      examSlug,
      initialExam.title,
      persist,
      router,
    ]
  );

  useEffect(() => {
    if (!session || session.submitted) return;
    if (msLeft <= 0 && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      setTimeUpNotice(true);
      void doSubmit(true);
    }
  }, [msLeft, session, doSubmit]);

  useEffect(() => {
    if (!session || session.submitted) return;

    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(0, currentIndex - 1);
        setCurrentIndex(next);
        persist({ ...session, currentIndex: next });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(questions.length - 1, currentIndex + 1);
        setCurrentIndex(next);
        persist({ ...session, currentIndex: next });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, questions.length, currentIndex, persist]);

  if (!session) {
    return (
      <div className="py-16 text-center text-slate-600" role="status">
        Đang chuẩn bị đề thi…
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const updateAnswer = (answer: UserAnswer) => {
    const next: ExamSessionState = {
      ...session,
      answers: { ...session.answers, [currentQ.id]: answer },
    };
    persist(next);
  };

  const toggleFlag = () => {
    const set = new Set(session.flagged);
    if (set.has(currentQ.id)) set.delete(currentQ.id);
    else set.add(currentQ.id);
    persist({ ...session, flagged: [...set] });
  };

  const goIndex = (index: number) => {
    setCurrentIndex(index);
    persist({ ...session, currentIndex: index });
  };

  const unanswered = questions.length - answeredCount;

  const requestSubmit = () => {
    if (unanswered > 0) setShowSubmitConfirm(true);
    else void doSubmit(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {storageNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {storageNotice}
        </div>
      )}
      {timeUpNotice && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Hết giờ — bài của bạn đang được nộp tự động.
        </div>
      )}

      <div className="sticky top-[57px] z-30 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Thời gian còn lại
            </p>
            <p
              className={`font-mono text-2xl font-bold tabular-nums ${
                msLeft < 60_000 ? "text-rose-600" : "text-slate-900"
              }`}
              aria-live="polite"
            >
              {formatCountdown(msLeft)}
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>
              Đã làm:{" "}
              <strong className="text-slate-900">
                {answeredCount}/{questions.length}
              </strong>
            </p>
            <ProgressBar value={answeredCount} max={questions.length} />
          </div>
          <Button
            variant="primary"
            onClick={requestSubmit}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <SectionTabs
          sections={initialExam.sections}
          questionIndexById={questionIndexById}
          currentIndex={currentIndex}
          onJump={goIndex}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <nav
          className="order-2 lg:order-1 lg:w-56 lg:shrink-0"
          aria-label="Danh sách câu"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Câu hỏi
            </p>
            <div className="max-h-64 overflow-y-auto overscroll-contain pr-1 sm:max-h-80">
              <QuestionGrid
                currentIndex={currentIndex}
                session={session}
                questions={questions}
                onSelect={goIndex}
              />
            </div>
          </div>
        </nav>

        <div className="order-1 min-w-0 flex-1 lg:order-2">
          <QuestionPanel
            question={currentQ}
            index={currentIndex}
            total={questions.length}
            value={session.answers[currentQ.id] ?? null}
            flagged={session.flagged.includes(currentQ.id)}
            onChange={updateAnswer}
            onToggleFlag={toggleFlag}
          />

          <div className="mt-4 flex justify-between gap-2">
            <Button
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() => goIndex(currentIndex - 1)}
            >
              Câu trước
            </Button>
            <Button
              variant="secondary"
              disabled={currentIndex >= questions.length - 1}
              onClick={() => goIndex(currentIndex + 1)}
            >
              Câu sau
            </Button>
          </div>
        </div>
      </div>

      {showSubmitConfirm && (
        <SubmitConfirmDialog
          unanswered={unanswered}
          onCancel={() => setShowSubmitConfirm(false)}
          onConfirm={() => {
            setShowSubmitConfirm(false);
            void doSubmit(false);
          }}
        />
      )}
    </div>
  );
}