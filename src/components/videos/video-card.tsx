"use client";

import Link from "next/link";
import { Film, ShieldAlert } from "lucide-react";

import { mediaUrl } from "@/lib/api";
import { formatBytes, formatDuration, formatRelative } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/labels";
import type { Video } from "@/lib/types";
import { cn } from "@/lib/utils";

import { AiStatusBadge, StorageBadge, VerdictBadge } from "./video-bits";

export function VideoCard({ video }: { video: Video }) {
  const summary = video.ai_summary;
  return (
    <Link
      href={`/videos/${video.id}`}
      className={cn(
        "panel group block overflow-hidden transition-colors hover:border-line-strong",
        video.flagged && "border-critical/40",
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-[#050608]">
        {video.has_thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(`/api/videos/${video.id}/thumbnail`, { v: video.processed_at ?? "" })}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-mute">
            <Film className="size-7" />
          </div>
        )}
        <div className="scanlines absolute inset-0" />
        <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/80 uppercase">
          {SOURCE_LABELS[video.source]}
        </span>
        {video.duration > 0 && (
          <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[11px] text-white tabular">
            {formatDuration(video.duration)}
          </span>
        )}
        {video.flagged && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded bg-critical px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white uppercase">
            <ShieldAlert className="size-3" /> Dấu hiệu
          </span>
        )}
        {video.ai_status === "processing" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
            <div className="h-full bg-signal transition-[width] duration-500" style={{ width: `${video.ai_progress}%` }} />
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="truncate text-[13px] font-medium text-text" title={video.title}>
          {video.title}
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-mute">
          <span className="truncate">{video.camera_name || video.original_name}</span>
          <span className="shrink-0">{formatRelative(video.created_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {video.ai_status === "done" ? <VerdictBadge video={video} /> : <AiStatusBadge status={video.ai_status} progress={video.ai_progress} />}
          <StorageBadge storage={video.storage} />
          <span className="ml-auto font-mono text-[11px] text-mute">{formatBytes(video.size_bytes)}</span>
        </div>
        {summary && summary.segments.length > 0 && (
          <div className="text-[11px] text-dim">
            {summary.segments.length} đoạn nghi vấn · đỉnh {summary.max_bullying_confidence.toFixed(0)}%
          </div>
        )}
      </div>
    </Link>
  );
}
