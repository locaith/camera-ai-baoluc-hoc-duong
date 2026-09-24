"use client";

import { useState } from "react";

import { formatDuration } from "@/lib/format";
import { classLabel } from "@/lib/labels";
import type { AiSegment, TimelineSample } from "@/lib/types";

/**
 * Dải thời gian AI: nhấn mạnh 1 màu (nghi bắt nạt), các lớp khác là trung tính.
 * Luôn có chú giải + tooltip + danh sách đoạn nghi vấn nên không phụ thuộc màu.
 */
const COLORS = {
  hit: "var(--series-bullying)",
  weak: "#f4b89c",
  normal: "#dcd6c9",
  other: "#b9b1a0",
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
    <div className="space-y-3">
      <div
        className="relative h-12 cursor-pointer overflow-hidden rounded-xl bg-surface-3 select-none"
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
          const sample = sampleAt((e.clientX - rect.left) / rect.width);
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
            className="pointer-events-none absolute inset-y-0 border-x-2 border-critical/80"
            style={{
              left: `${(segment.start / total) * 100}%`,
              width: `${Math.max(0.4, ((segment.end - segment.start) / total) * 100)}%`,
            }}
          />
        ))}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink"
          style={{ left: `${Math.min(100, (currentTime / total) * 100)}%` }}
        />
        {hover && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1 text-[11.5px] whitespace-nowrap text-white shadow-lift"
            style={{ left: Math.max(60, hover.x) }}
          >
            <span className="tabular opacity-70">{formatDuration(hover.sample.t)}</span> {classLabel(hover.sample.class)}{" "}
            <span className="tabular opacity-70">{hover.sample.confidence.toFixed(0)}%</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS.hit }} /> Nghi bắt nạt ≥ {threshold}%
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS.weak }} /> Nghi bắt nạt (thấp)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm ring-1 ring-hairline-2" style={{ background: COLORS.normal }} /> Bình thường
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLORS.other }} /> Chưa rõ
          </li>
        </ul>
        <span className="text-xs text-ink-3 tabular">
          {formatDuration(currentTime)} / {formatDuration(total)}
        </span>
      </div>
    </div>
  );
}
