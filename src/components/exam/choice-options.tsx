"use client";

import type { QuestionOption } from "@/lib/exam/types";

interface Props {
  questionId: string;
  options: QuestionOption[];
  multiple: boolean;
  value: string | string[] | null;
  onChange: (value: string | string[]) => void;
}

function optionLetter(id: string, index: number): string {
  if (/^[a-z]$/i.test(id)) return id.toUpperCase();
  return String.fromCharCode(65 + index);
}

export function ChoiceOptions({
  questionId,
  options,
  multiple,
  value,
  onChange,
}: Props) {
  const selectedArray = Array.isArray(value) ? value : value ? [value] : [];

  const toggleMulti = (optionId: string) => {
    const set = new Set(selectedArray);
    if (set.has(optionId)) set.delete(optionId);
    else set.add(optionId);
    onChange([...set]);
  };

  return (
    <fieldset className="mt-5 space-y-2" aria-label="Các phương án">
      <legend className="sr-only">Chọn đáp án</legend>
      {options.map((opt, index) => {
        const checked = multiple
          ? selectedArray.includes(opt.id)
          : value === opt.id;
        const letter = optionLetter(opt.id, index);

        return (
          <button
            key={opt.id}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={checked}
            onClick={() => {
              if (multiple) toggleMulti(opt.id);
              else onChange(opt.id);
            }}
            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              checked
                ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500/30"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                checked
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
              aria-hidden
            >
              {letter}
            </span>
            <span className="flex-1 pt-0.5 text-slate-800">{opt.label}</span>
            <span className="sr-only">
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`q-${questionId}`}
                checked={checked}
                readOnly
                tabIndex={-1}
              />
            </span>
            {multiple && (
              <span
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  checked
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
                aria-hidden
              >
                {checked ? (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}