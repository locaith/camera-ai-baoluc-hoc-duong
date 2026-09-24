"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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

export const SOUND_KEY = "camera-ai-alert-sound";

export function soundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Tiếng chuông 2 nốt nhẹ cho sự việc nghiêm trọng (Web Audio, không cần file âm thanh). */
export function playAlarm() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [
      { at: 0, freq: 880 },
      { at: 0.28, freq: 660 },
    ].forEach(({ at, freq }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.55);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* trình duyệt chặn âm thanh khi chưa có thao tác người dùng */
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const baseUrl = useConnection((s) => s.baseUrl);
  const token = useConnection((s) => s.token);
  // Chỉ mở kênh realtime sau khi đăng nhập
  const signedIn = useConnection((s) => Boolean(s.user));
  const isAdmin = useConnection((s) => s.user?.role === "admin");
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
              duration: event.severity === "critical" ? 12000 : 7000,
              action: {
                label: "Xem",
                onClick: () => router.push(`/incidents?focus=${event.id}`),
              },
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
        case "discovery.updated": {
          const data = payload.data as { new: number; total: number };
          refresh("/api/cameras/discovered", 200);
          if (isAdmin && data.new > 0) {
            toast.info(`Tìm thấy ${data.new} camera trong mạng của trường`, {
              description: "Có thể kết nối ngay để AI bắt đầu giám sát.",
              duration: 10000,
              action: { label: "Xem", onClick: () => router.push("/cameras") },
            });
          }
          break;
        }
      }
    };

    return () => {
      source.close();
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [baseUrl, key, signedIn, isAdmin, router]);

  return (
    <RealtimeContext.Provider value={{ status, recent }}>{children}</RealtimeContext.Provider>
  );
}
