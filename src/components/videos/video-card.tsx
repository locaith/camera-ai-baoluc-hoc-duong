"use client";

import Link from "next/link";
import { Clapperboard, ShieldAlert } from "lucide-react";

import { mediaUrl } from "@/lib/api";
import { formatDuration, formatWhen } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/labels";
import type { Video } from "@/lib/types";

import { AiStatusBadge, VerdictBadge } from "./video-bits";

export function VideoCard({ video }: { video: Video }) {
  const summary = video.ai_summary;
  return (
    <Link
      href={`/videos/${video.id}`}
      className="group block overflow-hidden rounded-[20px] border border-hairline bg-surface shadow-soft transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-video overflow-hidden bg-frame">
        {video.has_thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(`/api/videos/${video.id}/thumbnail`, { v: video.processed_at ?? "" })}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-white/35">
            <Clapperboard className="size-7" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {SOURCE_LABELS[video.source]}
        </span>
        {video.duration > 0 && (
          <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white tabular backdrop-blur-md">
            {formatDuration(video.duration)}
          </span>
        )}
        {video.flagged && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-critical px-2.5 py-1 text-[11px] font-medium text-white">
            <ShieldAlert className="size-3.5" /> Có dấu hiệu
          </span>
        )}
        {video.ai_status === "processing" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div className="h-full bg-white transition-[width] duration-500" style={{ width: `${video.ai_progress}%` }} />
          </div>
        )}
      </div>
      <div className="space-y-2.5 p-4">
        <div className="truncate text-[15px] font-medium text-ink" title={video.title}>
          {video.title}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
          <span className="truncate">{video.camera_name || video.original_name}</span>
          <span className="shrink-0">{formatWhen(video.created_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {video.ai_status === "done" ? <VerdictBadge video={video} /> : <AiStatusBadge status={video.ai_status} progress={video.ai_progress} />}
          {summary && summary.segments.length > 0 && (
            <span className="text-xs text-ink-3">{summary.segments.length} đoạn cần chú ý</span>
          )}
        </div>
      </div>
    </Link>
  );
}
