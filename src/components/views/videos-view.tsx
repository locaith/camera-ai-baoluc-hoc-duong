"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Clapperboard, Search, Trash2, Upload, X } from "lucide-react";

import { UploadDropzone } from "@/components/videos/upload-dropzone";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Confirm, Empty, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { api, query } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { revalidate, useVideos } from "@/lib/hooks";
import type { Video } from "@/lib/types";
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
  const { isAdmin, isOperator } = useRole();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState<Video[] | null>(null);
  const [busy, setBusy] = useState(false);
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

  const videos = data?.videos ?? [];

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function removeVideos(list: Video[]) {
    setBusy(true);
    let done = 0;
    const failed: string[] = [];
    for (const video of list) {
      try {
        await api(`/api/videos/${video.id}`, { method: "DELETE" });
        done += 1;
      } catch {
        failed.push(video.title);
      }
    }
    setBusy(false);
    setDeleting(null);
    revalidate("/api/videos");
    revalidate("/api/storage");
    if (done) toast.success(done === 1 ? "Đã xoá video" : `Đã xoá ${done} video`);
    if (failed.length) toast.error(`Chưa xoá được ${failed.length} video`, { description: failed.slice(0, 3).join(", ") });
    stopSelecting();
  }

  const selectedVideos = videos.filter((video) => selected.has(video.id));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hồ sơ"
        title="Video"
        description="Clip tự lưu khi có sự việc, video quay tại chỗ và video thầy cô tải lên — AI xem lại từng video và đánh dấu những đoạn cần chú ý."
        actions={
          (isOperator || isAdmin) && (
            <div className="flex flex-wrap gap-2">
              {isAdmin && videos.length > 0 && (
                <Button variant="secondary" onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
                  {selecting ? <X /> : <CheckSquare />} {selecting ? "Thôi chọn" : "Chọn để xoá"}
                </Button>
              )}
              {isOperator && !selecting && (
                <Button variant={showUpload ? "secondary" : "primary"} onClick={() => setShowUpload(!showUpload)}>
                  {showUpload ? <X /> : <Upload />} {showUpload ? "Đóng" : "Tải video lên"}
                </Button>
              )}
            </div>
          )
        }
      />

      {selecting && (
        <div className="sticky top-[calc(env(safe-area-inset-top,0px)+12px)] z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface/95 px-4 py-3 shadow-soft backdrop-blur-md">
          <span className="text-sm text-ink-2">
            {selected.size ? (
              <>
                Đã chọn <b className="text-ink tabular">{selected.size}</b> video
              </>
            ) : (
              "Bấm vào các video muốn xoá"
            )}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(selected.size === videos.length ? new Set() : new Set(videos.map((video) => video.id)))}
            >
              {selected.size === videos.length ? "Bỏ chọn tất cả" : `Chọn tất cả (${videos.length})`}
            </Button>
            <Button size="sm" variant="danger-solid" disabled={!selected.size} onClick={() => setDeleting(selectedVideos)}>
              <Trash2 /> Xoá {selected.size ? selected.size : ""} video
            </Button>
          </div>
        </div>
      )}

      {showUpload && isOperator && !selecting && (
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
              <VideoCard
                key={video.id}
                video={video}
                selectable={selecting}
                selected={selected.has(video.id)}
                onToggle={() => toggle(video.id)}
                onDelete={isAdmin ? () => setDeleting([video]) : undefined}
              />
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

      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && !busy && setDeleting(null)}
        title={deleting && deleting.length > 1 ? `Xoá ${deleting.length} video?` : "Xoá video này?"}
        description={
          deleting && deleting.length > 1
            ? "Các video đã chọn cùng kết quả AI xem lại sẽ bị xoá vĩnh viễn và không thể khôi phục."
            : `“${deleting?.[0]?.title ?? ""}” cùng kết quả AI xem lại sẽ bị xoá vĩnh viễn và không thể khôi phục.`
        }
        confirmLabel="Xoá vĩnh viễn"
        danger
        loading={busy}
        onConfirm={() => deleting && void removeVideos(deleting)}
      />
    </div>
  );
}
