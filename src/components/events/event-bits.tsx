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
import { formatWhen } from "@/lib/format";
import { EVENT_LABELS, REVIEW_LABELS, SEVERITY_LABELS } from "@/lib/labels";
import type { AppEvent, EventType, ReviewStatus, Severity } from "@/lib/types";
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

export function ReviewBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  const tone = {
    new: "critical",
    confirmed: "warning",
    false_alarm: "neutral",
    resolved: "success",
  } as const;
  return (
    <Badge tone={tone[status]} dot pulse={status === "new"} className={className}>
      {REVIEW_LABELS[status]}
    </Badge>
  );
}

const ICON_TONE: Record<Severity, string> = {
  critical: "text-critical",
  warning: "text-warning",
  info: "text-info",
};

export function EventThumb({ event, className }: { event: AppEvent; className?: string }) {
  const Icon = EVENT_ICONS[event.type];
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-surface-3", className)}>
      {event.has_snapshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(`/api/events/${event.id}/snapshot`)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center">
          <Icon className={cn("size-5", ICON_TONE[event.severity])} strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}

/** Dòng sự việc gọn (tổng quan, trực tiếp). */
export function EventRow({
  event,
  onClick,
  compact,
}: {
  event: AppEvent;
  onClick?: () => void;
  /** Cột hẹp: thay nhãn trạng thái bằng chấm đỏ khi cần xem */
  compact?: boolean;
}) {
  const Icon = EVENT_ICONS[event.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-2xl p-2 text-left transition-colors hover:bg-surface-2"
    >
      <EventThumb event={event} className={compact ? "h-12 w-16" : "h-14 w-20"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("size-3.5 shrink-0", ICON_TONE[event.severity])} />
          <span className="truncate text-[14px] font-medium text-ink">{EVENT_LABELS[event.type]}</span>
          {compact && event.status === "new" && (
            <span className="size-1.5 shrink-0 rounded-full bg-critical" aria-label="Cần xem" />
          )}
          {event.confidence !== null && event.type === "bullying" && (
            <span className="text-xs text-ink-3 tabular">{event.confidence.toFixed(0)}%</span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[13px] text-ink-2">{event.camera_name || "—"}</div>
        <div className="mt-0.5 text-xs text-ink-3">{formatWhen(event.created_at)}</div>
      </div>
      {!compact && <ReviewBadge status={event.status} className="shrink-0" />}
    </button>
  );
}
