"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AudioLines,
  Camera as CameraIcon,
  CircleDot,
  Cctv,
  Flag,
  MessageSquareText,
  Pencil,
  Power,
  PowerOff,
  ScanEye,
} from "lucide-react";

import { useCameraActions } from "@/components/camera/camera-actions";
import { CameraStateBadge } from "@/components/camera/camera-bits";
import { EditCameraDialog } from "@/components/camera/camera-dialogs";
import { CameraTile } from "@/components/camera/camera-tile";
import { RiskChart } from "@/components/charts/risk-chart";
import { EventRow } from "@/components/events/event-bits";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { Empty, Meter, Skeleton, severityTone } from "@/components/ui/feedback";
import { SectionTitle } from "@/components/ui/stat-tile";
import { useRole } from "@/lib/connection";
import { formatRelative } from "@/lib/format";
import { useCamera, useCameraHistory, useEvents, useSettings, useVideos } from "@/lib/hooks";
import { classLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-dim">{label}</span>
      <span className="truncate text-right font-mono text-xs text-text">{value}</span>
    </div>
  );
}

export function CameraDetailView({ id }: { id: string }) {
  const router = useRouter();
  const actions = useCameraActions();
  const { isAdmin, isOperator } = useRole();
  const { data: camera, error } = useCamera(id);
  const { data: history } = useCameraHistory(camera?.state === "online" ? id : null);
  const { data: events } = useEvents(`camera_id=${id}&limit=8`);
  const { data: videos } = useVideos(`camera_id=${id}&limit=6`);
  const { data: settings } = useSettings();
  const [editing, setEditing] = useState(false);

  if (error) {
    return (
      <div className="panel">
        <Empty
          icon={Cctv}
          title="Không tìm thấy camera"
          action={
            <Button onClick={() => router.push("/cameras")}>
              <ArrowLeft /> Về danh sách camera
            </Button>
          }
        >
          {error.message}
        </Empty>
      </div>
    );
  }

  if (!camera) return <Skeleton className="h-[70vh]" />;

  const analysis = camera.analysis;
  const threshold = settings?.bullying_threshold ?? 70;
  const probs = Object.entries(analysis?.probs ?? {}).sort((a, b) => b[1] - a[1]);
  const speech = camera.speech;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild aria-label="Quay lại">
          <Link href="/cameras">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold tracking-wide">{camera.name}</h2>
          <div className="text-xs text-dim">
            {camera.location || "Chưa đặt vị trí"} · <span className="font-mono">{camera.id}</span>
          </div>
        </div>
        <CameraStateBadge state={camera.state} />
        <div className="ml-auto flex flex-wrap gap-2">
          {isOperator &&
            (camera.recording ? (
              <Button variant="danger" size="sm" onClick={() => actions.stopRecording(camera)}>
                <CircleDot /> Dừng ghi
              </Button>
            ) : (
              <Button size="sm" onClick={() => actions.record(camera, 30)} disabled={camera.state !== "online"}>
                <CircleDot className="text-critical" /> Ghi 30s
              </Button>
            ))}
          <Button size="sm" onClick={() => actions.snapshot(camera)} disabled={camera.state !== "online"}>
            <CameraIcon /> Chụp ảnh
          </Button>
          {isOperator && (
            <Button size="sm" onClick={() => actions.mark(camera)} disabled={camera.state !== "online"}>
              <Flag /> Đánh dấu
            </Button>
          )}
          {isAdmin && (
            <>
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Sửa
              </Button>
              <Button
                size="sm"
                variant={camera.enabled ? "ghost" : "primary"}
                onClick={() => actions.setPower(camera, !camera.enabled)}
              >
                {camera.enabled ? <PowerOff /> : <Power />}
                {camera.enabled ? "Tắt" : "Bật"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <CameraTile camera={camera} width={1280} fps={12} size="lg" />

          <div className="panel p-4 md:p-5">
            <SectionTitle eyebrow="2 phút gần nhất" title="Diễn biến nguy cơ" className="mb-4" />
            {history?.history.length ? (
              <RiskChart history={history.history} threshold={threshold} showAnger={camera.has_audio} />
            ) : (
              <p className="py-10 text-center text-sm text-dim">
                {camera.state === "online" ? "Đang thu thập dữ liệu…" : "Camera chưa trực tuyến."}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="panel p-4">
            <SectionTitle eyebrow="Mô hình hình ảnh" title="Phân tích AI" />
            {camera.ai_enabled ? (
              <>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className={cn("text-xl font-semibold", analysis?.bullying && "text-critical")}>
                    {classLabel(analysis?.class)}
                  </span>
                  <span className="font-mono text-sm text-dim tabular">
                    {analysis ? `${analysis.confidence.toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {probs.map(([name, value]) => {
                    const bullying = name.includes("bullying");
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs">
                          <span className="text-dim">{classLabel(name)}</span>
                          <span className="font-mono text-text tabular">{value.toFixed(1)}%</span>
                        </div>
                        <Meter
                          className="mt-1"
                          value={value}
                          tone={bullying ? (value >= threshold ? "critical" : "bullying") : "neutral"}
                          label={classLabel(name)}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-mute">
                  Cảnh báo khi &quot;Nghi bắt nạt&quot; ≥ {threshold}% trong {settings?.bullying_min_hits ?? 3} lần
                  phân tích liên tiếp.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-dim">AI đang tắt cho camera này.</p>
            )}
          </div>

          <div className="panel p-4">
            <SectionTitle eyebrow="Âm thanh" title="Giọng nói & mức căng thẳng" />
            {camera.has_audio ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-dim">
                      <AudioLines className="size-3.5" /> Mức âm thanh
                    </span>
                    <span className="font-mono text-text tabular">{camera.audio.level.toFixed(0)}%</span>
                  </div>
                  <Meter className="mt-1.5" value={camera.audio.level} tone="info" label="Mức âm thanh" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-dim">Căng thẳng · {camera.anger.status}</span>
                    <span className="font-mono text-text tabular">{camera.anger.value.toFixed(0)}%</span>
                  </div>
                  <Meter
                    className="mt-1.5"
                    value={camera.anger.value}
                    tone={severityTone(camera.anger.value, 40, 70)}
                    label="Mức căng thẳng"
                  />
                </div>
                <div className="rounded-md border border-line bg-bg/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-dim">
                    <MessageSquareText className="size-3.5" /> Lời nói gần nhất
                  </div>
                  {speech.whisper ? (
                    speech.last_text ? (
                      <>
                        <p className={cn("mt-1.5 text-sm", speech.toxic ? "text-critical" : "text-text")}>
                          “{speech.last_text}”
                        </p>
                        {speech.toxic && (
                          <p className="mt-1 text-xs text-critical">Từ tiêu cực: {speech.bad_word}</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1.5 text-sm text-mute">Chưa nghe thấy lời nói.</p>
                    )
                  ) : (
                    <p className="mt-1.5 text-xs text-mute">
                      Cài <span className="font-mono">faster-whisper</span> trên máy chủ để chuyển giọng nói thành
                      văn bản và phát hiện từ ngữ tiêu cực.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-dim">Luồng camera không có âm thanh.</p>
            )}
          </div>

          <div className="panel p-4">
            <SectionTitle eyebrow="Kỹ thuật" title="Thông tin luồng" />
            <div className="mt-2 divide-y divide-line/70">
              <InfoRow label="Độ phân giải" value={camera.width ? `${camera.width}×${camera.height}` : "—"} />
              <InfoRow label="Codec · FPS" value={`${camera.codec ? camera.codec.toUpperCase() : "—"} · ${camera.fps}`} />
              <InfoRow label="Âm thanh" value={camera.has_audio ? `${camera.audio.sample_rate} Hz` : "Không"} />
              <InfoRow label="Kết nối từ" value={formatRelative(camera.connected_since)} />
              <InfoRow label="RTSP" value={camera.rtsp_url} />
              <InfoRow
                label="Ghi clip sự kiện"
                value={camera.record_on_event ? `Bật · ${settings?.pre_roll_seconds ?? 5}s + ${settings?.post_roll_seconds ?? 10}s` : "Tắt"}
              />
            </div>
            {camera.error && (
              <p className="mt-2 rounded border border-critical/30 bg-critical/5 p-2 font-mono text-[11px] break-all whitespace-pre-line text-critical">
                {camera.error}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="panel p-4">
          <SectionTitle
            eyebrow="Camera này"
            title="Cảnh báo gần đây"
            action={
              <Link href={`/events?camera=${camera.id}`} className="text-xs text-signal hover:underline">
                Tất cả
              </Link>
            }
          />
          <div className="mt-3 space-y-1">
            {events?.events.length ? (
              events.events.map((event) => (
                <EventRow key={event.id} event={event} onClick={() => router.push(`/events?focus=${event.id}`)} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-dim">Chưa có cảnh báo.</p>
            )}
          </div>
        </div>
        <div className="panel p-4">
          <SectionTitle
            eyebrow="Camera này"
            title="Video đã ghi"
            action={
              <Link href={`/videos?camera=${camera.id}`} className="text-xs text-signal hover:underline">
                Tất cả
              </Link>
            }
          />
          {videos?.videos.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {videos.videos.slice(0, 4).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-dim">
              <ScanEye className="mx-auto mb-2 size-5 text-mute" />
              Chưa có video. Clip sẽ tự ghi khi AI phát hiện sự kiện.
            </p>
          )}
        </div>
      </div>

      <EditCameraDialog camera={editing ? camera : null} onOpenChange={(open) => !open && setEditing(false)} />
    </div>
  );
}
