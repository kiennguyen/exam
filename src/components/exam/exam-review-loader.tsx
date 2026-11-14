"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GradingResult, PublicExam } from "@/lib/exam/types";
import { loadRecentResultBySession, loadSession } from "@/lib/session/storage";
import { ExamReviewClient } from "./exam-review-client";

export function ExamReviewLoader({
  collectionSlug,
  examSlug,
  sessionId,
}: {
  collectionSlug: string;
  examSlug: string;
  sessionId?: string;
}) {
  const [result, setResult] = useState<GradingResult | null>(null);
  const [exam, setExam] = useState<PublicExam | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fromRecent = loadRecentResultBySession(collectionSlug, examSlug, sessionId);
    const fromSession = loadSession(collectionSlug, examSlug, sessionId);
    const grading =
      fromRecent?.result ?? fromSession?.result ?? null;

    if (!grading) {
      setError("Không tìm thấy kết quả cho phiên này trên thiết bị.");
      return;
    }
    setResult(grading);

    void fetch(`/api/exams/${collectionSlug}/${examSlug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Không tải được đề");
        return r.json();
      })
      .then((data: { exam: PublicExam }) => setExam(data.exam))
      .catch(() => setError("Không tải được nội dung đề để xem lại."));
  }, [collectionSlug, examSlug, sessionId]);

  if (!sessionId) {
    return (
      <p className="text-slate-600">
        Thiếu mã phiên. Quay lại{" "}
        <Link href="/de-thi" className="text-teal-700 underline">
          danh sách đề
        </Link>
        .
      </p>
    );
  }

  if (error) {
    return <p className="text-rose-700">{error}</p>;
  }

  if (!result || !exam) {
    return <p className="text-slate-600 py-12 text-center">Đang tải…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Xem lại bài làm</h1>
      <p className="mt-1 text-slate-600">{exam.title}</p>
      <div className="mt-8">
        <ExamReviewClient
          collectionSlug={collectionSlug}
          examSlug={examSlug}
          exam={exam}
          result={result}
        />
      </div>
    </div>
  );
}