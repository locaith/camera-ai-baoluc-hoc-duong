"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Inbox, Search } from "lucide-react";

import { EVENT_ICONS, EventThumb, ReviewBadge } from "@/components/events/event-bits";
import { EventSheet } from "@/components/events/event-sheet";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Confirm, Empty, Skeleton } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { api, query } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatWhen } from "@/lib/format";
import { revalidate, useCameras, useEvents, useStats } from "@/lib/hooks";
import { EVENT_LABELS, INCIDENT_TYPES, REVIEW_LABELS } from "@/lib/labels";
import type { EventType, ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = ReviewStatus | "all";

const TABS: { value: Tab; label: string }[] = [
  { value: "new", label: REVIEW_LABELS.new },
  { value: "confirmed", label: REVIEW_LABELS.confirmed },
  { value: "resolved", label: REVIEW_LABELS.resolved },
  { value: "false_alarm", label: REVIEW_LABELS.false_alarm },
  { value: "all", label: "Tất cả" },
];

const RANGES = [
  { value: 24, label: "24 giờ qua" },
  { value: 168, label: "7 ngày qua" },
  { value: 720, label: "30 ngày qua" },
  { value: 0, label: "Mọi thời điểm" },
];

export function IncidentsView() {
  const router = useRouter();
  const params = useSearchParams();
  const focus = params.get("focus");
  const { isOperator } = useRole();
  const { data: cameraData } = useCameras();
  const { data: stats } = useStats(24);

  const [tab, setTab] = useState<Tab>((params.get("status") as Tab) || "new");
  const [hours, setHours] = useState(0);
  const [type, setType] = useState<EventType | "">("");
  const [camera, setCamera] = useState(params.get("camera") ?? "");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(40);
  const [since] = useState(() => Date.now() / 1000);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const queryString = query({
    type: type || INCIDENT_TYPES.join(","),
    status: tab === "all" ? undefined : tab,
    camera_id: camera,
    since: hours ? Math.floor(since - hours * 3600) : undefined,
    q: search.trim(),
    limit,
  });
  const { data, isValidating } = useEvents(queryString);
  const needsReview = stats?.events.needs_review ?? 0;

  function openEvent(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("focus", id);
    else next.delete("focus");
    router.replace(`/incidents${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  async function resolveAll() {
    setBusy(true);
    try {
      const result = await api<{ count: number }>("/api/events/ack-all", {
        method: "POST",
        json: { camera_id: camera || null },
      });
      toast.success(`Đã đánh dấu ${result.count} sự việc là đã xử lý`);
      revalidate("/api/events");
      revalidate("/api/stats");
      setConfirmAll(false);
    } catch (e) {
      toast.error("Chưa thực hiện được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hồ sơ"
        title="Sự việc"
        description="Những tình huống AI phát hiện hoặc thầy cô đánh dấu. Xem ảnh, đoạn video và ghi nhận cách nhà trường đã xử lý."
        actions={
          isOperator &&
          tab === "new" &&
          (data?.total ?? 0) > 0 && (
            <Button variant="secondary" onClick={() => setConfirmAll(true)}>
              <CheckCheck /> Đánh dấu tất cả đã xử lý
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" className="inline-flex gap-1 rounded-full border border-hairline bg-surface-3/70 p-1">
            {TABS.map((item) => {
              const active = tab === item.value;
              const count = item.value === "new" ? needsReview : 0;
              return (
                <button
                  key={item.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(item.value);
                    setLimit(40);
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium whitespace-nowrap transition-all",
                    active ? "bg-surface text-ink shadow-[0_1px_3px_rgb(22_24_29/0.12)]" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {item.label}
                  {count ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] leading-5 tabular",
                        "bg-critical text-white",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,200px))_minmax(0,1fr)]">
          <Select value={String(hours)} onChange={(e) => setHours(Number(e.target.value))} aria-label="Khoảng thời gian">
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value as EventType | "")} aria-label="Loại sự việc">
            <option value="">Mọi loại sự việc</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_LABELS[t]}
              </option>
            ))}
          </Select>
          <Select value={camera} onChange={(e) => setCamera(e.target.value)} aria-label="Camera">
            <option value="">Mọi camera</option>
            {cameraData?.cameras
              .filter((c) => !c.virtual)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo nội dung, camera…" className="pl-10" />
          </div>
        </div>
      </div>

      <Card padded={false} className={cn("overflow-hidden transition-opacity", isValidating && data && "opacity-90")}>
        {!data ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : data.events.length ? (
          <ul className="hairline-divide">
            {data.events.map((event) => {
              const Icon = EVENT_ICONS[event.type];
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => openEvent(event.id)}
                    className={cn(
                      "grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 sm:px-5",
                      "md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto]",
                      focus === event.id && "bg-brand-soft/60",
                    )}
                  >
                    <EventThumb event={event} className="h-16 w-24 sm:h-18 sm:w-28" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
                        <span className="truncate text-[15px] font-medium text-ink">{EVENT_LABELS[event.type]}</span>
                        {event.confidence !== null && event.type === "bullying" && (
                          <span className="text-xs text-ink-3 tabular">{event.confidence.toFixed(0)}%</span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[13px] text-ink-2">{event.camera_name || "—"}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-3 md:hidden">
                        {formatWhen(event.created_at)} <ReviewBadge status={event.status} />
                      </div>
                    </div>
                    <div className="hidden min-w-0 md:block">
                      <div className="text-[13px] text-ink">{formatWhen(event.created_at)}</div>
                      <div className="mt-1 truncate text-xs text-ink-3">
                        {event.handled_by ? `${REVIEW_LABELS[event.status]} · ${event.handled_by}` : event.video_id ? "Có đoạn video" : "Có ảnh chụp"}
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <ReviewBadge status={event.status} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon={Inbox} title={tab === "new" ? "Không có sự việc nào chờ xem" : "Không có sự việc phù hợp"}>
            {tab === "new"
              ? "Khi AI phát hiện dấu hiệu bất thường, sự việc sẽ hiện tại đây và thầy cô nhận được thông báo ngay."
              : "Thử đổi bộ lọc hoặc khoảng thời gian."}
          </Empty>
        )}
      </Card>

      {data && data.events.length < data.total && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setLimit(limit + 40)} loading={isValidating}>
            Xem thêm ({data.total - data.events.length})
          </Button>
        </div>
      )}

      <EventSheet eventId={focus} onClose={() => openEvent(null)} />
      <Confirm
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Đánh dấu tất cả đã xử lý?"
        description="Mọi sự việc đang chờ xem sẽ chuyển sang “Đã xử lý” với tên của thầy cô. Nên xem từng sự việc nghiêm trọng trước khi làm việc này."
        confirmLabel="Đánh dấu tất cả"
        loading={busy}
        onConfirm={resolveAll}
      />
    </div>
  );
}
