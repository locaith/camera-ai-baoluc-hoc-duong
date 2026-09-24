"use client";

import { Badge } from "@/components/ui/badge";
import { STATE_LABELS } from "@/lib/labels";
import type { CameraState } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CameraStateBadge({ state }: { state: CameraState }) {
  const tone = {
    online: "good",
    connecting: "warning",
    error: "critical",
    offline: "neutral",
  } as const;
  return (
    <Badge tone={tone[state]} dot pulse={state === "online" || state === "connecting"}>
      {STATE_LABELS[state]}
    </Badge>
  );
}

/** VU-meter 5 vạch cho mức âm thanh (0–100). */
export function VuMeter({ level, className }: { level: number; className?: string }) {
  const bars = [8, 22, 40, 60, 80];
  return (
    <div className={cn("flex h-3.5 items-end gap-[2px]", className)} aria-label={`Âm thanh ${level.toFixed(0)}%`}>
      {bars.map((threshold, i) => (
        <span
          key={threshold}
          className={cn(
            "w-[3px] rounded-[1px] transition-colors duration-150",
            level >= threshold
              ? i >= 4
                ? "bg-critical"
                : i >= 3
                  ? "bg-warning"
                  : "bg-good"
              : "bg-white/15",
          )}
          style={{ height: `${30 + i * 17}%` }}
        />
      ))}
    </div>
  );
}
