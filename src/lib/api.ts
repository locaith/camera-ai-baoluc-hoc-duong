"use client";

import { useConnection } from "./connection";
import type { Video } from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Máy chủ yêu cầu gửi lại từ đúng vị trí (phần tải lên bị lệch). */
class ResumeError extends Error {
  received: number;

  constructor(received: number) {
    super("resume");
    this.received = received;
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

export const OFFLINE_MESSAGE = "Không kết nối được hệ thống. Vui lòng thử lại sau ít phút.";

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
    return res.statusText || `Lỗi ${res.status}`;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown; baseUrl?: string; token?: string } = {},
): Promise<T> {
  const state = useConnection.getState();
  const baseUrl = init.baseUrl ?? state.baseUrl;
  const token = init.token ?? state.token;

  if (!baseUrl) throw new ApiError(0, OFFLINE_MESSAGE);

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
    throw new ApiError(0, OFFLINE_MESSAGE);
  }

  if (!res.ok) {
    // Phiên hết hạn hoặc tài khoản bị khoá -> về trang đăng nhập
    if (res.status === 401 && token && !init.token) useConnection.getState().clearSession();
    throw new ApiError(res.status, await errorMessage(res));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface UploadOptions {
  filename?: string;
  title?: string;
  camera_id?: string;
  /** "phone": bản quay từ trang "Quay tại chỗ" (mọi tài khoản đều được gửi) */
  source?: "upload" | "phone";
  camera_name?: string;
}

function putChunk(
  uploadId: string,
  offset: number,
  chunk: Blob,
  onProgress: (loaded: number) => void,
  bind: (xhr: XMLHttpRequest) => void,
) {
  return new Promise<number>((resolve, reject) => {
    const { token } = useConnection.getState();
    const xhr = new XMLHttpRequest();
    bind(xhr);
    xhr.open("PUT", apiUrl(`/api/videos/uploads/${uploadId}`, { offset }));
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      let data: { received?: number; detail?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status === 409 && typeof data?.received === "number") reject(new ResumeError(data.received));
      else if (xhr.status >= 200 && xhr.status < 300 && typeof data?.received === "number") resolve(data.received);
      else reject(new ApiError(xhr.status, data?.detail || `Lỗi ${xhr.status}`));
    };
    xhr.onerror = () => reject(new ApiError(0, "Mất kết nối khi tải lên."));
    xhr.onabort = () => reject(new ApiError(-1, "Đã huỷ tải lên."));
    xhr.send(chunk);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tải video lên theo từng phần (Cloudflare giới hạn 100 MB/yêu cầu),
 * tự thử lại khi rớt mạng và tiếp tục từ đúng vị trí máy chủ đã nhận.
 */
export function uploadVideo(
  file: Blob,
  onProgress: (fraction: number) => void,
  options: UploadOptions = {},
) {
  let aborted = false;
  let current: XMLHttpRequest | null = null;
  let uploadId = "";

  const promise = (async () => {
    const filename = options.filename ?? (file instanceof File ? file.name : "video.mp4");
    const init = await api<{ upload_id: string; chunk_size: number }>("/api/videos/uploads", {
      method: "POST",
      json: {
        filename,
        size: file.size,
        title: options.title ?? "",
        camera_id: options.camera_id ?? "",
        source: options.source ?? "upload",
        camera_name: options.camera_name ?? "",
      },
    });
    uploadId = init.upload_id;
    const chunkSize = init.chunk_size || 32 * 1024 * 1024;

    let offset = 0;
    let failures = 0;
    while (offset < file.size) {
      if (aborted) throw new ApiError(-1, "Đã huỷ tải lên.");
      const start = offset;
      const end = Math.min(file.size, start + chunkSize);
      try {
        offset = await putChunk(
          uploadId,
          start,
          file.slice(start, end),
          (loaded) => onProgress((start + loaded) / file.size),
          (xhr) => (current = xhr),
        );
        failures = 0;
      } catch (error) {
        if (error instanceof ResumeError) {
          offset = error.received;
          continue;
        }
        if (aborted || !(error instanceof ApiError) || error.status > 0 || failures >= 5) throw error;
        // Rớt mạng: chờ rồi gửi lại, máy chủ sẽ báo vị trí đúng nếu phần trước đã tới
        failures += 1;
        await sleep(1500 * failures);
      }
    }
    onProgress(1);
    return api<Video>(`/api/videos/uploads/${uploadId}/complete`, { method: "POST" });
  })();

  promise.catch(() => {
    if (uploadId) void api(`/api/videos/uploads/${uploadId}`, { method: "DELETE" }).catch(() => {});
  });

  return {
    promise,
    abort: () => {
      aborted = true;
      current?.abort();
    },
  };
}
