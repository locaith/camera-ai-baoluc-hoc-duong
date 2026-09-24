"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CircleCheck, CircleSlash, ExternalLink, LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Confirm, Meter } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { api, mediaUrl } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatDateTime, formatRelative } from "@/lib/format";
import { revalidate, useEvent } from "@/lib/hooks";
import { classLabel, EVENT_LABELS, REVIEW_HINTS, REVIEW_LABELS } from "@/lib/labels";
import type { AppEvent, ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

import { EVENT_ICONS, ReviewBadge, SeverityBadge } from "./event-bits";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 text-right text-ink">{children}</span>
    </div>
  );
}

const ACTIONS: { status: ReviewStatus; icon: typeof ShieldAlert; tone: string }[] = [
  { status: "confirmed", icon: ShieldAlert, tone: "data-[on=true]:border-warning data-[on=true]:bg-warning-soft data-[on=true]:text-warning" },
  { status: "false_alarm", icon: CircleSlash, tone: "data-[on=true]:border-ink-3 data-[on=true]:bg-surface-3 data-[on=true]:text-ink" },
  { status: "resolved", icon: CircleCheck, tone: "data-[on=true]:border-success data-[on=true]:bg-success-soft data-[on=true]:text-success" },
];

function ReviewPanel({ event, onSaved }: { event: AppEvent; onSaved: (event: AppEvent) => void }) {
  const [status, setStatus] = useState<ReviewStatus>(event.status === "new" ? "confirmed" : event.status);
  const [note, setNote] = useState(event.note);
  const [busy, setBusy] = useState(false);
  const dirty = status !== event.status || note.trim() !== event.note;

  async function save(next: ReviewStatus = status) {
    setBusy(true);
    try {
      const saved = await api<AppEvent>(`/api/events/${event.id}/review`, {
        method: "POST",
        json: { status: next, note },
      });
      onSaved(saved);
      revalidate("/api/events");
      revalidate("/api/stats");
      toast.success(`Đã ghi nhận: ${REVIEW_LABELS[next]}`);
    } catch (e) {
      toast.error("Chưa lưu được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <div className="eyebrow">Nhà trường ghi nhận</div>
        <p className="mt-1.5 text-[13px] text-ink-3">Chọn kết luận sau khi xem ảnh và đoạn video.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {ACTIONS.map(({ status: value, icon: Icon, tone }) => (
          <button
            key={value}
            type="button"
            data-on={status === value}
            onClick={() => setStatus(value)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-2xl border border-hairline bg-surface px-3.5 py-3 text-left text-ink-2 transition-colors hover:border-hairline-2",
              tone,
            )}
          >
            <Icon className="size-4.5" strokeWidth={1.75} />
            <span className="text-sm font-medium">{REVIEW_LABELS[value]}</span>
            <span className="text-[11.5px] leading-snug opacity-80">{REVIEW_HINTS[value]}</span>
          </button>
        ))}
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú xử lý — ví dụ: đã gặp hai học sinh, báo giáo viên chủ nhiệm và phụ huynh…"
        maxLength={2000}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-ink-3">
          {event.handled_by
            ? `${REVIEW_LABELS[event.status]} bởi ${event.handled_by} · ${formatRelative(event.handled_at)}`
            : "Chưa có ai ghi nhận"}
        </span>
        <div className="flex gap-2">
          {event.status !== "new" && (
            <Button variant="ghost" size="sm" onClick={() => save("new")} disabled={busy}>
              Mở lại
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => save()} loading={busy} disabled={!dirty && event.status !== "new"}>
            Lưu ghi nhận
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EventSheet({ eventId, onClose }: { eventId: string | null; onClose: () => void }) {
  const { data: event, mutate } = useEvent(eventId);
  const { isAdmin, isOperator } = useRole();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!event) return;
    setBusy(true);
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
      revalidate("/api/events");
      revalidate("/api/stats");
      toast.success("Đã xoá sự việc");
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      toast.error("Chưa xoá được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const Icon = event ? EVENT_ICONS[event.type] : null;
  const data = (event?.data ?? {}) as {
    probs?: Record<string, number>;
    text?: string;
    bad_word?: string;
    status?: string;
  };
  const video = event?.video;

  return (
    <Dialog open={Boolean(eventId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent title="Chi tiết sự việc">
        {!event ? (
          <div className="grid h-64 place-items-center">
            <LoaderCircle className="size-6 animate-spin text-ink-3" />
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ReviewBadge status={event.status} />
                <SeverityBadge severity={event.severity} />
              </div>
              <h3 className="mt-4 flex items-start gap-2.5 font-serif text-[26px] leading-tight text-ink">
                {Icon && <Icon className="mt-1.5 size-5 shrink-0 text-ink-3" strokeWidth={1.75} />}
                {event.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{event.message}</p>
            </div>

            {event.has_snapshot && (
              <a
                href={mediaUrl(`/api/events/${event.id}/snapshot`)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-2xl bg-frame"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(`/api/events/${event.id}/snapshot`)}
                  alt="Ảnh tại thời điểm sự việc"
                  className="aspect-video w-full object-contain"
                />
              </a>
            )}

            {event.video_id && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Đoạn video bằng chứng</span>
                  <Link href={`/videos/${event.video_id}`} className="flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
                    Xem phân tích <ExternalLink className="size-3.5" />
                  </Link>
                </div>
                {video && video.ai_status !== "recording" ? (
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    src={mediaUrl(`/api/videos/${event.video_id}/file`)}
                    className="aspect-video w-full rounded-2xl bg-frame"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center gap-2 rounded-2xl bg-frame text-sm text-white/70">
                    <span className="size-2 animate-breathe rounded-full bg-critical" /> Đang ghi đoạn video…
                  </div>
                )}
              </div>
            )}

            {isOperator && event.type !== "camera_offline" && event.type !== "camera_online" && (
              <ReviewPanel key={`${event.id}-${event.status}-${event.handled_at}`} event={event} onSaved={(saved) => mutate({ ...event, ...saved }, { revalidate: false })} />
            )}

            {!isOperator && event.note && (
              <div className="rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-ink-2">
                <div className="eyebrow mb-1.5">Ghi chú của nhà trường</div>
                {event.note}
              </div>
            )}

            <div className="hairline-divide rounded-2xl border border-hairline px-4">
              <Detail label="Loại">{EVENT_LABELS[event.type]}</Detail>
              <Detail label="Camera">
                {event.camera_id ? (
                  <Link href={`/cameras/${event.camera_id}`} className="hover:text-brand">
                    {event.camera_name}
                  </Link>
                ) : (
                  event.camera_name || "—"
                )}
              </Detail>
              <Detail label="Thời điểm">{formatDateTime(event.created_at)}</Detail>
              {event.confidence !== null && <Detail label="Độ tin cậy của AI">{event.confidence.toFixed(0)}%</Detail>}
              {data.text && <Detail label="Lời nói nghe được">“{data.text}”</Detail>}
              {data.bad_word && <Detail label="Từ ngữ tiêu cực">{data.bad_word}</Detail>}
              {data.status && <Detail label="Âm thanh">{data.status}</Detail>}
              {event.note && isOperator && <Detail label="Ghi chú">{event.note}</Detail>}
            </div>

            {data.probs && (
              <div className="space-y-3">
                <div className="eyebrow">AI nhận định</div>
                {Object.entries(data.probs)
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
            )}

            {isAdmin && (
              <div className="border-t border-hairline pt-5">
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Xoá sự việc
                </Button>
              </div>
            )}
          </div>
        )}
        <Confirm
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Xoá sự việc này?"
          description="Ảnh chụp của sự việc sẽ bị xoá. Đoạn video (nếu có) vẫn được giữ trong mục Video."
          confirmLabel="Xoá"
          danger
          loading={busy}
          onConfirm={remove}
        />
      </SheetContent>
    </Dialog>
  );
}
