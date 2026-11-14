import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_COOKIE_NAME,
  REFERRER_REQUIRED,
} from "./constants";
import type { AccessProfile } from "./types";

function accessSecret(): string {
  const secret = process.env.ACCESS_COOKIE_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[access] ACCESS_COOKIE_SECRET chưa cấu hình — dùng fallback kém an toàn."
    );
  }
  return "dev-access-secret-set-ACCESS_COOKIE_SECRET";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToString(b64: string): string {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const normalized = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(normalized);
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function encodePayload(profile: AccessProfile): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(profile)));
}

function decodePayload(encoded: string): AccessProfile | null {
  try {
    const json = base64UrlToString(encoded);
    const data = JSON.parse(json) as AccessProfile;
    if (
      typeof data.name !== "string" ||
      typeof data.grade !== "string" ||
      typeof data.referrer !== "string" ||
      typeof data.verifiedAt !== "number"
    ) {
      return null;
    }
    if (data.referrer !== REFERRER_REQUIRED) return null;
    return data;
  } catch {
    return null;
  }
}

export async function sealAccessCookie(profile: AccessProfile): Promise<string> {
  const payload = encodePayload(profile);
  const sig = await hmacSign(payload, accessSecret());
  return `${payload}.${sig}`;
}

export async function openAccessCookie(token: string | undefined): Promise<AccessProfile | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(payload, accessSecret());
  if (!timingSafeEqualString(sig, expected)) return null;
  return decodePayload(payload);
}

export function accessCookieHeaderOptions(token: string, maxAge = ACCESS_COOKIE_MAX_AGE): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ACCESS_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearAccessCookieHeader(): string {
  return `${ACCESS_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export { ACCESS_COOKIE_NAME };