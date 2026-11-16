"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  sentenceFromPieces,
  sequenceFromAnswer,
  wordOrderPieces,
} from "@/lib/exam/word-order";

interface Props {
  questionId: string;
  prompt: string;
  value: string;
  onChange: (sentence: string) => void;
}

function Chip({
  text,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  variant,
  title,
}: {
  text: string;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  variant: "bank" | "answer";
  title?: string;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title={title}
      className={`cursor-grab rounded-xl border px-3 py-2 text-sm font-medium transition active:cursor-grabbing ${
        variant === "bank"
          ? "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-teal-400 hover:bg-teal-50/50"
          : "border-teal-500 bg-teal-50 text-teal-950 hover:bg-teal-100"
      }`}
    >
      {text}
    </button>
  );
}

export function WordOrderBuilder({ questionId, prompt, value, onChange }: Props) {
  const pieces = useMemo(
    () => wordOrderPieces(questionId, prompt),
    [questionId, prompt]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  const syncFromValue = useCallback(
    (answer: string) => {
      const seq = sequenceFromAnswer(answer, pieces);
      if (seq !== null) {
        setSelectedIds(seq);
        setManual(false);
      } else if (answer.trim()) {
        setManual(true);
      } else {
        setSelectedIds([]);
        setManual(false);
      }
    },
    [pieces]
  );

  useEffect(() => {
    syncFromValue(value);
  }, [questionId, value, syncFromValue]);

  const bankIds = useMemo(() => {
    const used = new Set(selectedIds);
    return pieces.filter((p) => !used.has(p.id)).map((p) => p.id);
  }, [pieces, selectedIds]);

  const pieceById = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);

  const emit = (ids: string[]) => {
    setSelectedIds(ids);
    onChange(sentenceFromPieces(ids, pieces));
  };

  const addPiece = (id: string) => {
    emit([...selectedIds, id]);
  };

  const removeAt = (index: number) => {
    emit(selectedIds.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    emit([]);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...selectedIds];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    emit(next);
  };

  const insertAt = (id: string, index: number) => {
    if (selectedIds.includes(id)) {
      const from = selectedIds.indexOf(id);
      const next = selectedIds.filter((x) => x !== id);
      const adj = from < index ? index - 1 : index;
      next.splice(adj, 0, id);
      emit(next);
      return;
    }
    const next = [...selectedIds];
    next.splice(index, 0, id);
    emit(next);
  };

  const handleDropOnAnswer = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (!id) return;
    if (index === undefined) addPiece(id);
    else insertAt(id, index);
    setDragId(null);
  };

  const dropIndexFromEvent = (
    e: React.DragEvent,
    container: HTMLElement
  ): number => {
    const target = (e.target as HTMLElement).closest("[data-drop-index]");
    if (target?.parentElement === container) {
      const raw = target.getAttribute("data-drop-index");
      if (raw !== null) return Number(raw);
    }
    return selectedIds.length;
  };

  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-slate-600">
        Nhấn từ để thêm vào câu, nhấn lại trên câu để bỏ từ. Có thể kéo thả để đổi thứ tự (giống
        IOE / Duolingo).
      </p>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Câu của bạn
        </p>
        <div
          className="mt-2 min-h-[3.25rem] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const idx = dropIndexFromEvent(
              e,
              e.currentTarget as HTMLElement
            );
            handleDropOnAnswer(e, selectedIds.length === 0 ? 0 : idx);
          }}
        >
          {selectedIds.length === 0 ? (
            <p className="text-sm text-slate-400">Chọn hoặc kéo các mảnh vào đây…</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.map((id, index) => {
                const p = pieceById.get(id);
                if (!p) return null;
                return (
                  <span key={`${id}-${index}`} data-drop-index={index}>
                    <Chip
                      variant="answer"
                      text={p.text}
                      draggable
                      title="Nhấn để bỏ; kéo để đổi vị trí"
                      onClick={() => removeAt(index)}
                      onDragStart={(e) => {
                        setDragId(id);
                        e.dataTransfer.setData("text/plain", id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fromId =
                          e.dataTransfer.getData("text/plain") || dragId;
                        if (!fromId) return;
                        const fromIndex = selectedIds.indexOf(fromId);
                        if (fromIndex >= 0) moveItem(fromIndex, index);
                        else insertAt(fromId, index);
                        setDragId(null);
                      }}
                    />
                  </span>
                );
              })}
              <span
                data-drop-index={selectedIds.length}
                className="inline-block min-w-[2rem] flex-1"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDropOnAnswer(e, selectedIds.length);
                }}
              />
            </div>
          )}
        </div>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Xóa hết câu
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Các mảnh
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {bankIds.map((id) => {
            const p = pieceById.get(id);
            if (!p) return null;
            return (
              <Chip
                key={id}
                variant="bank"
                text={p.text}
                draggable
                title="Nhấn hoặc kéo vào câu"
                onClick={() => addPiece(id)}
                onDragStart={(e) => {
                  setDragId(id);
                  e.dataTransfer.setData("text/plain", id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragId(null)}
              />
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setManual((m) => !m)}
          className="text-sm text-teal-700 hover:text-teal-900"
        >
          {manual ? "Ẩn nhập tay" : "Gõ tay (nếu cần)"}
        </button>
        {manual && (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            placeholder="Nhập câu hoàn chỉnh..."
          />
        )}
      </div>
    </div>
  );
}