"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
interface Props {
  nextPath: string;
}

export function AccessGateForm({ nextPath }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [referrer, setReferrer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          grade,
          referrer,
          next: nextPath,
        }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error ?? "Không thể xác thực. Thử lại sau.");
        return;
      }
      router.push(data.redirect ?? "/");
      router.refresh();
    } catch {
      setError("Lỗi kết nối. Kiểm tra mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="access-name">
          Họ và tên
        </label>
        <input
          id="access-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Nguyễn Văn A"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="access-grade">
          Lớp
        </label>
        <input
          id="access-grade"
          name="grade"
          type="text"
          required
          maxLength={30}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Ví dụ: 7A, 7/1"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="access-referrer">
          Người giới thiệu
        </label>
        <input
          id="access-referrer"
          name="referrer"
          type="text"
          required
          minLength={2}
          maxLength={64}
          autoComplete="off"
          value={referrer}
          onChange={(e) => setReferrer(e.target.value)}
          placeholder="Mã do người giới thiệu cung cấp"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          aria-describedby="referrer-hint"
        />
        <p id="referrer-hint" className="mt-1 text-xs text-slate-500">
          Chỉ học sinh có mã hợp lệ mới vào được trang luyện đề.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {loading ? "Đang xác nhận…" : "Vào trang luyện đề"}
      </button>
    </form>
  );
}