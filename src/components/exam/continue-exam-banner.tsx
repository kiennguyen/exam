"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { findActiveSession } from "@/lib/session/storage";
import { formatCountdown } from "@/lib/format";

export function ContinueExamBanner({
  collectionSlug,
  examSlug,
}: {
  collectionSlug: string;
  examSlug: string;
}) {
  const [session, setSession] = useState<ReturnType<typeof findActiveSession>>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setSession(findActiveSession(collectionSlug, examSlug));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [collectionSlug, examSlug]);

  if (!session) return null;

  const msLeft = session.deadlineAt - now;

  return (
    <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      <p className="font-medium">Bạn có bài đang làm dở</p>
      <p className="mt-1 text-teal-800">
        Còn {formatCountdown(msLeft)}.{" "}
        <Link
          href={`/exams/${collectionSlug}/${examSlug}/lam-bai?session=${session.sessionId}`}
          className="font-semibold underline"
        >
          Tiếp tục làm bài
        </Link>
      </p>
    </div>
  );
}