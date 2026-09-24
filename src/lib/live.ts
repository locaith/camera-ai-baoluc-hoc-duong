"use client";

import { useCallback, useSyncExternalStore } from "react";

import { wsUrl } from "./api";
import type { LiveStatus } from "./types";

/**
 * Một WebSocket dùng chung cho mọi ô camera đang hiển thị.
 * MJPEG qua <img> tốn 1 kết nối HTTP/ô và trình duyệt chỉ cho 6 kết nối/host,
 * nên lưới 9–16 camera phải dồn chung vào 1 socket.
 *
 * Tin nhắn nhị phân: [độ dài id][id camera][JPEG]; tin nhắn text: trạng thái AI mỗi 0.5s.
 */
type Listener = () => void;

interface Subscription {
  width: number;
  fps: number;
}

const decoder = new TextDecoder();

class LiveSocket {
  private ws: WebSocket | null = null;
  private subs = new Map<string, Map<symbol, Subscription>>();
  private frames = new Map<string, string>();
  private stale = new Map<string, string>();
  private statuses = new Map<string, LiveStatus>();
  private frameListeners = new Map<string, Set<Listener>>();
  private statusListeners = new Set<Listener>();
  private connListeners = new Set<Listener>();
  private retry = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private sent = "";
  private endpoint = "";

  threshold = 70;
  state: "idle" | "connecting" | "open" | "closed" = "idle";

  /** Gọi khi URL/token máy chủ thay đổi. */
  configure(endpoint: string) {
    if (endpoint === this.endpoint) return;
    this.endpoint = endpoint;
    this.teardown();
    if (this.cameraIds().length) this.connect();
  }

  subscribe(cameraId: string, width: number, fps: number) {
    const key = Symbol(cameraId);
    const entries = this.subs.get(cameraId) ?? new Map<symbol, Subscription>();
    entries.set(key, { width, fps });
    this.subs.set(cameraId, entries);

    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    if (!this.ws) this.connect();
    else this.sync();

    return () => {
      const current = this.subs.get(cameraId);
      current?.delete(key);
      if (current && current.size === 0) this.subs.delete(cameraId);
      this.sync();
      if (!this.cameraIds().length) {
        this.closeTimer = setTimeout(() => this.teardown(), 5000);
      }
    };
  }

  getFrame(cameraId: string) {
    return this.frames.get(cameraId) ?? null;
  }

  getStatus(cameraId: string) {
    return this.statuses.get(cameraId);
  }

  onFrame(cameraId: string, listener: Listener) {
    const set = this.frameListeners.get(cameraId) ?? new Set<Listener>();
    set.add(listener);
    this.frameListeners.set(cameraId, set);
    return () => set.delete(listener);
  }

  onStatus(listener: Listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onConnection(listener: Listener) {
    this.connListeners.add(listener);
    return () => this.connListeners.delete(listener);
  }

  private cameraIds() {
    return [...this.subs.keys()];
  }

  private params() {
    let width = 320;
    let fps = 4;
    for (const entries of this.subs.values()) {
      for (const sub of entries.values()) {
        width = Math.max(width, sub.width);
        fps = Math.max(fps, sub.fps);
      }
    }
    return { cams: this.cameraIds(), w: width, fps };
  }

  private setState(state: LiveSocket["state"]) {
    this.state = state;
    this.connListeners.forEach((l) => l());
  }

  private connect() {
    if (!this.endpoint || typeof window === "undefined") return;
    const { cams, w, fps } = this.params();

    this.setState("connecting");
    const ws = new WebSocket(
      wsUrl("/api/ws/live", { cams: cams.join(","), w, fps }),
    );
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    this.sent = JSON.stringify({ cams, w, fps });

    ws.onopen = () => {
      this.retry = 0;
      this.setState("open");
      this.sync();
    };

    ws.onmessage = (message) => {
      if (typeof message.data === "string") this.handleStatus(message.data);
      else this.handleFrame(message.data as ArrayBuffer);
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.setState("closed");
      if (!this.cameraIds().length) return;
      const delay = Math.min(15000, 1000 * 2 ** this.retry);
      this.retry += 1;
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    };
  }

  private teardown() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.setState("idle");
  }

  private sync() {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify(this.params());
    if (payload === this.sent) return;
    this.sent = payload;
    ws.send(payload);
  }

  private handleFrame(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const length = bytes[0];
    const cameraId = decoder.decode(bytes.subarray(1, 1 + length));
    const blob = new Blob([bytes.subarray(1 + length)], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);

    // Giữ lại 1 khung cũ để <img> đang tải không bị hỏng khi thu hồi URL
    const older = this.stale.get(cameraId);
    if (older) URL.revokeObjectURL(older);
    const previous = this.frames.get(cameraId);
    if (previous) this.stale.set(cameraId, previous);

    this.frames.set(cameraId, url);
    this.frameListeners.get(cameraId)?.forEach((l) => l());
  }

  private handleStatus(text: string) {
    try {
      const data = JSON.parse(text);
      if (data.type !== "status") return;
      if (typeof data.threshold === "number") this.threshold = data.threshold;
      for (const [id, status] of Object.entries(data.cameras ?? {})) {
        this.statuses.set(id, status as LiveStatus);
      }
      this.statusListeners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  }
}

export const liveSocket = new LiveSocket();

/** URL khung hình mới nhất của camera (object URL), tự đăng ký vào socket chung. */
export function useLiveFrame(cameraId: string | null, width = 640, fps = 8) {
  const subscribe = useCallback(
    (listener: Listener) => {
      if (!cameraId) return () => {};
      const unsubscribe = liveSocket.subscribe(cameraId, width, fps);
      const off = liveSocket.onFrame(cameraId, listener);
      return () => {
        off();
        unsubscribe();
      };
    },
    [cameraId, width, fps],
  );

  return useSyncExternalStore(
    subscribe,
    () => (cameraId ? liveSocket.getFrame(cameraId) : null),
    () => null,
  );
}

export function useLiveStatus(cameraId: string | null) {
  return useSyncExternalStore(
    (listener) => liveSocket.onStatus(listener),
    () => (cameraId ? liveSocket.getStatus(cameraId) : undefined),
    () => undefined,
  );
}

export function useLiveThreshold() {
  return useSyncExternalStore(
    (listener) => liveSocket.onStatus(listener),
    () => liveSocket.threshold,
    () => 70,
  );
}

export function useLiveConnection() {
  return useSyncExternalStore(
    (listener) => liveSocket.onConnection(listener),
    () => liveSocket.state,
    () => "idle" as const,
  );
}
