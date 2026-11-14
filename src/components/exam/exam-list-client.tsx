"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDuration } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";

export interface ExamListItem {
  collectionSlug: string;
  collectionTitle: string;
  subject: string;
  grade: string;
  examType: string;
  examSlug: string;
  examTitle: string;
  questionCount: number;
  durationSeconds: number;
  totalPoints: number;
}

const PAGE_SIZE = 12;

export function ExamListClient({ items }: { items: ExamListItem[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const [grade, setGrade] = useState<string>("all");
  const [examType, setExamType] = useState<string>("all");
  const [collectionSlug, setCollectionSlug] = useState<string>("all");
  const [page, setPage] = useState(1);

  const collections = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const item of items) {
      bySlug.set(item.collectionSlug, item.collectionTitle);
    }
    return [...bySlug.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], "vi")
    );
  }, [items]);

  const subjects = useMemo(
    () => [...new Set(items.map((i) => i.subject))].sort(),
    [items]
  );
  const grades = useMemo(
    () => [...new Set(items.map((i) => i.grade))].sort(),
    [items]
  );
  const types = useMemo(
    () => [...new Set(items.map((i) => i.examType))].sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (subject !== "all" && item.subject !== subject) return false;
      if (grade !== "all" && item.grade !== grade) return false;
      if (examType !== "all" && item.examType !== examType) return false;
      if (collectionSlug !== "all" && item.collectionSlug !== collectionSlug) return false;
      if (!q) return true;
      const hay = `${item.examTitle} ${item.collectionTitle} ${item.subject} ${item.examSlug}`.toLowerCase();
      return hay.includes(q);
    });
    const orderKey = (slug: string): number => {
      const m = slug.match(/ioe-de-(\d+)/);
      if (m) return Number(m[1]);
      if (slug.startsWith("practice-")) return 1000;
      if (slug === "demo-nhanh") return 0;
      return 500;
    };
    return list.sort(
      (a, b) => orderKey(a.examSlug) - orderKey(b.examSlug) || a.examTitle.localeCompare(b.examTitle, "vi")
    );
  }, [items, query, subject, grade, examType, collectionSlug]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, subject, grade, examType, collectionSlug]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700" htmlFor="search">
          Tìm đề
        </label>
        <input
          id="search"
          type="search"
          placeholder="Nhập tên đề, môn học…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {collections.length > 1 && (
            <FilterSelect
              label="Bộ đề"
              value={collectionSlug}
              onChange={setCollectionSlug}
              options={collections.map(([slug, title]) => ({ value: slug, label: title }))}
              optionMode="value"
            />
          )}
          <FilterSelect
            label="Môn học"
            value={subject}
            onChange={setSubject}
            options={subjects}
          />
          <FilterSelect
            label="Lớp / khối"
            value={grade}
            onChange={setGrade}
            options={grades}
          />
          <FilterSelect
            label="Kỳ thi / loại đề"
            value={examType}
            onChange={setExamType}
            options={types}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-slate-600 py-12">
          Không có đề phù hợp. Thử đổi bộ lọc hoặc từ khóa tìm kiếm.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {filtered.length} đề
            {pageCount > 1 && (
              <span>
                {" "}
                · trang {page}/{pageCount}
              </span>
            )}
          </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {pageItems.map((item) => (
            <li
              key={`${item.collectionSlug}-${item.examSlug}`}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                {item.subject} · {item.grade}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                <Link
                  href={`/exams/${item.collectionSlug}/${item.examSlug}`}
                  className="hover:text-teal-700"
                >
                  {item.examTitle}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-600">{item.collectionTitle}</p>
              <ul className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                <li>{item.questionCount} câu</li>
                <li>{formatDuration(item.durationSeconds)}</li>
                <li>{item.totalPoints} điểm</li>
                <li>{item.examType}</li>
              </ul>
              <div className="mt-4 pt-2">
                <ButtonLink
                  href={`/exams/${item.collectionSlug}/${item.examSlug}`}
                  variant="primary"
                  className="w-full"
                >
                  Bắt đầu
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
        {pageCount > 1 && (
          <nav
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
            aria-label="Phân trang danh sách đề"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
            >
              Sau
            </button>
          </nav>
        )}
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  optionMode = "label",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[] | Array<{ value: string; label: string }>;
  optionMode?: "label" | "value";
}) {
  const normalized =
    optionMode === "value"
      ? (options as Array<{ value: string; label: string }>)
      : (options as string[]).map((o) => ({ value: o, label: o }));

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
        <option value="all">Tất cả</option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}