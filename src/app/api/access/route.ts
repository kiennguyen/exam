import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  accessCookieHeaderOptions,
  clearAccessCookieHeader,
  openAccessCookie,
  sealAccessCookie,
} from "@/lib/access/cookie";
import { ACCESS_COOKIE_NAME, ACCESS_GATE_PATH } from "@/lib/access/constants";
import type { AccessProfile } from "@/lib/access/types";
import { validateAccessInput } from "@/lib/access/validate";

function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith(ACCESS_GATE_PATH)) return "/";
  return next;
}

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(ACCESS_COOKIE_NAME)?.value;
  const profile = await openAccessCookie(raw ? decodeURIComponent(raw) : undefined);
  if (!profile) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    profile: { name: profile.name, grade: profile.grade, referrer: profile.referrer },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const input =
    typeof body === "object" && body !== null
      ? {
          name: String((body as { name?: unknown }).name ?? ""),
          grade: String((body as { grade?: unknown }).grade ?? ""),
          referrer: String((body as { referrer?: unknown }).referrer ?? ""),
        }
      : { name: "", grade: "", referrer: "" };

  const validated = validateAccessInput(input);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const nextParam =
    typeof body === "object" && body !== null
      ? String((body as { next?: unknown }).next ?? "/")
      : "/";

  const profile: AccessProfile = {
    name: validated.data.name,
    grade: validated.data.grade,
    referrer: validated.data.referrer,
    verifiedAt: Date.now(),
  };

  const token = await sealAccessCookie(profile);
  const redirectTo = safeNextPath(nextParam);

  console.info(
    `[access] grant name="${profile.name}" grade="${profile.grade}" referrer="${profile.referrer}"`
  );

  const res = NextResponse.json({ ok: true, redirect: redirectTo });
  res.headers.set("Set-Cookie", accessCookieHeaderOptions(token));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearAccessCookieHeader());
  return res;
}