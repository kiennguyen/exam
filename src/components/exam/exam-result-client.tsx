"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { loadRecentResultBySession, loadSession } from "@/lib/session/storage";
import type { GradingResult } from "@/lib/exam/types";

export function ExamResultClient({
  collectionSlug,
  examSlug,
  sessionId,
}: {
  collectionSlug: string;
  examSlug: string;
  sessionId?: string;
}) {
  const [result, setResult] = useState<GradingResult | null>(null);
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    if (!sessionId) return;

    const fromRecent = loadRecentResultBySession(collectionSlug, examSlug, sessionId);
    if (fromRecent) {
      setResult(fromRecent.result);
      setTitle(fromRecent.examTitle);
      return;
    }

    const session = loadSession(collectionSlug, examSlug, sessionId);
    if (session?.result) {
      setResult(session.result);
      setTitle(session.examId);
    }
  }, [collectionSlug, examSlug, sessionId]);

  if (!sessionId) {
    return (
      <p className="text-slate-600">
        Thiếu mã phiên. Hãy nộp bài từ trang làm bài hoặc chọn kết quả trong{" "}
        <Link href="/cai-dat" className="text-teal-700 underline">
          Kết quả
        </Link>
        .
      </p>
    );
  }

  if (!result) {
    return (
      <div className="py-12 text-center text-slate-600" role="status">
        Đang tải kết quả… Nếu bạn vừa nộp bài, hãy đợi giây lát.
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">Kết quả bài thi</h1>
      {title && <p className="mt-1 text-slate-600">{title}</p>}

      {result.autoSubmitted && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Bài được nộp tự động khi hết giờ.
        </p>
      )}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Điểm đạt được</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-teal-700">
          {result.pointsEarned}
          <span className="text-xl font-semibold text-slate-400">
            {" "}
            / {result.totalPoints}
          </span>
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-800">
          {result.percentCorrect}% câu đúng
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Đúng" value={String(result.correctCount)} tone="ok" />
        <Stat label="Sai" value={String(result.incorrectCount)} tone="bad" />
        <Stat label="Chưa trả lời" value={String(result.unansweredCount)} />
        <Stat label="Thời gian làm" value={formatDuration(result.durationSeconds)} />
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink
          href={`/exams/${collectionSlug}/${examSlug}/xem-lai?session=${sessionId}`}
          variant="primary"
        >
          Xem lại chi tiết
        </ButtonLink>
        <ButtonLink
          href={`/exams/${collectionSlug}/${examSlug}/lam-bai`}
          variant="secondary"
        >
          Làm lại đề
        </ButtonLink>
        <ButtonLink href="/de-thi" variant="ghost">
          Danh sách đề
        </ButtonLink>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  const bg =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-900"
      : tone === "bad"
        ? "bg-rose-50 text-rose-900"
        : "bg-slate-50 text-slate-800";
  return (
    <li className={`rounded-xl px-3 py-3 ${bg}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold text-lg">{value}</p>
    </li>
  );
}