import Link from "next/link";
import { cookies } from "next/headers";
import { openAccessCookie } from "@/lib/access/cookie";
import { ACCESS_COOKIE_NAME } from "@/lib/access/constants";
import { SignOutButton } from "@/components/access/sign-out-button";

export async function SiteHeader() {
  const jar = await cookies();
  const raw = jar.get(ACCESS_COOKIE_NAME)?.value;
  const profile = await openAccessCookie(raw ? decodeURIComponent(raw) : undefined);

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2 font-semibold text-slate-900">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white"
            aria-hidden
          >
            VE
          </span>
          <span className="text-lg tracking-tight group-hover:text-teal-700 transition-colors">
            Vaijob Exam
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {profile && (
            <p className="hidden text-xs text-slate-600 sm:block" title="Đã xác thực truy cập">
              <span className="font-medium text-slate-800">{profile.name}</span>
              <span className="text-slate-400"> · </span>
              Lớp {profile.grade}
            </p>
          )}
          <nav
            className="flex items-center gap-1 text-sm font-medium text-slate-600"
            aria-label="Chính"
          >
            <Link
              href="/de-thi"
              className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Danh sách đề
            </Link>
            <Link
              href="/cai-dat"
              className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Kết quả
            </Link>
          </nav>
          {profile && <SignOutButton className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100" />}
        </div>
      </div>
    </header>
  );
}