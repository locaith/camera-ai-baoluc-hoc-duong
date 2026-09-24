"use client";

import { useState } from "react";

import { formatDuration } from "@/lib/format";
import { classLabel } from "@/lib/labels";
import type { AiSegment, TimelineSample } from "@/lib/types";

/**
 * Dải thời gian AI: nhấn mạnh 1 màu (nghi bắt nạt), các lớp khác là xám.
 * Luôn có chú giải + tooltip + danh sách đoạn nghi vấn nên không phụ thuộc màu.
 */
const COLORS = {
  hit: "var(--series-bullying)",
  weak: "color-mix(in srgb, var(--series-bullying) 45%, var(--panel-3))",
  normal: "#39424d",
  other: "#5a6470",
};

function sampleColor(sample: TimelineSample, threshold: number) {
  if (sample.bullying) return sample.confidence >= threshold ? COLORS.hit : COLORS.weak;
  if (sample.class === "normal-interaction") return COLORS.normal;
  return COLORS.other;
}

export function AiTimeline({
  samples,
  segments,
  duration,
  threshold,
  interval,
  currentTime,
  onSeek,
}: {
  samples: TimelineSample[];
  segments: AiSegment[];
  duration: number;
  threshold: number;
  interval: number;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const [hover, setHover] = useState<{ x: number; sample: TimelineSample } | null>(null);
  const total = Math.max(duration, samples.length ? samples[samples.length - 1].t + interval : 1);

  function sampleAt(fraction: number) {
    const t = fraction * total;
    let best = samples[0];
    for (const s of samples) {
      if (s.t <= t) best = s;
      else break;
    }
    return best;
  }

  return (
    <div className="space-y-2.5">
      <div
        className="relative h-10 cursor-pointer overflow-hidden rounded-md border border-line bg-panel-3 select-none"
        role="slider"
        aria-label="Dòng thời gian phân tích AI"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onSeek(Math.min(total, currentTime + 5));
          if (e.key === "ArrowLeft") onSeek(Math.max(0, currentTime - 5));
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const fraction = (e.clientX - rect.left) / rect.width;
          const sample = sampleAt(fraction);
          if (sample) setHover({ x: e.clientX - rect.left, sample });
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - rect.left) / rect.width) * total);
        }}
      >
        <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox={`0 0 ${total} 10`}>
          {samples.map((sample, i) => {
            const next = samples[i + 1]?.t ?? sample.t + interval;
            return (
              <rect
                key={sample.t}
                x={sample.t}
                y={0}
                width={Math.max(0.01, next - sample.t)}
                height={10}
                fill={sampleColor(sample, threshold)}
              />
            );
          })}
        </svg>
        {segments.map((segment) => (
          <div
            key={segment.start}
            className="pointer-events-none absolute inset-y-0 border-x-2 border-critical"
            style={{
              left: `${(segment.start / total) * 100}%`,
              width: `${Math.max(0.4, ((segment.end - segment.start) / total) * 100)}%`,
            }}
          />
        ))}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{ left: `${Math.min(100, (currentTime / total) * 100)}%` }}
        />
        {hover && (
          <div
            className="pointer-events-none absolute -top-0.5 z-10 -translate-x-1/2 -translate-y-full rounded border border-line-strong bg-panel-3 px-2 py-1 text-[11px] whitespace-nowrap shadow-lg"
            style={{ left: hover.x }}
          >
            <span className="font-mono text-dim">{formatDuration(hover.sample.t)}</span>{" "}
            <span className="text-text">{classLabel(hover.sample.class)}</span>{" "}
            <span className="font-mono text-dim">{hover.sample.confidence.toFixed(0)}%</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS.hit }} /> Nghi bắt nạt ≥ {threshold}%
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS.weak }} /> Nghi bắt nạt (thấp)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS.normal }} /> Bình thường
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS.other }} /> Không rõ / khác
          </li>
        </ul>
        <span className="font-mono text-[11px] text-mute tabular">
          {formatDuration(currentTime)} / {formatDuration(total)}
        </span>
      </div>
    </div>
  );
}
