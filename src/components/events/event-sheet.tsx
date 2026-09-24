"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ExternalLink, LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Confirm, Meter } from "@/components/ui/feedback";
import { api, mediaUrl } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatDateTime, formatRelative } from "@/lib/format";
import { revalidate, useEvent } from "@/lib/hooks";
import { classLabel, EVENT_LABELS } from "@/lib/labels";

import { EVENT_ICONS, SeverityBadge } from "./event-bits";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 py-2 text-[13px] last:border-b-0">
      <span className="shrink-0 text-dim">{label}</span>
      <span className="text-right text-text">{children}</span>
    </div>
  );
}

export function EventSheet({ eventId, onClose }: { eventId: string | null; onClose: () => void }) {
  const { data: event, mutate } = useEvent(eventId);
  const { isAdmin, isOperator } = useRole();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function acknowledge() {
    if (!event) return;
    setBusy(true);
    try {
      await api(`/api/events/${event.id}/ack`, { method: "POST" });
      await mutate();
      revalidate("/api/events");
      revalidate("/api/stats");
      toast.success("Đã đánh dấu đã xử lý");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!event) return;
    setBusy(true);
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
      revalidate("/api/events");
      revalidate("/api/stats");
      toast.success("Đã xoá sự kiện");
      setConfirmDelete(false);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const Icon = event ? EVENT_ICONS[event.type] : null;
  const data = (event?.data ?? {}) as {
    class?: string;
    probs?: Record<string, number>;
    text?: string;
    bad_word?: string;
    anger?: number;
    status?: string;
    audio_level?: number;
  };
  const video = event?.video;

  return (
    <Dialog open={Boolean(eventId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent title="Chi tiết cảnh báo">
        {!event ? (
          <div className="grid h-64 place-items-center">
            <LoaderCircle className="size-6 animate-spin text-mute" />
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {event.has_snapshot && (
              <a
                href={mediaUrl(`/api/events/${event.id}/snapshot`)}
                target="_blank"
                rel="noreferrer"
                className="brackets block overflow-hidden rounded-lg border border-line"
                style={{ "--bracket": event.severity === "critical" ? "var(--critical)" : undefined } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(`/api/events/${event.id}/snapshot`)}
                  alt="Ảnh chụp tại thời điểm sự kiện"
                  className="aspect-video w-full bg-black object-contain"
                />
              </a>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={event.severity} />
                {event.acknowledged ? (
                  <span className="font-mono text-[11px] text-good">✓ Đã xử lý {formatRelative(event.acknowledged_at)}</span>
                ) : (
                  <span className="font-mono text-[11px] text-warning">Chưa xử lý</span>
                )}
              </div>
              <h3 className="mt-3 flex items-center gap-2 font-display text-lg font-semibold">
                {Icon && <Icon className="size-5 text-mute" />}
                {event.title}
              </h3>
              <p className="mt-1.5 text-sm text-dim">{event.message}</p>
            </div>

            <div className="rounded-md border border-line bg-bg/40 px-3">
              <Detail label="Loại">{EVENT_LABELS[event.type]}</Detail>
              <Detail label="Camera">
                {event.camera_id ? (
                  <Link href={`/cameras/${event.camera_id}`} className="hover:text-signal">
                    {event.camera_name}
                  </Link>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Thời điểm">
                <span className="font-mono text-xs">{formatDateTime(event.created_at)}</span>
              </Detail>
              {event.confidence !== null && (
                <Detail label="Độ tin cậy">
                  <span className="font-mono text-xs">{event.confidence.toFixed(1)}%</span>
                </Detail>
              )}
              {data.text && <Detail label="Lời nói">“{data.text}”</Detail>}
              {data.bad_word && <Detail label="Từ khoá">{data.bad_word}</Detail>}
              {data.status && <Detail label="Âm thanh">{data.status}</Detail>}
              <Detail label="Mã sự kiện">
                <span className="font-mono text-xs text-mute">{event.id}</span>
              </Detail>
            </div>

            {data.probs && (
              <div className="space-y-2.5">
                <div className="eyebrow">Xác suất các lớp</div>
                {Object.entries(data.probs)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, value]) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs">
                        <span className="text-dim">{classLabel(name)}</span>
                        <span className="font-mono text-text tabular">{value.toFixed(1)}%</span>
                      </div>
                      <Meter
                        className="mt-1"
                        value={value}
                        tone={name.includes("bullying") ? "bullying" : "neutral"}
                      />
                    </div>
                  ))}
              </div>
            )}

            {event.video_id && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Clip bằng chứng</span>
                  <Link href={`/videos/${event.video_id}`} className="flex items-center gap-1 text-xs text-signal hover:underline">
                    Phân tích video <ExternalLink className="size-3" />
                  </Link>
                </div>
                {video && video.ai_status !== "recording" ? (
                  <video
                    controls
                    preload="metadata"
                    src={mediaUrl(`/api/videos/${event.video_id}/file`)}
                    className="aspect-video w-full rounded-md border border-line bg-black"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center gap-2 rounded-md border border-line bg-black text-sm text-dim">
                    <span className="size-2 animate-pulse-soft rounded-full bg-critical" /> Đang ghi clip…
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 border-t border-line pt-4">
              {!event.acknowledged && isOperator && (
                <Button variant="primary" onClick={acknowledge} loading={busy}>
                  <Check /> Đánh dấu đã xử lý
                </Button>
              )}
              {isAdmin && (
                <Button variant="danger" className="ml-auto" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Xoá
                </Button>
              )}
            </div>
          </div>
        )}
        <Confirm
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Xoá sự kiện?"
          description="Ảnh chụp của sự kiện sẽ bị xoá. Clip video (nếu có) vẫn được giữ trong kho video."
          confirmLabel="Xoá"
          danger
          loading={busy}
          onConfirm={remove}
        />
      </SheetContent>
    </Dialog>
  );
}
