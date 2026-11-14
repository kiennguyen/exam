import { cookies } from "next/headers";
import { openAccessCookie } from "@/lib/access/cookie";
import { ACCESS_COOKIE_NAME } from "@/lib/access/constants";
import type { AccessProfile } from "@/lib/access/types";

export async function getAccessProfile(): Promise<AccessProfile | null> {
  const jar = await cookies();
  const raw = jar.get(ACCESS_COOKIE_NAME)?.value;
  return openAccessCookie(raw ? decodeURIComponent(raw) : undefined);
}