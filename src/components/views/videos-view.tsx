"use client";

import { useState } from "react";
import { ChevronDown, Film, Search, Upload } from "lucide-react";

import { UploadDropzone } from "@/components/videos/upload-dropzone";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { Empty, Skeleton } from "@/components/ui/feedback";
import { Input, Segmented, Select } from "@/components/ui/form";
import { query } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatBytes } from "@/lib/format";
import { useStorage, useVideos } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type Tab = "all" | "flagged" | "upload" | "recording" | "event";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "flagged", label: "Có dấu hiệu" },
  { value: "event", label: "Clip sự kiện" },
  { value: "recording", label: "Ghi thủ công" },
  { value: "upload", label: "Tải lên" },
];

export function VideosView() {
  const { isOperator } = useRole();
  const [tab, setTab] = useState<Tab>("all");
  const [storage, setStorage] = useState("");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(true);
  const [limit, setLimit] = useState(48);
  const { data: storageInfo } = useStorage();
  const [cameraFilter] = useState(() => new URLSearchParams(window.location.search).get("camera") ?? "");

  const { data, isValidating } = useVideos(
    query({
      source: tab === "all" || tab === "flagged" ? undefined : tab,
      flagged: tab === "flagged" ? true : undefined,
      storage,
      camera_id: cameraFilter,
      q: search.trim(),
      limit,
    }),
  );

  return (
    <div className="space-y-5">
      {isOperator && (
      <div className="panel overflow-hidden">
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={showUpload}
        >
          <span className="flex items-center gap-2.5">
            <Upload className="size-4 text-signal" />
            <span className="font-display text-[15px] font-semibold tracking-wide">Tải video lên để AI phân tích</span>
          </span>
          <span className="flex items-center gap-3 font-mono text-[11px] text-mute">
            {storageInfo &&
              `local ${formatBytes(storageInfo.local.bytes)} / ${formatBytes(storageInfo.local.limit_bytes)} · R2 ${formatBytes(storageInfo.r2.bytes)}`}
            <ChevronDown className={cn("size-4 transition-transform", showUpload && "rotate-180")} />
          </span>
        </button>
        {showUpload && (
          <div className="border-t border-line p-4">
            <UploadDropzone />
          </div>
        )}
      </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={tab} onChange={(v) => { setTab(v); setLimit(48); }} options={TABS} />
        <Select value={storage} onChange={(e) => setStorage(e.target.value)} aria-label="Nơi lưu">
          <option value="">Mọi nơi lưu</option>
          <option value="local">Local (bộ nhớ tạm)</option>
          <option value="r2">Cloudflare R2</option>
        </Select>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên video, camera…" className="pl-9" />
        </div>
      </div>

      {cameraFilter && (
        <p className="text-xs text-dim">
          Đang lọc theo camera <span className="font-mono text-text">{cameraFilter}</span>
        </p>
      )}

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3.4]" />
          ))}
        </div>
      ) : data.videos.length ? (
        <>
          <div className={cn("grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4", isValidating && "opacity-90")}>
            {data.videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          {data.videos.length < data.total && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setLimit(limit + 48)} loading={isValidating}>
                Tải thêm ({data.total - data.videos.length})
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="panel">
          <Empty icon={Film} title="Chưa có video">
            Clip sự kiện sẽ tự xuất hiện khi AI phát hiện bất thường. Bạn cũng có thể tải video lên ở trên.
          </Empty>
        </div>
      )}
    </div>
  );
}
