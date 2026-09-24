const dateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortTime = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "short" });

const longDate = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const compact = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatDateTime(ts?: number | null) {
  if (!ts) return "—";
  return dateTime.format(new Date(ts * 1000));
}

export function formatTime(ts: number) {
  return shortTime.format(new Date(ts * 1000));
}

/** "24/9" (tự định dạng để mọi trình duyệt hiển thị giống nhau) */
function dayMonthOf(date: Date) {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function formatDay(ts: number) {
  return dayMonthOf(new Date(ts * 1000));
}

export function formatWeekday(ts: number) {
  return weekday.format(new Date(ts * 1000));
}

/** "Thứ năm, 24 tháng 9, 2026" */
export function formatLongDate(date = new Date()) {
  const text = longDate.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Hôm nay 14:32 · Hôm qua 09:10 · 12/09 08:00 */
export function formatWhen(ts?: number | null) {
  if (!ts) return "—";
  const date = new Date(ts * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return `Hôm nay ${shortTime.format(date)}`;
  if (same(date, yesterday)) return `Hôm qua ${shortTime.format(date)}`;
  return `${dayMonthOf(date)} · ${shortTime.format(date)}`;
}

export function formatRelative(ts?: number | null) {
  if (!ts) return "—";
  const diff = Date.now() / 1000 - ts;
  if (diff < 10) return "vừa xong";
  if (diff < 60) return `${Math.floor(diff)} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatDateTime(ts);
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) return "0:00";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d} ngày ${h} giờ`;
  if (h) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

export function formatCompact(value: number) {
  return compact.format(value);
}

export function formatPercent(value?: number | null, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
