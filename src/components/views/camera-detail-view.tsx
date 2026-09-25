"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  AudioLines,
  Camera as CameraIcon,
  Cctv,
  CircleDot,
  Flag,
  MessageSquareText,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";

import { useCameraActions } from "@/components/camera/camera-actions";
import { aiVerdict, CameraStateBadge, riskOf } from "@/components/camera/camera-bits";
import { EditCameraDialog, maskSecrets, webcamLabel } from "@/components/camera/camera-dialogs";
import { CameraTile } from "@/components/camera/camera-tile";
import { RiskChart } from "@/components/charts/risk-chart";
import { EventRow } from "@/components/events/event-bits";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Empty, Meter, Skeleton, severityTone } from "@/components/ui/feedback";
import { useRole } from "@/lib/connection";
import { formatRelative } from "@/lib/format";
import { useCamera, useCameraHistory, useEvents, useSettings, useVideos } from "@/lib/hooks";
import { classLabel, INCIDENT_TYPES } from "@/lib/labels";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{value}</span>
    </div>
  );
}

export function CameraDetailView({ id }: { id: string }) {
  const router = useRouter();
  const actions = useCameraActions();
  const { isAdmin, isOperator } = useRole();
  const { data: camera, error } = useCamera(id);
  const { data: history } = useCameraHistory(camera?.state === "online" ? id : null);
  const { data: events } = useEvents(`camera_id=${id}&type=${INCIDENT_TYPES.join(",")}&limit=6`);
  const { data: videos } = useVideos(`camera_id=${id}&limit=4`);
  const { data: settings } = useSettings();
  const [editing, setEditing] = useState(false);

  if (error) {
    return (
      <Card>
        <Empty
          icon={Cctv}
          title="Không tìm thấy camera"
          action={
            <Button variant="secondary" onClick={() => router.push("/live")}>
              <ArrowLeft /> Về màn hình trực tiếp
            </Button>
          }
        >
          Camera có thể đã bị xoá, hoặc điện thoại đã dừng quay.
        </Empty>
      </Card>
    );
  }

  if (!camera) return <Skeleton className="h-[70vh]" />;

  const analysis = camera.analysis;
  const threshold = settings?.bullying_threshold ?? 70;
  const probs = Object.entries(analysis?.probs ?? {}).sort((a, b) => b[1] - a[1]);
  const verdict = aiVerdict(analysis, threshold);
  const speech = camera.speech;
  const online = camera.state === "online";

  return (
    <div className="space-y-7">
      <div className="animate-rise">
        <Link href={camera.virtual ? "/live" : "/cameras"} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> {camera.virtual ? "Trực tiếp" : "Camera"}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="display truncate text-[32px] leading-tight text-ink md:text-[40px]">{camera.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[15px] text-ink-2">
              <CameraStateBadge state={camera.state} />
              {camera.location || (camera.virtual ? `Quay bởi ${camera.owner}` : "Chưa đặt vị trí")}
            </div>
          </div>
          {!camera.virtual && (
            <div className="flex flex-wrap gap-2">
              {isOperator &&
                (camera.recording ? (
                  <Button variant="danger" size="sm" onClick={() => actions.stopRecording(camera)}>
                    <CircleDot /> Dừng ghi
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => actions.record(camera, 30)} disabled={!online}>
                    <CircleDot className="text-critical" /> Ghi 30 giây
                  </Button>
                ))}
              <Button size="sm" onClick={() => actions.snapshot(camera)} disabled={!online}>
                <CameraIcon /> Chụp ảnh
              </Button>
              {isOperator && (
                <Button size="sm" onClick={() => actions.mark(camera)} disabled={!online}>
                  <Flag /> Đánh dấu
                </Button>
              )}
              {isAdmin && (
                <>
                  <Button size="sm" onClick={() => setEditing(true)}>
                    <Pencil /> Sửa
                  </Button>
                  <Button size="sm" variant={camera.enabled ? "ghost" : "primary"} onClick={() => actions.setPower(camera, !camera.enabled)}>
                    {camera.enabled ? <PowerOff /> : <Power />}
                    {camera.enabled ? "Tắt" : "Bật"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 lg:space-y-6">
          <CameraTile camera={camera} width={1280} fps={12} size="lg" />
          <Card>
            <CardHeader eyebrow="2 phút gần nhất" title="Diễn biến nguy cơ" />
            <div className="mt-5">
              {history?.history.length ? (
                <RiskChart history={history.history} threshold={threshold} />
              ) : (
                <p className="py-12 text-center text-sm text-ink-3">
                  {online ? "Đang thu thập dữ liệu…" : "Camera chưa hoạt động."}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:space-y-6">
          <Card>
            <CardHeader eyebrow="AI nhận định" title={camera.ai_enabled ? verdict.label : "AI đang tắt"} />
            {camera.ai_enabled && (
              <>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className={cn("numeral text-[44px] leading-none", verdict.level === 2 ? "text-critical" : "text-ink")}>
                    {analysis ? riskOf(analysis).toFixed(0) : "—"}
                  </span>
                  <span className="text-sm text-ink-3">% nguy cơ bắt nạt</span>
                </div>
                <div className="mt-5 space-y-3">
                  {probs.map(([name, value]) => (
                    <div key={name}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-ink-2">{classLabel(name)}</span>
                        <span className="text-ink tabular">{value.toFixed(0)}%</span>
                      </div>
                      <Meter
                        className="mt-1.5"
                        value={value}
                        tone={name.includes("bullying") ? (value >= threshold ? "critical" : "bullying") : "neutral"}
                        label={classLabel(name)}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-ink-3">
                  Báo động khi nguy cơ từ {threshold}% trở lên trong {settings?.bullying_min_hits ?? 3} lần phân tích liên
                  tiếp (khoảng {((settings?.bullying_min_hits ?? 3) * 0.5).toFixed(1)} giây).
                </p>
              </>
            )}
          </Card>

          {camera.has_audio && (
            <Card>
              <CardHeader eyebrow="Âm thanh" title="Giọng nói & mức căng thẳng" />
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex justify-between text-[13px]">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <AudioLines className="size-4" /> Âm lượng
                    </span>
                    <span className="text-ink tabular">{camera.audio.level.toFixed(0)}%</span>
                  </div>
                  <Meter className="mt-2" value={camera.audio.level} tone="info" label="Âm lượng" />
                </div>
                <div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink-2">Mức căng thẳng · {camera.anger.status}</span>
                    <span className="text-ink tabular">{camera.anger.value.toFixed(0)}%</span>
                  </div>
                  <Meter className="mt-2" value={camera.anger.value} tone={severityTone(camera.anger.value, 40, 70)} label="Mức căng thẳng" />
                </div>
                <div className="rounded-2xl bg-surface-2 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-ink-3">
                    <MessageSquareText className="size-3.5" /> Lời nói gần nhất
                  </div>
                  {speech.whisper ? (
                    speech.last_text ? (
                      <p className={cn("mt-2 font-serif text-[17px] leading-snug", speech.toxic ? "text-critical" : "text-ink")}>
                        “{speech.last_text}”
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-ink-3">Chưa nghe thấy lời nói.</p>
                    )
                  ) : (
                    <p className="mt-2 text-sm text-ink-3">Tính năng nghe lời nói chưa được bật trên máy chủ.</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader eyebrow="Thông tin" title="Camera" />
            <div className="hairline-divide mt-3">
              <InfoRow label="Chất lượng hình" value={camera.width ? `${camera.width}×${camera.height} · ${camera.fps} khung/giây` : "—"} />
              <InfoRow label="Âm thanh" value={camera.has_audio ? "Có" : "Không"} />
              <InfoRow label="Hoạt động từ" value={formatRelative(camera.connected_since)} />
              <InfoRow
                label="Lưu clip khi có sự việc"
                value={camera.record_on_event ? `Bật · ${settings?.pre_roll_seconds ?? 5}s trước, ${settings?.post_roll_seconds ?? 10}s sau` : "Tắt"}
              />
              {camera.source === "webcam" ? (
                <InfoRow label="Webcam" value={webcamLabel(camera.rtsp_url)} />
              ) : (
                isAdmin &&
                !camera.virtual && <InfoRow label="Luồng video" value={<span className="font-mono text-xs">{maskSecrets(camera.rtsp_url)}</span>} />
              )}
            </div>
            {camera.error && camera.state === "error" && (
              <p className="mt-3 rounded-2xl bg-critical-soft px-4 py-3 text-[13px] leading-relaxed text-critical">
                Camera không phản hồi. Kiểm tra nguồn điện và dây mạng của camera.
              </p>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            eyebrow="Camera này"
            title="Sự việc gần đây"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/incidents?camera=${camera.id}&status=all`}>
                  Tất cả <ArrowUpRight />
                </Link>
              </Button>
            }
          />
          <div className="mt-3 -mx-2">
            {events?.events.length ? (
              events.events.map((event) => (
                <EventRow key={event.id} event={event} onClick={() => router.push(`/incidents?focus=${event.id}&status=all`)} />
              ))
            ) : (
              <p className="py-10 text-center text-sm text-ink-3">Chưa có sự việc nào.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            eyebrow="Camera này"
            title="Video đã ghi"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/videos?camera=${camera.id}`}>
                  Tất cả <ArrowUpRight />
                </Link>
              </Button>
            }
          />
          {videos?.videos.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {videos.videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-3">Chưa có video. Clip sẽ tự lưu khi AI phát hiện sự việc.</p>
          )}
        </Card>
      </div>

      <EditCameraDialog camera={editing ? camera : null} onOpenChange={(open) => !open && setEditing(false)} />
    </div>
  );
}
