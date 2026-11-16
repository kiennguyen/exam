"use client";

import type { PublicQuestion, UserAnswer } from "@/lib/exam/types";
import { QuestionMedia } from "./question-media";
import { ChoiceOptions } from "./choice-options";
import { WordOrderBuilder } from "./word-order-builder";

interface Props {
  question: PublicQuestion;
  index: number;
  total: number;
  value: UserAnswer;
  flagged: boolean;
  onChange: (answer: UserAnswer) => void;
  onToggleFlag: () => void;
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
  const textValue = typeof value === "string" ? value : "";

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
        <p className="text-lg font-semibold text-slate-900">
          Sắp xếp các mảnh sau thành câu hoàn chỉnh
        </p>
      )}

      {isFill ? (
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
            placeholder="Nhập đáp án..."
          />
        </div>
      ) : isWordOrder ? (
        <WordOrderBuilder
          questionId={question.id}
          prompt={question.prompt}
          value={textValue}
          onChange={(s) => onChange(s)}
        />
      ) : (
        question.options && (
          <ChoiceOptions
            questionId={question.id}
            options={question.options}
            multiple={isMulti}
            value={value}
            onChange={onChange}
          />
        )
      )}
    </article>
  );
}