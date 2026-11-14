"use client";

import type { Section } from "@/lib/exam/types";

export function SectionTabs({
  sections,
  questionIndexById,
  currentIndex,
  onJump,
}: {
  sections: Section[];
  questionIndexById: Map<string, number>;
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  if (sections.length <= 1) return null;

  const sorted = [...sections].sort((a, b) => a.order - b.order);

  let activeSection = sorted[0]?.id;
  for (const sec of sorted) {
    const indices = sec.questionIds
      .map((id) => questionIndexById.get(id))
      .filter((i): i is number => i !== undefined);
    if (indices.length === 0) continue;
    const start = Math.min(...indices);
    const end = Math.max(...indices);
    if (currentIndex >= start && currentIndex <= end) {
      activeSection = sec.id;
      break;
    }
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Các phần của đề"
    >
      {sorted.map((sec) => {
        const start = Math.min(
          ...sec.questionIds
            .map((id) => questionIndexById.get(id) ?? Number.POSITIVE_INFINITY)
            .filter((n) => Number.isFinite(n))
        );
        const isActive = sec.id === activeSection;
        return (
          <button
            key={sec.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onJump(start)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              isActive
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {sec.title.replace(/ \(câu.+\)/, "").replace("Phần ", "P.")}
          </button>
        );
      })}
    </div>
  );
}