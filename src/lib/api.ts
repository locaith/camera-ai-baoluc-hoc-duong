"use client";

import { useConnection } from "./connection";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

export function apiUrl(path: string, params?: Params) {
  const { baseUrl } = useConnection.getState();
  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** URL cho <img>/<video>/EventSource/WebSocket: không gửi được header nên kèm ?token= */
export function mediaUrl(path: string, params?: Params) {
  const { token } = useConnection.getState();
  return apiUrl(path, { ...params, token: token || undefined });
}

export function wsUrl(path: string, params?: Params) {
  return mediaUrl(path, params).replace(/^http/, "ws");
}

export function query(params: Params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      search.set(key, String(value));
  }
  return search.toString();
}

async function errorMessage(res: Response) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.error === "string") return data.error;
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown; baseUrl?: string; token?: string } = {},
): Promise<T> {
  const state = useConnection.getState();
  const baseUrl = init.baseUrl ?? state.baseUrl;
  const token = init.token ?? state.token;

  if (!baseUrl) throw new ApiError(0, "Chưa cấu hình máy chủ.");

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(baseUrl + path, { ...init, headers, body });
  } catch {
    throw new ApiError(
      0,
      "Không kết nối được máy chủ. Kiểm tra backend đang chạy, URL và CORS.",
    );
  }

  if (!res.ok) {
    // Phiên hết hạn hoặc tài khoản bị khoá -> về trang đăng nhập
    if (res.status === 401 && token && !init.token) useConnection.getState().clearSession();
    throw new ApiError(res.status, await errorMessage(res));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Upload video bằng XHR để có tiến độ; gửi thẳng file làm body (không multipart). */
export function uploadVideo(
  file: File,
  onProgress: (fraction: number) => void,
  extra: { title?: string; camera_id?: string } = {},
) {
  const { token } = useConnection.getState();
  const url = apiUrl("/api/videos/upload", {
    filename: file.name,
    title: extra.title,
    camera_id: extra.camera_id,
  });

  const xhr = new XMLHttpRequest();

  const promise = new Promise<unknown>((resolve, reject) => {
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: { detail?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data?.detail || `HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new ApiError(0, "Mất kết nối khi tải lên."));
    xhr.onabort = () => reject(new ApiError(0, "Đã huỷ tải lên."));
    xhr.send(file);
  });

  return { promise, abort: () => xhr.abort() };
}
