"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mutate } from "swr";
import { toast } from "sonner";

import { mediaUrl } from "./api";
import { useConnection } from "./connection";
import { revalidate } from "./hooks";
import { EVENT_LABELS } from "./labels";
import type { AppEvent, Video } from "./types";

type Status = "idle" | "connecting" | "open" | "error";

interface RealtimeValue {
  status: Status;
  recent: AppEvent[];
}

const RealtimeContext = createContext<RealtimeValue>({ status: "idle", recent: [] });

export function useRealtime() {
  return useContext(RealtimeContext);
}

export const SOUND_KEY = "bds-alert-sound";

export function soundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Tiếng "bíp" 2 nhịp cho cảnh báo nghiêm trọng (Web Audio, không cần file âm thanh). */
export function playAlarm() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* trình duyệt chặn âm thanh khi chưa có thao tác người dùng */
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const baseUrl = useConnection((s) => s.baseUrl);
  const token = useConnection((s) => s.token);
  // Chỉ mở kênh realtime sau khi đăng nhập
  const signedIn = useConnection((s) => Boolean(s.user));
  const key = `${baseUrl}|${token}`;
  const [conn, setConn] = useState<{ key: string; status: Status }>({
    key: "",
    status: "idle",
  });
  const [recent, setRecent] = useState<AppEvent[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const status: Status = !baseUrl || !signedIn ? "idle" : conn.key === key ? conn.status : "connecting";

  useEffect(() => {
    if (!baseUrl || !signedIn) return;

    const pending = timers.current;

    // Gom nhiều tin nhắn liên tiếp thành 1 lần làm mới dữ liệu
    const refresh = (prefix: string, wait = 1200) => {
      if (pending.has(prefix)) return;
      pending.set(
        prefix,
        setTimeout(() => {
          pending.delete(prefix);
          revalidate(prefix);
        }, wait),
      );
    };

    const source = new EventSource(mediaUrl("/api/events/stream"));

    source.onopen = () => setConn({ key, status: "open" });
    source.onerror = () => setConn({ key, status: "error" });

    source.onmessage = (message) => {
      let payload: { type: string; data: unknown };
      try {
        payload = JSON.parse(message.data);
      } catch {
        return;
      }

      switch (payload.type) {
        case "event.created": {
          const event = payload.data as AppEvent;
          setRecent((list) => [event, ...list].slice(0, 30));
          refresh("/api/events", 300);
          refresh("/api/stats", 600);
          if (event.severity !== "info") {
            const notify = event.severity === "critical" ? toast.error : toast.warning;
            notify(event.title, {
              description: `${event.camera_name || "Camera"} · ${EVENT_LABELS[event.type]}`,
              duration: event.severity === "critical" ? 10000 : 6000,
            });
            if (event.severity === "critical" && soundEnabled()) playAlarm();
          }
          break;
        }
        case "event.updated":
        case "event.deleted":
        case "event.ack_all":
          refresh("/api/events", 300);
          refresh("/api/stats", 600);
          break;
        case "video.updated": {
          const video = payload.data as Video;
          // Chi tiết video: cập nhật ngay (giữ timeline đang có); danh sách: gom lại
          mutate(
            (k) => Array.isArray(k) && k[1] === `/api/videos/${video.id}`,
            (current: Video | undefined) =>
              current ? { ...current, ...video, ai_timeline: current.ai_timeline } : current,
            { revalidate: video.ai_status === "done" },
          );
          refresh("/api/videos");
          refresh("/api/storage", 2000);
          break;
        }
        case "video.deleted":
          refresh("/api/videos", 300);
          refresh("/api/storage", 1000);
          break;
        case "camera.status":
          refresh("/api/cameras", 300);
          break;
        case "settings.updated":
          refresh("/api/settings", 100);
          break;
      }
    };

    return () => {
      source.close();
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [baseUrl, key, signedIn]);

  return (
    <RealtimeContext.Provider value={{ status, recent }}>{children}</RealtimeContext.Provider>
  );
}
