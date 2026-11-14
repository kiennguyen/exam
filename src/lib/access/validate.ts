import { REFERRER_REQUIRED } from "./constants";

export interface AccessRegistrationInput {
  name: string;
  grade: string;
  referrer: string;
}

export function normalizeReferrer(value: string): string {
  return value.trim().toLowerCase();
}

export function validateAccessInput(
  input: AccessRegistrationInput
): { ok: true; data: AccessRegistrationInput } | { ok: false; error: string } {
  const name = input.name.trim().replace(/\s+/g, " ");
  const grade = input.grade.trim();
  const referrer = normalizeReferrer(input.referrer);

  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Họ tên phải từ 2 đến 80 ký tự." };
  }
  if (grade.length < 1 || grade.length > 30) {
    return { ok: false, error: "Vui lòng nhập lớp (ví dụ 7A, 7/1)." };
  }
  if (referrer !== REFERRER_REQUIRED) {
    return { ok: false, error: "Mã người giới thiệu không hợp lệ." };
  }

  return {
    ok: true,
    data: { name, grade, referrer: REFERRER_REQUIRED },
  };
}