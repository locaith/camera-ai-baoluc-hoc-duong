"use client";

import {
  AudioLines,
  Flag,
  MessageSquareWarning,
  Plug,
  ShieldAlert,
  Unplug,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { mediaUrl } from "@/lib/api";
import { formatRelative, formatTime } from "@/lib/format";
import { EVENT_LABELS, SEVERITY_LABELS } from "@/lib/labels";
import type { AppEvent, EventType, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

export const EVENT_ICONS: Record<EventType, LucideIcon> = {
  bullying: ShieldAlert,
  toxic_speech: MessageSquareWarning,
  high_anger: AudioLines,
  camera_offline: Unplug,
  camera_online: Plug,
  manual: Flag,
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone = { critical: "critical", warning: "warning", info: "info" } as const;
  return (
    <Badge tone={tone[severity]} dot>
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

export const SEVERITY_STRIPE: Record<Severity, string> = {
  critical: "bg-critical",
  warning: "bg-warning",
  info: "bg-info",
};

export function EventThumb({ event, className }: { event: AppEvent; className?: string }) {
  const Icon = EVENT_ICONS[event.type];
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded bg-bg", className)}>
      {event.has_snapshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(`/api/events/${event.id}/snapshot`)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center text-mute">
          <Icon className="size-5" />
        </div>
      )}
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", SEVERITY_STRIPE[event.severity])} />
    </div>
  );
}

/** Dòng sự kiện gọn (feed cảnh báo, dashboard). */
export function EventRow({
  event,
  onClick,
  compact,
}: {
  event: AppEvent;
  onClick?: () => void;
  compact?: boolean;
}) {
  const Icon = EVENT_ICONS[event.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition-colors",
        "hover:border-line hover:bg-panel-2/70",
        !event.acknowledged && event.severity !== "info" && "bg-panel-2/40",
      )}
    >
      <EventThumb event={event} className={compact ? "h-10 w-14" : "h-12 w-[72px]"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              event.severity === "critical"
                ? "text-critical"
                : event.severity === "warning"
                  ? "text-warning"
                  : "text-info",
            )}
          />
          <span className="truncate text-[13px] font-medium text-text">{EVENT_LABELS[event.type]}</span>
          {event.confidence !== null && event.type !== "camera_offline" && (
            <span className="font-mono text-[11px] text-mute tabular">{event.confidence.toFixed(0)}%</span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-dim">{event.camera_name || "—"}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-[11px] text-dim tabular">{formatTime(event.created_at)}</div>
        <div className="mt-0.5 text-[10px] text-mute">{formatRelative(event.created_at)}</div>
      </div>
    </button>
  );
}
