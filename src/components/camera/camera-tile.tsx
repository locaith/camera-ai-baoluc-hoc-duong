"use client";

import { AlertOctagon, ScanEye, VideoOff, WifiOff } from "lucide-react";

import { formatTimecode, useNowSeconds } from "@/lib/clock";
import { classLabel, STATE_LABELS } from "@/lib/labels";
import { useLiveFrame, useLiveStatus, useLiveThreshold } from "@/lib/live";
import type { Camera } from "@/lib/types";
import { cn } from "@/lib/utils";

import { VuMeter } from "./camera-bits";

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

function Timecode() {
  const now = useNowSeconds();
  return <span className="tabular">{formatTimecode(now)}</span>;
}

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
  const alarm = online && camera.ai_enabled && Boolean(analysis?.bullying) && (analysis?.confidence ?? 0) >= threshold;
  // Thanh rủi ro = xác suất lớp "nghi bắt nạt" (kể cả khi lớp khác đứng đầu)
  const risk = analysis?.risk ?? (analysis?.bullying ? analysis.confidence : 0);

  const text = {
    sm: { name: "text-[12px]", meta: "text-[9px]", hud: "text-[11px]" },
    md: { name: "text-[13px]", meta: "text-[10px]", hud: "text-xs" },
    lg: { name: "text-[15px]", meta: "text-[11px]", hud: "text-sm" },
  }[size];

  return (
    <div
      className={cn(
        "brackets group relative aspect-video overflow-hidden rounded-lg border border-line bg-[#050608]",
        onSelect && "cursor-pointer",
        alarm && "alarm",
        className,
      )}
      style={
        {
          "--bracket": alarm ? "var(--critical)" : online ? "rgba(52,211,153,0.65)" : undefined,
        } as React.CSSProperties
      }
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
          className="absolute inset-0 size-full object-contain"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 10px, transparent 10px 20px)",
          }}
        >
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            {state === "connecting" || (online && !frame) ? (
              <span className="size-6 animate-spin rounded-full border-2 border-signal/20 border-t-signal" />
            ) : state === "error" ? (
              <WifiOff className="size-6 text-critical" />
            ) : (
              <VideoOff className="size-6 text-mute" />
            )}
            <span className={cn("font-mono tracking-widest text-dim uppercase", text.meta)}>
              {online ? "Đang nhận hình" : camera.enabled ? STATE_LABELS[state] : "Camera đã tắt"}
            </span>
            {state === "error" && camera.error && size !== "sm" && (
              <span className="line-clamp-2 max-w-xs font-mono text-[10px] text-mute">
                {camera.error}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="scanlines pointer-events-none absolute inset-0" />

      {/* ------- top bar ------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent px-3 pt-2.5 pb-6">
        <div className="min-w-0">
          <div className={cn("truncate font-display font-semibold tracking-wide text-white", text.name)}>
            {camera.name}
          </div>
          {size !== "sm" && (
            <div className={cn("mt-0.5 truncate font-mono text-white/55", text.meta)}>
              {camera.location || camera.id} · <Timecode />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {recording && (
            <span className={cn("flex items-center gap-1 rounded bg-critical px-1.5 py-0.5 font-mono font-semibold text-white", text.meta)}>
              <span className="size-1.5 animate-pulse-soft rounded-full bg-white" />
              REC
            </span>
          )}
          {online && (
            <span className={cn("flex items-center gap-1 rounded border border-good/40 bg-black/40 px-1.5 py-0.5 font-mono font-semibold text-good", text.meta)}>
              <span className="size-1.5 animate-pulse-soft rounded-full bg-good" />
              LIVE
              {size !== "sm" && live?.fps ? <span className="text-white/50">{live.fps.toFixed(0)}fps</span> : null}
            </span>
          )}
        </div>
      </div>

      {/* ------- alarm banner ------- */}
      {alarm && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
          <span className={cn("flex items-center gap-2 rounded bg-critical/90 px-3 py-1.5 font-display font-bold tracking-[0.18em] text-white uppercase shadow-lg shadow-critical/30", size === "sm" ? "text-[10px]" : "text-xs")}>
            <AlertOctagon className="size-4" />
            Phát hiện bắt nạt
          </span>
        </div>
      )}

      {/* ------- AI HUD ------- */}
      {hud && online && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pt-8 pb-2.5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              {camera.ai_enabled ? (
                <>
                  <div className={cn("flex items-center gap-1.5 text-white", text.hud)}>
                    <ScanEye className={cn("size-3.5 shrink-0", alarm ? "text-critical" : "text-signal")} />
                    <span className="truncate font-medium">{classLabel(analysis?.class)}</span>
                    {analysis && (
                      <span className="font-mono text-white/60 tabular">{analysis.confidence.toFixed(0)}%</span>
                    )}
                  </div>
                  <div className="mt-1.5 h-[3px] w-full max-w-48 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300",
                        risk >= threshold ? "bg-critical" : "bg-warning",
                      )}
                      style={{ width: `${risk}%` }}
                    />
                  </div>
                </>
              ) : (
                <span className={cn("font-mono text-white/50 uppercase", text.meta)}>AI tắt</span>
              )}
            </div>
            {hasAudio && <VuMeter level={audio} />}
          </div>
        </div>
      )}

      {actions && (
        <div className="absolute top-12 right-2.5 flex flex-col gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}
