"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  clearAllExamProgress,
  getStorageAvailability,
  loadRecentResults,
  type RecentResultEntry,
} from "@/lib/session/storage";
import { formatDateTime } from "@/lib/format";

export function DeviceProgressClient() {
  const [recent, setRecent] = useState<RecentResultEntry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const { available, notice: n } = getStorageAvailability();
    setNotice(n?.message ?? (available ? null : "Không truy cập được localStorage."));
    setRecent(loadRecentResults());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearAll = () => {
    if (
      !window.confirm(
        "Xóa toàn bộ kết quả trên thiết bị này? Hành động không hoàn tác."
      )
    ) {
      return;
    }
    clearAllExamProgress();
    refresh();
  };

  return (
    <div className="space-y-6">
      {notice && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Kết quả gần đây</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Chưa có kết quả nào được lưu.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.sessionId} className="py-3 first:pt-0">
                <p className="font-medium text-slate-900">{r.examTitle}</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(r.submittedAt)} · {r.pointsEarned}/{r.totalPoints} điểm ·{" "}
                  {r.percentCorrect}%
                </p>
                <Link
                  href={`/exams/${r.collectionSlug}/${r.examSlug}/ket-qua?session=${r.sessionId}`}
                  className="mt-1 inline-block text-sm font-semibold text-teal-700 hover:underline"
                >
                  Xem kết quả
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="danger" onClick={clearAll}>
        Xóa kết quả
      </Button>
    </div>
  );
}