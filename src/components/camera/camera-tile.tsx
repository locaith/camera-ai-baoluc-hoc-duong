"use client";

import { ShieldAlert, Smartphone, VideoOff, Webcam, WifiOff } from "lucide-react";

import { STATE_LABELS } from "@/lib/labels";
import { useLiveFrame, useLiveStatus, useLiveThreshold } from "@/lib/live";
import type { Camera } from "@/lib/types";
import { cn } from "@/lib/utils";

import { VuMeter, aiVerdict, riskOf } from "./camera-bits";

interface CameraTileProps {
  camera: Camera;
  width?: number;
  fps?: number;
  size?: "sm" | "md" | "lg";
  hud?: boolean;
  onSelect?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const PILL = {
  success: "bg-black/35 text-white",
  warning: "bg-[#b54708]/85 text-white",
  critical: "bg-critical text-white",
  neutral: "bg-black/35 text-white/80",
} as const;

const DOT = {
  success: "bg-[#5ee0a0]",
  warning: "bg-white",
  critical: "bg-white animate-breathe",
  neutral: "bg-white/60",
} as const;

export function CameraTile({
  camera,
  width = 640,
  fps = 8,
  size = "md",
  hud = true,
  onSelect,
  actions,
  className,
}: CameraTileProps) {
  const frame = useLiveFrame(camera.enabled ? camera.id : null, width, fps);
  const live = useLiveStatus(camera.id);
  const threshold = useLiveThreshold();

  const state = live?.state ?? camera.state;
  const analysis = live?.analysis ?? camera.analysis;
  const recording = live?.recording ?? Boolean(camera.recording);
  const audio = live?.audio_level ?? camera.audio.level;
  const hasAudio = live?.has_audio ?? camera.has_audio;
  const online = state === "online";
  const verdict = aiVerdict(analysis, threshold);
  const alarm = online && camera.ai_enabled && verdict.level === 2;
  const risk = riskOf(analysis);
  const small = size === "sm";

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-[18px] bg-frame ring-1 ring-black/5",
        onSelect && "cursor-pointer",
        alarm && "alarm-ring",
        className,
      )}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={onSelect ? `Mở ${camera.name}` : undefined}
    >
      {frame && online ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame}
          alt={`Hình ảnh trực tiếp ${camera.name}`}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#1c1f27,#0e0f12_70%)]">
          <div className="flex flex-col items-center gap-2.5 px-6 text-center">
            {state === "connecting" || (online && !frame) ? (
              <span className="size-6 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
            ) : state === "error" ? (
              <WifiOff className="size-6 text-white/50" strokeWidth={1.5} />
            ) : (
              <VideoOff className="size-6 text-white/40" strokeWidth={1.5} />
            )}
            <span className={cn("text-white/60", small ? "text-[11px]" : "text-[13px]")}>
              {online ? "Đang nhận hình…" : camera.enabled ? STATE_LABELS[state] : "Camera đã tắt"}
            </span>
          </div>
        </div>
      )}

      {/* ------- tên + trạng thái ------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-linear-to-b from-black/60 via-black/20 to-transparent px-3.5 pt-3 pb-8">
        <div className="min-w-0">
          <div className={cn("flex items-center gap-1.5 truncate font-medium text-white", small ? "text-[12px]" : "text-[14px]")}>
            {camera.virtual && <Smartphone className="size-3.5 shrink-0 text-white/80" />}
            {camera.source === "webcam" && <Webcam className="size-3.5 shrink-0 text-white/80" />}
            <span className="truncate">{camera.name}</span>
          </div>
          {!small && camera.location && (
            <div className="mt-0.5 truncate text-[11.5px] text-white/60">{camera.location}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {recording && (
            <span className="flex items-center gap-1 rounded-full bg-critical px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-white">
              <span className="size-1.5 animate-breathe rounded-full bg-white" />
              GHI
            </span>
          )}
          {online && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-[#5ee0a0]" />
              Trực tiếp
            </span>
          )}
        </div>
      </div>

      {/* ------- cảnh báo ------- */}
      {alarm && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-4">
          <span
            className={cn(
              "flex items-center gap-2 rounded-full bg-critical px-4 py-2 font-medium text-white shadow-lift",
              small ? "text-[11px]" : "text-[13px]",
            )}
          >
            <ShieldAlert className="size-4" />
            Phát hiện dấu hiệu bắt nạt
          </span>
        </div>
      )}

      {/* ------- nhận định AI ------- */}
      {hud && online && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-linear-to-t from-black/55 to-transparent px-3.5 pt-10 pb-3">
          {camera.ai_enabled ? (
            <div className="min-w-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium backdrop-blur-md",
                  small ? "text-[10.5px]" : "text-[12px]",
                  PILL[verdict.tone],
                )}
              >
                <span className={cn("size-1.5 rounded-full", DOT[verdict.tone])} />
                {verdict.label}
                {analysis && verdict.level > 0 && <span className="tabular opacity-80">{risk.toFixed(0)}%</span>}
              </span>
              {!small && (
                <div className="mt-2 h-0.75 w-36 overflow-hidden rounded-full bg-white/15">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      verdict.level === 2 ? "bg-[#ff8a7a]" : verdict.level === 1 ? "bg-[#ffc37a]" : "bg-white/80",
                    )}
                    style={{ width: `${Math.max(2, risk)}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur-md">AI đang tắt</span>
          )}
          {hasAudio && <VuMeter level={audio} />}
        </div>
      )}

      {actions && (
        <div className="absolute top-12 right-3 flex flex-col gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}
