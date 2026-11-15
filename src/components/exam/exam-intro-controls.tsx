"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import {
  defaultDurationSeconds,
  getDurationPreferenceSeconds,
  PRACTICE_DURATION_MINUTES,
  setDurationPreferenceSeconds,
} from "@/lib/session/duration-preference";

interface Props {
  collectionSlug: string;
  examSlug: string;
  examDurationSeconds: number;
}

function useDurationPreference(
  collectionSlug: string,
  examSlug: string,
  examDurationSeconds: number
) {
  const fallback = defaultDurationSeconds(examDurationSeconds);
  const [seconds, setSeconds] = useState(fallback);

  useEffect(() => {
    setSeconds(getDurationPreferenceSeconds(collectionSlug, examSlug, fallback));
  }, [collectionSlug, examSlug, fallback]);

  useEffect(() => {
    const handler = () => {
      setSeconds(getDurationPreferenceSeconds(collectionSlug, examSlug, fallback));
    };
    window.addEventListener("vaijob-duration-change", handler);
    return () => window.removeEventListener("vaijob-duration-change", handler);
  }, [collectionSlug, examSlug, fallback]);

  const setMinutes = (minutes: number) => {
    const next = minutes * 60;
    setSeconds(next);
    setDurationPreferenceSeconds(collectionSlug, examSlug, next);
    window.dispatchEvent(new Event("vaijob-duration-change"));
  };

  return { seconds, setMinutes, valueMinutes: seconds / 60 };
}

export function ExamDurationPicker({
  collectionSlug,
  examSlug,
  examDurationSeconds,
}: Props) {
  const { valueMinutes, setMinutes } = useDurationPreference(
    collectionSlug,
    examSlug,
    examDurationSeconds
  );

  return (
    <li className="rounded-xl border border-slate-200 bg-white px-4 py-2">
      <label htmlFor="exam-duration" className="text-slate-500">
        Thời lượng
      </label>
      <select
        id="exam-duration"
        value={valueMinutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        className="mt-1 block w-full min-w-[7rem] rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-sm font-semibold text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      >
        {PRACTICE_DURATION_MINUTES.map((m) => (
          <option key={m} value={m}>
            {m} phút
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-500">Chế độ luyện — tùy chọn trước khi bắt đầu</p>
    </li>
  );
}

export function ExamStartActions({
  collectionSlug,
  examSlug,
  examDurationSeconds,
}: Props) {
  const { seconds } = useDurationPreference(collectionSlug, examSlug, examDurationSeconds);
  const lamBaiHref = `/exams/${collectionSlug}/${examSlug}/lam-bai?duration=${seconds}`;

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <ButtonLink href={lamBaiHref} variant="primary">
        Bắt đầu làm bài
      </ButtonLink>
      <ButtonLink href="/de-thi" variant="secondary">
        Quay lại danh sách
      </ButtonLink>
    </div>
  );
}