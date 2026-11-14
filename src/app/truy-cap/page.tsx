import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccessGateForm } from "@/components/access/access-gate-form";
import { openAccessCookie } from "@/lib/access/cookie";
import { ACCESS_COOKIE_NAME } from "@/lib/access/constants";

export const metadata: Metadata = {
  title: "Truy cập Vaijob Exam",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default async function AccessGatePage({ searchParams }: Props) {
  const { next: nextRaw } = await searchParams;
  const nextPath = safeNext(nextRaw);

  const jar = await cookies();
  const raw = jar.get(ACCESS_COOKIE_NAME)?.value;
  const profile = await openAccessCookie(raw ? decodeURIComponent(raw) : undefined);
  if (profile) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
          Kiểm soát truy cập
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nhập thông tin để tiếp tục</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Vaijob Exam chỉ dành cho học sinh được giới thiệu. Vui lòng ghi họ tên, lớp và người giới
          thiệu trước khi xem hoặc làm đề.
        </p>
        <div className="mt-6">
          <AccessGateForm nextPath={nextPath} />
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Thông tin được lưu trong cookie trên trình duyệt (30 ngày). Bạn có thể xóa trong mục
          &quot;Kết quả&quot;.
        </p>
      </div>
    </div>
  );
}