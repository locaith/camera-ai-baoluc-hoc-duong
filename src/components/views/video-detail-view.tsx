"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clapperboard,
  CloudUpload,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AiTimeline } from "@/components/videos/ai-timeline";
import { AiStatusBadge, SourceBadge, StorageBadge, VerdictBadge } from "@/components/videos/video-bits";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Confirm, Empty, Meter, Notice, Skeleton } from "@/components/ui/feedback";
import { api, mediaUrl } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/format";
import { revalidate, useStorage, useVideo } from "@/lib/hooks";
import { classLabel, EVENT_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 text-right wrap-break-word text-ink">{children}</span>
    </div>
  );
}

export function VideoDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: video, error, mutate } = useVideo(id);
  const { isAdmin, isOperator } = useRole();
  const { data: storage } = useStorage(isAdmin);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (error) {
    return (
      <Card>
        <Empty
          icon={Clapperboard}
          title="Không tìm thấy video"
          action={
            <Button variant="secondary" onClick={() => router.push("/videos")}>
              <ArrowLeft /> Về mục Video
            </Button>
          }
        >
          Video có thể đã bị xoá.
        </Empty>
      </Card>
    );
  }

  if (!video) return <Skeleton className="h-[70vh]" />;

  const summary = video.ai_summary;
  const timeline = video.ai_timeline ?? [];
  const interval = summary ? 1 / summary.sample_fps : 0.5;
  const playable = video.ai_status !== "recording";

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
      toast.error("Thao tác chưa thành công", { description: (e as Error).message });
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
      toast.error("Chưa xoá được", { description: (e as Error).message });
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      <div className="animate-rise">
        <Link href="/videos" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> Video
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="display text-[30px] leading-tight text-ink md:text-[38px]">{video.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SourceBadge source={video.source} />
              {video.ai_status === "done" ? <VerdictBadge video={video} /> : <AiStatusBadge status={video.ai_status} progress={video.ai_progress} />}
              {isAdmin && <StorageBadge storage={video.storage} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOperator && (
              <Button
                size="sm"
                onClick={() => run("analyze", () => api(`/api/videos/${video.id}/analyze`, { method: "POST" }), "Đã gửi cho AI phân tích lại")}
                loading={busy === "analyze"}
                disabled={video.ai_status === "processing" || video.ai_status === "recording"}
              >
                <RefreshCw /> Phân tích lại
              </Button>
            )}
            {isAdmin && video.storage === "local" && storage?.r2.enabled && (
              <Button
                size="sm"
                onClick={() => run("offload", () => api(`/api/videos/${video.id}/offload`, { method: "POST" }), "Đã chuyển lên lưu trữ đám mây")}
                loading={busy === "offload"}
                disabled={video.ai_status === "processing" || video.ai_status === "recording"}
              >
                <CloudUpload /> Chuyển lên đám mây
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
      </div>

      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 lg:space-y-6">
          <div className={cn("overflow-hidden rounded-[20px] bg-frame shadow-soft", video.flagged && "ring-2 ring-critical/60")}>
            {playable ? (
              playbackError ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/70">
                  <Clapperboard className="size-7 text-white/40" strokeWidth={1.5} />
                  Trình duyệt không phát được định dạng này. Hãy bấm Tải về để xem.
                </div>
              ) : (
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  preload="metadata"
                  src={mediaUrl(`/api/videos/${video.id}/file`)}
                  className="aspect-video w-full"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onError={() => setPlaybackError(true)}
                />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center gap-2 text-sm text-white/70">
                <span className="size-2 animate-breathe rounded-full bg-critical" /> Đang ghi hình…
              </div>
            )}
          </div>

          <Card>
            <CardHeader
              eyebrow="AI xem lại"
              title="Dòng thời gian"
              description={summary ? `Bấm vào dải màu để tua tới thời điểm tương ứng.` : undefined}
            />
            <div className="mt-5">
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
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-2 text-sm text-ink-2">
                    <LoaderCircle className="size-4 animate-spin text-brand" /> AI đang xem video… {video.ai_progress.toFixed(0)}%
                  </div>
                  <Meter value={video.ai_progress} tone="ink" />
                </div>
              ) : video.ai_status === "failed" ? (
                <Notice tone="critical" title="Chưa phân tích được video này">
                  {video.ai_error || "Định dạng video không được hỗ trợ."}
                </Notice>
              ) : (
                <p className="py-4 text-sm text-ink-3">
                  {video.ai_status === "recording" ? "Video đang được ghi, AI sẽ xem ngay khi ghi xong." : "Đang chờ tới lượt phân tích…"}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:space-y-6">
          <Card className={cn(summary?.flagged && "ring-1 ring-critical/30")}>
            <div className="eyebrow">Kết luận của AI</div>
            {summary ? (
              <>
                <div className="mt-4 flex items-start gap-3.5">
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-full",
                      summary.flagged ? "bg-critical-soft text-critical" : summary.segments.length ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
                    )}
                  >
                    {summary.flagged || summary.segments.length ? <ShieldAlert className="size-5.5" strokeWidth={1.75} /> : <ShieldCheck className="size-5.5" strokeWidth={1.75} />}
                  </span>
                  <p className="font-serif text-[22px] leading-snug text-ink">{summary.verdict}</p>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-surface-2 px-4 py-3">
                    <dt className="text-xs text-ink-3">Thời lượng đáng ngờ</dt>
                    <dd className="numeral mt-1 text-[26px] text-ink">{summary.bullying_seconds.toFixed(0)}s</dd>
                  </div>
                  <div className="rounded-2xl bg-surface-2 px-4 py-3">
                    <dt className="text-xs text-ink-3">Mức cao nhất</dt>
                    <dd className="numeral mt-1 text-[26px] text-ink">{summary.max_bullying_confidence.toFixed(0)}%</dd>
                  </div>
                </dl>
                {summary.segments.length > 0 && (
                  <div className="mt-6">
                    <div className="eyebrow mb-2.5">Đoạn cần xem — bấm để tua</div>
                    <ul className="space-y-1.5">
                      {summary.segments.map((segment) => (
                        <li key={segment.start}>
                          <button
                            type="button"
                            onClick={() => seek(Math.max(0, segment.start - 1))}
                            className="flex w-full items-center justify-between rounded-2xl border border-hairline px-4 py-2.5 text-left text-sm transition-colors hover:border-critical/40 hover:bg-critical-soft"
                          >
                            <span className="text-ink tabular">
                              {formatDuration(segment.start)} – {formatDuration(segment.end)}
                            </span>
                            <span className="text-xs text-ink-3">cao nhất {segment.peak.toFixed(0)}%</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  <div className="eyebrow">Tỷ lệ khung hình</div>
                  {Object.entries(summary.distribution)
                    .filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, value]) => (
                      <div key={name}>
                        <div className="flex justify-between text-[13px]">
                          <span className="text-ink-2">{classLabel(name)}</span>
                          <span className="text-ink tabular">{value.toFixed(0)}%</span>
                        </div>
                        <Meter className="mt-1.5" value={value} tone={name.includes("bullying") ? "bullying" : "neutral"} />
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-3">AI chưa có kết luận cho video này.</p>
            )}
          </Card>

          <Card>
            <CardHeader eyebrow="Thông tin" title="Video" />
            <div className="hairline-divide mt-3">
              <Row label="Nguồn">
                {video.camera_id ? (
                  <Link href={`/cameras/${video.camera_id}`} className="hover:text-brand">
                    {video.camera_name}
                  </Link>
                ) : (
                  video.camera_name || video.original_name
                )}
              </Row>
              {video.event && (
                <Row label="Sự việc">
                  <Link href={`/incidents?focus=${video.event.id}&status=all`} className="hover:text-brand">
                    {EVENT_LABELS[video.event.type]}
                    {video.event.confidence !== null ? ` · ${video.event.confidence.toFixed(0)}%` : ""}
                  </Link>
                </Row>
              )}
              <Row label="Thời lượng">{formatDuration(video.duration)}</Row>
              <Row label="Chất lượng">{video.width ? `${video.width}×${video.height}` : "—"}</Row>
              <Row label="Dung lượng">{formatBytes(video.size_bytes)}</Row>
              <Row label="Ghi lúc">{formatDateTime(video.created_at)}</Row>
              {video.processed_at && <Row label="AI xem xong">{formatDateTime(video.processed_at)}</Row>}
            </div>
          </Card>
        </div>
      </div>

      <Confirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xoá video này?"
        description={`“${video.title}” sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xoá vĩnh viễn"
        danger
        loading={busy === "delete"}
        onConfirm={remove}
      />
    </div>
  );
}
