export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0 && m > 0) {
    return `${m} phút`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.ceil(msRemaining / 1000));
  return formatDuration(total);
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}