"use client";

import { useState } from "react";
import { Clapperboard, Search, Upload, X } from "lucide-react";

import { UploadDropzone } from "@/components/videos/upload-dropzone";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Empty, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { query } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { useVideos } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type Tab = "all" | "flagged" | "event" | "phone" | "recording" | "upload";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "flagged", label: "Có dấu hiệu" },
  { value: "event", label: "Clip sự việc" },
  { value: "phone", label: "Quay tại chỗ" },
  { value: "recording", label: "Ghi thủ công" },
  { value: "upload", label: "Tải lên" },
];

export function VideosView() {
  const { isOperator } = useRole();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [limit, setLimit] = useState(24);
  const [cameraFilter, setCameraFilter] = useState(
    () => new URLSearchParams(window.location.search).get("camera") ?? "",
  );

  const { data, isValidating } = useVideos(
    query({
      source: tab === "all" || tab === "flagged" ? undefined : tab,
      flagged: tab === "flagged" ? true : undefined,
      camera_id: cameraFilter,
      q: search.trim(),
      limit,
    }),
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hồ sơ"
        title="Video"
        description="Clip tự lưu khi có sự việc, video quay tại chỗ và video thầy cô tải lên — AI xem lại từng video và đánh dấu những đoạn cần chú ý."
        actions={
          isOperator && (
            <Button variant={showUpload ? "secondary" : "primary"} onClick={() => setShowUpload(!showUpload)}>
              {showUpload ? <X /> : <Upload />} {showUpload ? "Đóng" : "Tải video lên"}
            </Button>
          )
        }
      />

      {showUpload && isOperator && (
        <Card className="animate-rise">
          <UploadDropzone />
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="no-scrollbar -mx-4 max-w-[calc(100%+32px)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0">
          <div role="tablist" className="inline-flex gap-1 rounded-full border border-hairline bg-surface-3/70 p-1">
            {TABS.map((item) => (
              <button
                key={item.value}
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => {
                  setTab(item.value);
                  setLimit(24);
                }}
                className={cn(
                  "h-9 rounded-full px-4 text-[13.5px] font-medium whitespace-nowrap transition-all",
                  tab === item.value ? "bg-surface text-ink shadow-[0_1px_3px_rgb(22_24_29/0.12)]" : "text-ink-3 hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên video, camera…" className="pl-10" />
        </div>
      </div>

      {cameraFilter && (
        <button
          onClick={() => setCameraFilter("")}
          className="inline-flex items-center gap-2 rounded-full bg-surface-3 px-3.5 py-1.5 text-[13px] text-ink-2 hover:text-ink"
        >
          Đang lọc theo một camera <X className="size-3.5" />
        </button>
      )}

      {!data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3.3]" />
          ))}
        </div>
      ) : data.videos.length ? (
        <>
          <div className={cn("grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4", isValidating && "opacity-90")}>
            {data.videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          {data.videos.length < data.total && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setLimit(limit + 24)} loading={isValidating}>
                Xem thêm ({data.total - data.videos.length})
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <Empty icon={Clapperboard} title="Chưa có video">
            Clip sẽ tự xuất hiện khi AI phát hiện sự việc. Thầy cô cũng có thể quay tại chỗ hoặc tải video lên để AI phân
            tích.
          </Empty>
        </Card>
      )}
    </div>
  );
}
