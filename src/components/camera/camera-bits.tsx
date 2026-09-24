"use client";

import { Badge } from "@/components/ui/badge";
import { STATE_LABELS } from "@/lib/labels";
import type { Analysis, CameraState } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CameraStateBadge({ state, className }: { state: CameraState; className?: string }) {
  const tone = {
    online: "success",
    connecting: "warning",
    error: "critical",
    offline: "neutral",
  } as const;
  return (
    <Badge tone={tone[state]} dot pulse={state === "connecting"} className={className}>
      {STATE_LABELS[state]}
    </Badge>
  );
}

/** Mức nguy cơ hiện tại của 1 camera = xác suất lớp "nghi bắt nạt". */
export function riskOf(analysis?: Pick<Analysis, "bullying" | "confidence" | "risk"> | null) {
  if (!analysis) return 0;
  return analysis.risk ?? (analysis.bullying ? analysis.confidence : 0);
}

/** Nhận định dễ hiểu cho giáo viên: Bình thường / Cần chú ý / Nghi bắt nạt. */
export function aiVerdict(
  analysis: Pick<Analysis, "bullying" | "confidence" | "risk"> | null | undefined,
  threshold: number,
) {
  if (!analysis) return { label: "Đang quan sát", tone: "neutral" as const, level: 0 };
  const risk = riskOf(analysis);
  if (analysis.bullying && analysis.confidence >= threshold)
    return { label: "Nghi bắt nạt", tone: "critical" as const, level: 2 };
  if (risk >= threshold * 0.6) return { label: "Cần chú ý", tone: "warning" as const, level: 1 };
  return { label: "Bình thường", tone: "success" as const, level: 0 };
}

/** VU-meter 5 vạch cho mức âm thanh (0–100), dùng trên nền video tối. */
export function VuMeter({ level, className }: { level: number; className?: string }) {
  const bars = [8, 22, 40, 60, 80];
  return (
    <div className={cn("flex h-3.5 items-end gap-0.5", className)} aria-label={`Âm thanh ${level.toFixed(0)}%`}>
      {bars.map((threshold, i) => (
        <span
          key={threshold}
          className={cn(
            "w-0.75 rounded-full transition-colors duration-150",
            level >= threshold ? (i >= 4 ? "bg-[#ff8a7a]" : i >= 3 ? "bg-[#ffc37a]" : "bg-white") : "bg-white/20",
          )}
          style={{ height: `${30 + i * 17}%` }}
        />
      ))}
    </div>
  );
}
