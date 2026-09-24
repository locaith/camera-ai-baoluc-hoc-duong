"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CloudUpload,
  Download,
  Film,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AiTimeline } from "@/components/videos/ai-timeline";
import { AiStatusBadge, SourceBadge, StorageBadge, VerdictBadge } from "@/components/videos/video-bits";
import { Button } from "@/components/ui/button";
import { Confirm, Empty, Meter, Skeleton } from "@/components/ui/feedback";
import { SectionTitle } from "@/components/ui/stat-tile";
import { api, mediaUrl } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/format";
import { revalidate, useStorage, useVideo } from "@/lib/hooks";
import { classLabel, EVENT_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[13px]">
      <span className="shrink-0 text-dim">{label}</span>
      <span className="min-w-0 text-right break-all text-text">{children}</span>
    </div>
  );
}

export function VideoDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: video, error, mutate } = useVideo(id);
  const { isAdmin, isOperator } = useRole();
  const { data: storage } = useStorage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (error) {
    return (
      <div className="panel">
        <Empty
          icon={Film}
          title="Không tìm thấy video"
          action={
            <Button onClick={() => router.push("/videos")}>
              <ArrowLeft /> Về kho video
            </Button>
          }
        >
          {error.message}
        </Empty>
      </div>
    );
  }

  if (!video) return <Skeleton className="h-[70vh]" />;

  const summary = video.ai_summary;
  const timeline = video.ai_timeline ?? [];
  const interval = summary ? 1 / summary.sample_fps : 0.5;

  function seek(t: number) {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = t;
    setCurrentTime(t);
    void el.play().catch(() => {});
  }

  async function run(action: string, fn: () => Promise<unknown>, success: string) {
    setBusy(action);
    try {
      await fn();
      toast.success(success);
      await mutate();
      revalidate("/api/videos");
      revalidate("/api/storage");
    } catch (e) {
      toast.error("Thao tác thất bại", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(`/api/videos/${video!.id}`, { method: "DELETE" });
      toast.success("Đã xoá video");
      revalidate("/api/videos");
      router.push("/videos");
    } catch (e) {
      toast.error("Không xoá được", { description: (e as Error).message });
      setBusy(null);
    }
  }

  const playable = video.ai_status !== "recording";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild aria-label="Quay lại">
          <Link href="/videos">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-semibold tracking-wide">{video.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SourceBadge source={video.source} />
            <StorageBadge storage={video.storage} />
            {video.ai_status === "done" ? <VerdictBadge video={video} /> : <AiStatusBadge status={video.ai_status} progress={video.ai_progress} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOperator && (
            <Button
              size="sm"
              onClick={() => run("analyze", () => api(`/api/videos/${video.id}/analyze`, { method: "POST" }), "Đã đưa vào hàng đợi AI")}
              loading={busy === "analyze"}
              disabled={video.ai_status === "processing" || video.ai_status === "recording"}
            >
              <RefreshCw /> Phân tích lại
            </Button>
          )}
          {isAdmin && video.storage === "local" && (
            <Button
              size="sm"
              onClick={() => run("offload", () => api(`/api/videos/${video.id}/offload`, { method: "POST" }), "Đã đẩy lên Cloudflare R2")}
              loading={busy === "offload"}
              disabled={!storage?.r2.enabled || video.ai_status === "processing" || video.ai_status === "recording"}
              title={storage?.r2.enabled ? undefined : "Chưa cấu hình R2 trong .env của máy chủ"}
            >
              <CloudUpload /> Đẩy lên R2
            </Button>
          )}
          {playable && (
            <Button size="sm" asChild>
              <a href={mediaUrl(`/api/videos/${video.id}/file`, { download: 1 })}>
                <Download /> Tải về
              </a>
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Xoá
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="brackets overflow-hidden rounded-lg border border-line bg-black" style={{ "--bracket": video.flagged ? "var(--critical)" : undefined } as React.CSSProperties}>
            {playable ? (
              playbackError ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center text-sm text-dim">
                  <Film className="size-7 text-mute" />
                  Trình duyệt không phát được định dạng này. Hãy tải về để xem — AI vẫn phân tích bình thường.
                </div>
              ) : (
                <video
                  ref={videoRef}
                  controls
                  preload="metadata"
                  src={mediaUrl(`/api/videos/${video.id}/file`)}
                  className="aspect-video w-full"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onError={() => setPlaybackError(true)}
                />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center gap-2 text-sm text-dim">
                <span className="size-2 animate-pulse-soft rounded-full bg-critical" /> Đang ghi hình…
              </div>
            )}
          </div>

          <div className="panel p-4">
            <SectionTitle eyebrow={summary ? `${summary.samples} khung · ${summary.sample_fps} fps` : "AI"} title="Dòng thời gian phân tích" className="mb-4" />
            {video.ai_status === "done" && timeline.length ? (
              <AiTimeline
                samples={timeline}
                segments={summary?.segments ?? []}
                duration={video.duration}
                threshold={summary?.threshold ?? 70}
                interval={interval}
                currentTime={currentTime}
                onSeek={seek}
              />
            ) : video.ai_status === "processing" ? (
              <div className="space-y-2 py-4">
                <div className="flex items-center gap-2 text-sm text-dim">
                  <LoaderCircle className="size-4 animate-spin text-signal" /> AI đang phân tích… {video.ai_progress.toFixed(0)}%
                </div>
                <Meter value={video.ai_progress} />
              </div>
            ) : video.ai_status === "failed" ? (
              <p className="rounded border border-critical/30 bg-critical/5 p-3 text-sm text-critical">{video.ai_error}</p>
            ) : (
              <p className="py-4 text-sm text-dim">
                {video.ai_status === "recording" ? "Clip đang được ghi, AI sẽ phân tích ngay khi ghi xong." : "Đang chờ tới lượt phân tích…"}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className={cn("panel p-4", summary?.flagged && "border-critical/40")}>
            <SectionTitle eyebrow="Kết luận AI" title={summary?.verdict ?? "Chưa có kết quả"} />
            {summary && (
              <>
                <div className="mt-4 flex items-center gap-3">
                  {summary.flagged ? (
                    <ShieldAlert className="size-9 text-critical" />
                  ) : (
                    <ShieldCheck className="size-9 text-good" />
                  )}
                  <div className="grid flex-1 grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-dim">Thời lượng nghi vấn</div>
                      <div className="text-lg font-semibold">{summary.bullying_seconds.toFixed(1)}s</div>
                    </div>
                    <div>
                      <div className="text-xs text-dim">Độ tin cậy cao nhất</div>
                      <div className="text-lg font-semibold">{summary.max_bullying_confidence.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-2.5">
                  <div className="eyebrow">Tỷ lệ khung hình theo lớp</div>
                  {Object.entries(summary.distribution)
                    .filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, value]) => (
                      <div key={name}>
                        <div className="flex justify-between text-xs">
                          <span className="text-dim">{classLabel(name)}</span>
                          <span className="font-mono text-text tabular">{value.toFixed(1)}%</span>
                        </div>
                        <Meter className="mt-1" value={value} tone={name.includes("bullying") ? "bullying" : "neutral"} />
                      </div>
                    ))}
                </div>
                {summary.segments.length > 0 && (
                  <div className="mt-5">
                    <div className="eyebrow mb-2">Đoạn nghi vấn — bấm để tua</div>
                    <ul className="space-y-1">
                      {summary.segments.map((segment) => (
                        <li key={segment.start}>
                          <button
                            type="button"
                            onClick={() => seek(Math.max(0, segment.start - 1))}
                            className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left text-[13px] hover:border-critical/50 hover:bg-critical/5"
                          >
                            <span className="font-mono text-text tabular">
                              {formatDuration(segment.start)} – {formatDuration(segment.end)}
                            </span>
                            <span className="font-mono text-xs text-dim">
                              đỉnh {segment.peak.toFixed(0)}% · {segment.hits} mẫu
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="panel p-4">
            <SectionTitle eyebrow="Tệp" title="Thông tin video" />
            <div className="mt-2 divide-y divide-line/70">
              <Row label="Nguồn">
                {video.camera_id ? (
                  <Link href={`/cameras/${video.camera_id}`} className="hover:text-signal">
                    {video.camera_name}
                  </Link>
                ) : (
                  video.original_name
                )}
              </Row>
              {video.event && (
                <Row label="Sự kiện">
                  <Link href={`/events?focus=${video.event.id}`} className="hover:text-signal">
                    {EVENT_LABELS[video.event.type]} · {video.event.confidence?.toFixed(0)}%
                  </Link>
                </Row>
              )}
              <Row label="Thời lượng">{formatDuration(video.duration)}</Row>
              <Row label="Độ phân giải">{video.width ? `${video.width}×${video.height} · ${video.fps} fps` : "—"}</Row>
              <Row label="Dung lượng">{formatBytes(video.size_bytes)}</Row>
              <Row label="Tạo lúc">
                <span className="font-mono text-xs">{formatDateTime(video.created_at)}</span>
              </Row>
              <Row label="AI xử lý">
                <span className="font-mono text-xs">{formatDateTime(video.processed_at)}</span>
              </Row>
              <Row label="Nơi lưu">
                {video.storage === "r2" ? `Cloudflare R2 · ${formatDateTime(video.offloaded_at)}` : video.storage === "uploading" ? "Đang đẩy lên R2…" : "Ổ local (bộ nhớ tạm)"}
              </Row>
              <Row label="Object key">
                <span className="font-mono text-[11px] text-mute">{video.object_key}</span>
              </Row>
            </div>
          </div>
        </div>
      </div>

      <Confirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xoá video?"
        description={`Xoá vĩnh viễn "${video.title}" khỏi ${video.storage === "r2" ? "Cloudflare R2" : "ổ local"}. Không thể hoàn tác.`}
        confirmLabel="Xoá vĩnh viễn"
        danger
        loading={busy === "delete"}
        onConfirm={remove}
      />
    </div>
  );
}
