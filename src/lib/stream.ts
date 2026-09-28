"use client";

import { wsUrl } from "./api";
import { deviceLabel } from "./capture";
import type { LiveStatus } from "./types";

/**
 * "Phát camera từ máy này": webcam trên máy của quản trị viên trở thành một camera của hệ thống.
 * Trình duyệt gửi ~5 khung hình/giây qua WebSocket /api/ws/stream; máy chủ phân tích, cảnh báo,
 * ghi clip bằng chứng như camera cố định. Camera vẫn nằm trong danh sách khi máy này ngừng phát.
 */

export type StreamPhase = "idle" | "starting" | "live" | "error";

export interface StreamStatus extends LiveStatus {
  threshold: number;
}

export interface StreamSnapshot {
  phase: StreamPhase;
  error: string;
  link: "idle" | "connecting" | "open" | "retrying";
  status: StreamStatus | null;
  startedAt: number;
  sent: number;
  deviceId: string;
}

const FRAME_INTERVAL = 200;
const FRAME_WIDTH = 960;

const INITIAL: StreamSnapshot = {
  phase: "idle",
  error: "",
  link: "idle",
  status: null,
  startedAt: 0,
  sent: 0,
  deviceId: "",
};

/** Danh sách camera của máy này (tên chỉ hiện sau khi đã cho phép dùng camera). */
export async function listVideoInputs() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

function cameraError(error: unknown) {
  const name = error instanceof DOMException ? error.name : (error as Error)?.message;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Bạn chưa cho phép dùng camera. Bấm biểu tượng ổ khoá cạnh thanh địa chỉ, cho phép Camera rồi thử lại.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Không tìm thấy camera trên máy này. Hãy cắm webcam rồi thử lại.";
    case "NotReadableError":
    case "AbortError":
      return "Camera đang được ứng dụng khác sử dụng (Zoom, Meet…). Hãy đóng ứng dụng đó rồi thử lại.";
    case "unsupported":
      return "Trình duyệt này chưa hỗ trợ camera. Hãy mở bằng Chrome, Edge hoặc Safari phiên bản mới.";
    default:
      return "Không mở được camera. Vui lòng thử lại.";
  }
}

const CLOSE_MESSAGES: Record<number, string> = {
  4401: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi phát tiếp.",
  4403: "Chỉ quản trị viên mới phát được camera vào hệ thống.",
  4404: "Camera này không còn trong hệ thống (có thể đã bị xoá).",
  4409: "Camera đang tắt. Bật camera trong trang Camera rồi phát lại.",
};

export class StreamSession {
  private listeners = new Set<() => void>();
  private snapshot: StreamSnapshot = INITIAL;
  private stream: MediaStream | null = null;
  private ws: WebSocket | null = null;
  private preview: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private encoding = false;
  private wakeLock: WakeLockSentinel | null = null;
  private retry = 0;
  private active = false;
  private serverError = "";

  constructor(private readonly cameraId: string) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<StreamSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  /** Thẻ <video> xem trước do giao diện cung cấp. */
  attach = (video: HTMLVideoElement | null) => {
    this.preview = video;
    if (video && this.stream && video.srcObject !== this.stream) {
      video.srcObject = this.stream;
      void video.play().catch(() => {});
    }
  };

  async start(deviceId = "") {
    if (this.active) return;
    this.active = true;
    this.serverError = "";
    this.set({ ...INITIAL, phase: "starting", deviceId });
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) throw new Error("unsupported");
      this.stream = await this.open(deviceId);
    } catch (error) {
      this.active = false;
      this.set({ phase: "error", error: cameraError(error) });
      return;
    }
    if (!this.active) {
      this.stopTracks();
      return;
    }
    const used = this.stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId;
    this.attach(this.preview);
    this.set({ phase: "live", startedAt: Date.now(), deviceId: used });
    this.connect();
    this.frameTimer = setInterval(() => this.sendFrame(), FRAME_INTERVAL);
    void this.lockScreen();
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** Đổi sang webcam khác mà không ngắt phát. */
  async switchDevice(deviceId: string) {
    if (!this.active) return;
    try {
      const next = await this.open(deviceId);
      this.stopTracks();
      this.stream = next;
      if (this.preview) this.preview.srcObject = null;
      this.attach(this.preview);
      this.set({ deviceId });
    } catch (error) {
      this.set({ error: cameraError(error) });
    }
  }

  stop() {
    this.active = false;
    this.teardown();
    this.stopTracks();
    void this.releaseLock();
    this.set({ phase: "idle", link: "idle", status: null });
  }

  dispose() {
    if (this.active) this.stop();
  }

  // ------------------------------------------------------------------

  private async open(deviceId: string) {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 15, max: 30 },
      },
    });
  }

  private connect() {
    if (!this.active) return;
    this.set({ link: this.retry ? "retrying" : "connecting" });
    const ws = new WebSocket(wsUrl("/api/ws/stream", { camera: this.cameraId, device: deviceLabel() }));
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.set({ link: "open", error: "" });
    };

    ws.onmessage = (message) => {
      if (typeof message.data !== "string") return;
      let data: { type: string; [key: string]: unknown };
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      if (data.type === "status") this.set({ status: data as unknown as StreamStatus });
      else if (data.type === "error") this.serverError = String(data.message ?? "");
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.active) return;
      const fatal = CLOSE_MESSAGES[event.code];
      if (fatal) {
        this.fail(this.serverError || fatal);
        return;
      }
      // Máy khác vừa tiếp quản camera: dừng, không tự nối lại để khỏi giành qua giành lại
      if (this.serverError.includes("máy khác")) {
        this.fail(this.serverError);
        return;
      }
      const delay = Math.min(10000, 1000 * 2 ** this.retry);
      this.retry += 1;
      this.set({ link: "retrying" });
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    };
  }

  private fail(message: string) {
    this.stop();
    this.set({ phase: "error", error: message });
  }

  private sendFrame() {
    const ws = this.ws;
    const video = this.preview;
    if (!ws || ws.readyState !== WebSocket.OPEN || !video || video.readyState < 2 || this.encoding) return;
    if (ws.bufferedAmount > 1_000_000) return;

    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 480;
    const scale = Math.min(1, FRAME_WIDTH / sourceWidth);
    const width = Math.round(sourceWidth * scale);
    const height = Math.round(sourceHeight * scale);

    const canvas = this.canvas ?? (this.canvas = document.createElement("canvas"));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);

    this.encoding = true;
    canvas.toBlob(
      (blob) => {
        this.encoding = false;
        if (blob && this.ws === ws && ws.readyState === WebSocket.OPEN) {
          ws.send(blob);
          this.set({ sent: this.snapshot.sent + 1 });
        }
      },
      "image/jpeg",
      0.72,
    );
  }

  private teardown() {
    if (this.frameTimer) clearInterval(this.frameTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.frameTimer = null;
    this.reconnectTimer = null;
    document.removeEventListener("visibilitychange", this.onVisibility);
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close(1000);
    } catch {
      /* ignore */
    }
  }

  private stopTracks() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.preview) this.preview.srcObject = null;
  }

  private onVisibility = () => {
    if (document.visibilityState === "visible" && this.active) void this.lockScreen();
  };

  private async lockScreen() {
    try {
      if ("wakeLock" in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      }
    } catch {
      /* không giữ được màn hình sáng: không sao */
    }
  }

  private async releaseLock() {
    try {
      await this.wakeLock?.release();
    } catch {
      /* ignore */
    }
    this.wakeLock = null;
  }
}
