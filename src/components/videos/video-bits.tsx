"use client";

import { Cloud, CloudUpload, HardDrive, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AI_STATUS_LABELS, SOURCE_LABELS, STORAGE_LABELS } from "@/lib/labels";
import type { AiStatus, StorageKind, Video, VideoSource } from "@/lib/types";

export function StorageBadge({ storage }: { storage: StorageKind }) {
  const Icon = storage === "r2" ? Cloud : storage === "uploading" ? CloudUpload : HardDrive;
  const tone = storage === "r2" ? "info" : storage === "uploading" ? "warning" : "neutral";
  return (
    <Badge tone={tone}>
      <Icon className={storage === "uploading" ? "animate-breathe" : undefined} />
      {STORAGE_LABELS[storage]}
    </Badge>
  );
}

export function AiStatusBadge({ status, progress }: { status: AiStatus; progress?: number }) {
  if (status === "processing") {
    return (
      <Badge tone="brand">
        <LoaderCircle className="animate-spin" />
        {progress ? `Đang phân tích ${progress.toFixed(0)}%` : AI_STATUS_LABELS.processing}
      </Badge>
    );
  }
  const tone = {
    pending: "neutral",
    done: "neutral",
    failed: "critical",
    recording: "critical",
  } as const;
  return (
    <Badge tone={tone[status]} dot={status === "recording"} pulse={status === "recording"}>
      {AI_STATUS_LABELS[status]}
    </Badge>
  );
}

export function SourceBadge({ source }: { source: VideoSource }) {
  return <Badge tone={source === "phone" ? "gold" : "outline"}>{SOURCE_LABELS[source]}</Badge>;
}

/** Kết luận AI: có dấu hiệu / cần xem lại / bình thường (luôn kèm chữ, không chỉ màu). */
export function VerdictBadge({ video }: { video: Video }) {
  const summary = video.ai_summary;
  if (video.ai_status !== "done" || !summary) return null;
  if (summary.flagged) return <Badge tone="critical" dot>Có dấu hiệu bắt nạt</Badge>;
  if (summary.segments.length) return <Badge tone="warning" dot>Nên xem lại</Badge>;
  return <Badge tone="success" dot>Bình thường</Badge>;
}
