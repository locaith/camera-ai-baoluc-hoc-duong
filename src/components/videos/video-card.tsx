"use client";

import Link from "next/link";
import { Check, Clapperboard, ShieldAlert, Trash2 } from "lucide-react";

import { mediaUrl } from "@/lib/api";
import { formatDuration, formatWhen } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/labels";
import type { Video } from "@/lib/types";
import { cn } from "@/lib/utils";

import { AiStatusBadge, VerdictBadge } from "./video-bits";

const CARD =
  "group block overflow-hidden rounded-[20px] border bg-surface text-left shadow-soft transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-lift";

export function VideoCard({
  video,
  selectable,
  selected,
  onToggle,
  onDelete,
}: {
  video: Video;
  /** Chế độ chọn nhiều để xoá: bấm vào thẻ là chọn/bỏ chọn thay vì mở video */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** Có giá trị khi người dùng được phép xoá (quản trị viên) */
  onDelete?: () => void;
}) {
  const summary = video.ai_summary;

  const body = (
    <>
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
        <span className="absolute top-3 left-3 flex items-center gap-2">
          {selectable && (
            <span
              aria-hidden
              className={cn(
                "grid size-6 place-items-center rounded-full border-2 transition-colors",
                selected ? "border-white bg-brand text-white" : "border-white/85 bg-black/25",
              )}
            >
              {selected && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          )}
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            {SOURCE_LABELS[video.source]}
          </span>
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
        <div className="flex items-start gap-2">
          {selectable ? (
            <div className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink" title={video.title}>
              {video.title}
            </div>
          ) : (
            // Liên kết phủ cả thẻ (after:inset-0), nút xoá nằm trên nó nên không lồng thẻ tương tác
            <Link
              href={`/videos/${video.id}`}
              title={video.title}
              className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:ring-2 focus-visible:after:ring-brand/40"
            >
              {video.title}
            </Link>
          )}
          {onDelete && !selectable && (
            <button
              type="button"
              aria-label={`Xoá video ${video.title}`}
              title="Xoá video"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="relative z-10 -m-1.5 grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-critical-soft hover:text-critical focus-visible:bg-critical-soft focus-visible:text-critical sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          )}
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
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={Boolean(selected)}
        aria-label={`Chọn video ${video.title}`}
        onClick={onToggle}
        className={cn(CARD, "w-full", selected ? "border-brand ring-2 ring-brand/30" : "border-hairline")}
      >
        {body}
      </button>
    );
  }

  return <div className={cn(CARD, "relative border-hairline")}>{body}</div>;
}
