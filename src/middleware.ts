import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { openAccessCookie } from "@/lib/access/cookie";
import { ACCESS_COOKIE_NAME, ACCESS_GATE_PATH } from "@/lib/access/constants";

const PUBLIC_PREFIXES = [
  "/_next/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === ACCESS_GATE_PATH || pathname.startsWith("/api/access")) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p) || pathname === p)) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const decoded = raw ? decodeURIComponent(raw) : undefined;
  const profile = await openAccessCookie(decoded);

  if (profile) {
    return NextResponse.next();
  }

  const gate = new URL(ACCESS_GATE_PATH, request.url);
  if (pathname !== "/") {
    gate.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(gate);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};