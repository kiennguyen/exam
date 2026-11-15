"use client";

import { useMemo, useState } from "react";
import type {
  GradingResult,
  PublicExam,
  PublicQuestion,
  QuestionResult,
} from "@/lib/exam/types";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { QuestionMedia } from "./question-media";

type Filter = "all" | "incorrect" | "unanswered" | "flagged";

interface Props {
  collectionSlug: string;
  examSlug: string;
  exam: PublicExam;
  result: GradingResult;
}

export function ExamReviewClient({
  collectionSlug,
  examSlug,
  exam,
  result,
}: Props) {
  const questionMap = useMemo(
    () => new Map(exam.questions.map((q) => [q.id, q])),
    [exam.questions]
  );

  const ordered = useMemo(
    () =>
      [...result.questions].sort((a, b) => {
        const qa = questionMap.get(a.questionId)?.order ?? 0;
        const qb = questionMap.get(b.questionId)?.order ?? 0;
        return qa - qb;
      }),
    [result.questions, questionMap]
  );

  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(() => {
    return ordered.filter((q) => {
      if (filter === "all") return true;
      if (filter === "incorrect") return q.status === "incorrect";
      if (filter === "unanswered") return q.status === "unanswered";
      if (filter === "flagged") return q.flagged;
      return true;
    });
  }, [ordered, filter]);

  const [index, setIndex] = useState(0);
  const current = filtered[index] ?? filtered[0];

  if (!current) {
    return (
      <p className="text-slate-600">Không có câu nào trong bộ lọc đã chọn.</p>
    );
  }

  const publicQ = questionMap.get(current.questionId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Tất cả"],
            ["incorrect", "Câu sai"],
            ["unanswered", "Chưa trả lời"],
            ["flagged", "Đã đánh dấu"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id);
              setIndex(0);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === id
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ReviewCard
        index={questionMap.get(current.questionId)?.order ?? index + 1}
        item={current}
        question={publicQ}
        prompt={publicQ?.prompt ?? current.questionId}
        options={publicQ?.options}
      />

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="secondary"
          disabled={index <= 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          Câu trước
        </Button>
        <span className="self-center text-sm text-slate-500">
          {index + 1} / {filtered.length}
        </span>
        <Button
          variant="secondary"
          disabled={index >= filtered.length - 1}
          onClick={() => setIndex((i) => i + 1)}
        >
          Câu sau
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pt-4">
        <ButtonLink
          href={`/exams/${collectionSlug}/${examSlug}/ket-qua?session=${result.sessionId}`}
          variant="ghost"
        >
          Về kết quả
        </ButtonLink>
        <ButtonLink href={`/exams/${collectionSlug}/${examSlug}/lam-bai`} variant="primary">
          Làm lại đề
        </ButtonLink>
      </div>
    </div>
  );
}

function ReviewCard({
  index,
  item,
  question,
  prompt,
  options,
}: {
  index: number;
  item: QuestionResult;
  question?: PublicQuestion;
  prompt: string;
  options?: { id: string; label: string }[];
}) {
  const statusLabel =
    item.status === "correct"
      ? "Đúng"
      : item.status === "incorrect"
        ? "Sai"
        : "Chưa trả lời";

  const statusColor =
    item.status === "correct"
      ? "bg-emerald-100 text-emerald-900"
      : item.status === "incorrect"
        ? "bg-rose-100 text-rose-900"
        : "bg-slate-100 text-slate-700";

  const labelFor = (id: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    return ids
      .map((i) => options?.find((o) => o.id === i)?.label ?? i)
      .join(", ");
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-500">Câu {index}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
        {item.flagged && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            Đã đánh dấu
          </span>
        )}
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{prompt}</h2>
      {question && <QuestionMedia question={question} />}

      {options && (
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {options.map((o) => (
            <li key={o.id} className="rounded-lg bg-slate-50 px-3 py-2">
              {o.label}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-5 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-slate-500">Bạn trả lời</dt>
          <dd className="text-slate-900">
            {item.userAnswer ? labelFor(item.userAnswer) : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Đáp án đúng</dt>
          <dd className="font-semibold text-teal-800">
            {labelFor(item.correctAnswer)}
          </dd>
        </div>
        {item.explanation && (
          <div>
            <dt className="font-medium text-slate-500">Giải thích</dt>
            <dd className="text-slate-800">{item.explanation}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}