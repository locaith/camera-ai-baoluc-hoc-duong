/**
 * Trình duyệt bên trong ứng dụng (Zalo, Facebook, Messenger...) mở cửa sổ đăng nhập Google
 * thành trang trắng và Google cũng chặn đăng nhập ở đó -> hướng dẫn mở bằng Chrome/Safari.
 */

export interface InAppBrowser {
  app: string;
  os: "android" | "ios" | "other";
}

const APPS: [RegExp, string][] = [
  [/Zalo/i, "Zalo"],
  [/MicroMessenger/i, "WeChat"],
  [/MESSENGER|Messenger/, "Messenger"],
  [/FB_IAB|FB4A|FBAN|FBAV|FBIOS/i, "Facebook"],
  [/Instagram/i, "Instagram"],
  [/Barcelona/i, "Threads"],
  [/musical_ly|TikTok|Bytedance/i, "TikTok"],
  [/Viber/i, "Viber"],
  [/Line\//i, "LINE"],
  [/Telegram/i, "Telegram"],
];

export function detectInAppBrowser(ua: string): InAppBrowser | null {
  const os = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other";
  const known = APPS.find(([pattern]) => pattern.test(ua));
  // WebView Android có "; wv)"; WebView iOS không có "Safari/"
  const webview = (os === "android" && /; wv\)/i.test(ua)) || (os === "ios" && !/Safari\//i.test(ua));
  if (!known && !webview) return null;
  return { app: known?.[1] ?? "ứng dụng này", os };
}

/** Liên kết mở trang hiện tại bằng trình duyệt ngoài (Chrome trên Android, Safari trên iOS 17+). */
export function externalBrowserUrl(url: string, os: InAppBrowser["os"]) {
  const target = new URL(url);
  if (os === "android") {
    return `intent://${target.host}${target.pathname}${target.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  }
  if (os === "ios") return `x-safari-${url}`;
  return url;
}

/** Sao chép chữ, kể cả trong WebView không có Clipboard API. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}
