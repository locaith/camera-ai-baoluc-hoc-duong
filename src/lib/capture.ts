"use client";

import { toast } from "sonner";

import { uploadVideo, wsUrl } from "./api";
import type { LiveStatus, Video } from "./types";

/**
 * "Quay tại chỗ": camera của điện thoại/laptop hoạt động như một camera AI.
 *  - Gửi ~4 khung hình/giây về máy chủ qua WebSocket để AI phân tích trực tiếp
 *    (cảnh báo, ảnh chụp, clip bằng chứng y như camera cố định).
 *  - Đồng thời ghi video chất lượng đầy đủ trên máy, dừng quay thì tải lên để AI xem lại toàn bộ.
 */

export type CapturePhase = "idle" | "starting" | "live" | "finishing" | "uploading" | "done" | "error";

export type Facing = "environment" | "user";

export interface CaptureOptions {
  facing: Facing;
  record: boolean;
  audio: boolean;
}

export interface CaptureStatus extends LiveStatus {
  threshold: number;
}

export interface CaptureSnapshot {
  phase: CapturePhase;
  error: string;
  link: "idle" | "connecting" | "open" | "retrying";
  cameraName: string;
  /** Mỗi lần nối lại máy chủ cấp một mã camera mới */
  cameraIds: string[];
  status: CaptureStatus | null;
  startedAt: number;
  recording: boolean;
  recordedBytes: number;
  recordLimited: boolean;
  uploadProgress: number;
  video: Video | null;
  marks: number;
  facing: Facing;
  /** Còn bản quay chưa tải lên được (cho phép thử lại / lưu về máy) */
  hasPending: boolean;
}

const FRAME_INTERVAL = 250;
const FRAME_WIDTH = 960;
const MAX_RECORD_SECONDS = 20 * 60;
const MAX_RECORD_BYTES = 400 * 1024 * 1024;

const INITIAL: CaptureSnapshot = {
  phase: "idle",
  error: "",
  link: "idle",
  cameraName: "",
  cameraIds: [],
  status: null,
  startedAt: 0,
  recording: false,
  recordedBytes: 0,
  recordLimited: false,
  uploadProgress: 0,
  video: null,
  marks: 0,
  facing: "environment",
  hasPending: false,
};

export function deviceLabel() {
  if (typeof navigator === "undefined") return "Thiết bị";
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Điện thoại Android" : "Máy tính bảng";
  return "Máy tính";
}

export function captureSupported() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== "undefined" &&
    window.isSecureContext
  );
}

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function cameraError(error: unknown) {
  const name = error instanceof DOMException ? error.name : (error as Error)?.message;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Bạn chưa cho phép dùng camera. Hãy bấm biểu tượng ổ khoá cạnh thanh địa chỉ, cho phép Camera rồi thử lại.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Không tìm thấy camera trên thiết bị này.";
    case "NotReadableError":
    case "AbortError":
      return "Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.";
    case "unsupported":
      return "Trình duyệt này chưa hỗ trợ quay trực tiếp. Hãy mở bằng Chrome hoặc Safari phiên bản mới.";
    default:
      return "Không mở được camera. Vui lòng thử lại.";
  }
}

function stamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export class CaptureSession {
  private listeners = new Set<() => void>();
  private snapshot: CaptureSnapshot = INITIAL;
  private stream: MediaStream | null = null;
  private ws: WebSocket | null = null;
  private preview: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private encoding = false;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType = "";
  private pending: Blob | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private retry = 0;
  private active = false;
  private mounted = true;
  private serverError = "";
  private startedAt = new Date();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<CaptureSnapshot>) {
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

  async start(options: CaptureOptions) {
    if (this.active) return;
    this.active = true;
    this.mounted = true;
    this.pending = null;
    this.serverError = "";
    this.set({ ...INITIAL, phase: "starting", facing: options.facing });

    try {
      if (!captureSupported()) throw new Error("unsupported");
      this.stream = await this.openCamera(options.facing, options.record && options.audio);
    } catch (error) {
      this.active = false;
      this.set({ phase: "error", error: cameraError(error) });
      return;
    }

    if (!this.active) {
      // Người dùng rời trang khi đang xin quyền camera
      this.stopTracks();
      return;
    }

    this.attach(this.preview);
    this.startedAt = new Date();
    this.set({ phase: "live", startedAt: Date.now() });
    this.connect();
    this.frameTimer = setInterval(() => this.sendFrame(), FRAME_INTERVAL);
    if (options.record) this.startRecorder();
    void this.lockScreen();
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** Đổi camera trước/sau (chỉ khi không ghi video trên máy). */
  async switchCamera() {
    if (!this.active || this.recorder) return;
    const facing: Facing = this.snapshot.facing === "environment" ? "user" : "environment";
    try {
      const next = await this.openCamera(facing, false);
      this.stopTracks();
      this.stream = next;
      if (this.preview) this.preview.srcObject = null;
      this.attach(this.preview);
      this.set({ facing });
    } catch (error) {
      toast.error("Không đổi được camera", { description: cameraError(error) });
    }
  }

  mark(message = "") {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: "mark", message: message || "Người quay tại chỗ đánh dấu thời điểm này." }));
    return true;
  }

  /** Dừng quay; upload = gửi bản ghi trên máy lên để AI phân tích toàn bộ. */
  async stop(upload = true) {
    if (!this.active) return;
    this.active = false;
    this.teardownLive();
    this.set({ phase: "finishing", link: "idle", recording: false });

    const blob = await this.finishRecorder();
    this.stopTracks();
    void this.releaseLock();

    if (!upload || !blob || blob.size < 1024) {
      this.set({ phase: upload ? "done" : "idle" });
      return;
    }
    this.pending = blob;
    await this.upload();
  }

  async retryUpload() {
    if (this.pending) await this.upload();
  }

  /** Lưu bản quay về máy (khi mạng chập chờn, tải lên sau). */
  downloadPending() {
    if (!this.pending) return;
    const url = URL.createObjectURL(this.pending);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quay-tai-cho-${stamp(this.startedAt)}.${this.extension()}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  reset() {
    if (this.active) return;
    this.pending = null;
    this.set({ ...INITIAL, facing: this.snapshot.facing });
  }

  mount() {
    this.mounted = true;
  }

  /** Giao diện bị gỡ (rời trang): dừng camera; bản quay (nếu có) vẫn tiếp tục tải lên. */
  dispose() {
    this.mounted = false;
    if (this.active) void this.stop(true);
  }

  // ------------------------------------------------------------------

  private extension() {
    const type = this.pending?.type || this.mimeType;
    return type.includes("mp4") ? "mp4" : "webm";
  }

  private async upload() {
    const blob = this.pending;
    if (!blob) return;
    const name = this.snapshot.cameraName || deviceLabel();
    const at = this.startedAt;
    const time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}, ${at.getDate()}/${at.getMonth() + 1}`;
    this.set({ phase: "uploading", uploadProgress: 0, error: "", hasPending: true });

    const { promise } = uploadVideo(blob, (fraction) => this.set({ uploadProgress: fraction }), {
      filename: `quay-tai-cho-${stamp(this.startedAt)}.${this.extension()}`,
      title: `Quay tại chỗ · ${time}`,
      source: "phone",
      camera_name: name,
    });

    try {
      const video = await promise;
      this.pending = null;
      this.set({ phase: "done", video, uploadProgress: 1, hasPending: false });
      if (!this.mounted) {
        toast.success("Đã gửi bản quay", {
          description: "AI đang phân tích toàn bộ video, kết quả có trong mục Video.",
        });
      }
    } catch (error) {
      this.set({
        phase: "error",
        error: `Chưa gửi được bản quay: ${(error as Error).message}`,
        hasPending: true,
      });
      if (!this.mounted) toast.error("Chưa gửi được bản quay", { description: (error as Error).message });
    }
  }

  private async openCamera(facing: Facing, audio: boolean) {
    const video: MediaTrackConstraints = {
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    };
    try {
      return await navigator.mediaDevices.getUserMedia({ video, audio });
    } catch (error) {
      // Không có hoặc không cho dùng micro: vẫn quay hình
      if (audio) return navigator.mediaDevices.getUserMedia({ video, audio: false });
      throw error;
    }
  }

  private connect() {
    if (!this.active) return;
    this.set({ link: this.retry ? "retrying" : "connecting" });

    const ws = new WebSocket(wsUrl("/api/ws/capture", { device: deviceLabel() }));
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.set({ link: "open" });
    };

    ws.onmessage = (message) => {
      if (typeof message.data !== "string") return;
      let data: { type: string; [key: string]: unknown };
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      if (data.type === "hello") {
        const id = String(data.camera_id ?? "");
        this.set({
          cameraName: String(data.name ?? ""),
          cameraIds: id ? [...this.snapshot.cameraIds, id] : this.snapshot.cameraIds,
        });
      } else if (data.type === "status") {
        this.set({ status: data as unknown as CaptureStatus });
      } else if (data.type === "event") {
        this.set({ marks: this.snapshot.marks + 1 });
      } else if (data.type === "error") {
        this.serverError = String(data.message ?? "");
      }
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.active) return;
      if (event.code === 4401 || event.code === 4409) {
        this.fail(
          event.code === 4401
            ? "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi quay tiếp."
            : this.serverError || "Hệ thống đang bận, vui lòng thử lại sau.",
        );
        return;
      }
      const delay = Math.min(10000, 1000 * 2 ** this.retry);
      this.retry += 1;
      this.set({ link: "retrying" });
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    };
  }

  private fail(message: string) {
    toast.error(message);
    void this.stop(true).then(() => {
      if (this.snapshot.phase !== "uploading" && this.snapshot.phase !== "done") {
        this.set({ phase: "error", error: message });
      }
    });
  }

  private sendFrame() {
    const ws = this.ws;
    const video = this.preview;
    if (!ws || ws.readyState !== WebSocket.OPEN || !video || video.readyState < 2 || this.encoding) return;
    if (ws.bufferedAmount > 1_000_000 || document.visibilityState !== "visible") return;

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
        if (blob && this.ws === ws && ws.readyState === WebSocket.OPEN) ws.send(blob);
      },
      "image/jpeg",
      0.72,
    );
  }

  private startRecorder() {
    if (!this.stream || typeof MediaRecorder === "undefined") return;
    this.mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(this.stream, {
        ...(this.mimeType ? { mimeType: this.mimeType } : {}),
        videoBitsPerSecond: 2_000_000,
        audioBitsPerSecond: 64_000,
      });
    } catch {
      return;
    }
    this.recorder = recorder;
    this.chunks = [];
    recorder.ondataavailable = (event) => {
      if (!event.data.size) return;
      this.chunks.push(event.data);
      const bytes = this.snapshot.recordedBytes + event.data.size;
      this.set({ recordedBytes: bytes });
      const seconds = (Date.now() - this.snapshot.startedAt) / 1000;
      if ((bytes >= MAX_RECORD_BYTES || seconds >= MAX_RECORD_SECONDS) && recorder.state === "recording") {
        // Đủ dài: dừng ghi trên máy, AI trực tiếp vẫn tiếp tục
        recorder.stop();
        this.set({ recording: false, recordLimited: true });
      }
    };
    recorder.start(1000);
    this.set({ recording: true });
  }

  private finishRecorder() {
    const recorder = this.recorder;
    this.recorder = null;
    const build = () => {
      const chunks = this.chunks;
      this.chunks = [];
      return chunks.length ? new Blob(chunks, { type: recorder?.mimeType || this.mimeType || "video/webm" }) : null;
    };
    if (!recorder || recorder.state === "inactive") return Promise.resolve(build());
    return new Promise<Blob | null>((resolve) => {
      recorder.addEventListener("stop", () => setTimeout(() => resolve(build()), 0), { once: true });
      try {
        recorder.stop();
      } catch {
        resolve(build());
      }
    });
  }

  private teardownLive() {
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
