"use client";

import type { PublicQuestion, UserAnswer } from "@/lib/exam/types";
import { QuestionMedia } from "./question-media";

interface Props {
  question: PublicQuestion;
  index: number;
  total: number;
  value: UserAnswer;
  flagged: boolean;
  onChange: (answer: UserAnswer) => void;
  onToggleFlag: () => void;
}

function wordOrderTokens(prompt: string): string[] {
  return prompt
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function QuestionPanel({
  question,
  index,
  total,
  value,
  flagged,
  onChange,
  onToggleFlag,
}: Props) {
  const isMulti = question.type === "multiple_choice";
  const isFill = question.type === "fill_blank";
  const isWordOrder = question.type === "word_order";
  const textAnswer = isFill || isWordOrder;
  const selectedArray = Array.isArray(value) ? value : value ? [value] : [];
  const textValue = typeof value === "string" ? value : "";
  const tokens = isWordOrder ? wordOrderTokens(question.prompt) : [];

  const toggleMulti = (optionId: string) => {
    const set = new Set(selectedArray);
    if (set.has(optionId)) set.delete(optionId);
    else set.add(optionId);
    onChange([...set]);
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          Câu {index + 1} / {total}
          <span className="ml-2 text-slate-400">({question.points} điểm)</span>
        </p>
        <button
          type="button"
          onClick={onToggleFlag}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            flagged
              ? "bg-amber-100 text-amber-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          aria-pressed={flagged}
        >
          {flagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}
        </button>
      </div>
      {!isWordOrder && (
        <h2 className="text-lg font-semibold leading-relaxed text-slate-900">
          {question.prompt}
        </h2>
      )}
      <QuestionMedia question={question} />
      {isMulti && (
        <p className="mt-2 text-sm text-slate-600">Chọn tất cả đáp án đúng.</p>
      )}
      {isFill && (
        <p className="mt-2 text-sm text-slate-600">
          Gõ từ hoặc cụm từ còn thiếu (không phân biệt hoa thường).
        </p>
      )}
      {isWordOrder && (
        <>
          <p className="text-lg font-semibold text-slate-900">
            Sắp xếp các mảnh sau thành câu hoàn chỉnh
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tokens.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-800"
              >
                {t}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Gõ câu tiếng Anh hoàn chỉnh bên dưới (không phân biệt hoa thường).
          </p>
        </>
      )}

      {textAnswer ? (
        <div className="mt-5">
          <label htmlFor={`fill-${question.id}`} className="sr-only">
            Câu trả lời
          </label>
          <input
            id={`fill-${question.id}`}
            type="text"
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            placeholder={isWordOrder ? "Nhập câu hoàn chỉnh..." : "Nhập đáp án..."}
          />
        </div>
      ) : (
        <fieldset className="mt-5 space-y-2" aria-label={`Lựa chọn câu ${index + 1}`}>
          <legend className="sr-only">Các phương án</legend>
          {question.options?.map((opt) => {
            const checked = isMulti
              ? selectedArray.includes(opt.id)
              : value === opt.id;

            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  checked
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`q-${question.id}`}
                  className="mt-1 h-4 w-4 accent-teal-600"
                  checked={checked}
                  onChange={() => {
                    if (isMulti) toggleMulti(opt.id);
                    else onChange(opt.id);
                  }}
                />
                <span className="text-slate-800">{opt.label}</span>
              </label>
            );
          })}
        </fieldset>
      )}
    </article>
  );
}