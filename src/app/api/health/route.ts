import { NextResponse } from "next/server";

/** Public ping để xác nhận bản deploy (commit + cờ media). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    mediaStatic: true,
    builtAt: new Date().toISOString(),
  });
}