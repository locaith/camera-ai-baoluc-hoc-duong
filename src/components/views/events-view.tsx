"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Search, Siren } from "lucide-react";

import { EVENT_ICONS, EventThumb, SeverityBadge } from "@/components/events/event-bits";
import { EventSheet } from "@/components/events/event-sheet";
import { Button } from "@/components/ui/button";
import { Empty, Skeleton } from "@/components/ui/feedback";
import { Input, Segmented, Select } from "@/components/ui/form";
import { api, query } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatDateTime, formatRelative } from "@/lib/format";
import { revalidate, useCameras, useEvents } from "@/lib/hooks";
import { EVENT_LABELS, SEVERITY_LABELS } from "@/lib/labels";
import type { EventType, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: 1, label: "1 giờ" },
  { value: 24, label: "24 giờ" },
  { value: 168, label: "7 ngày" },
  { value: 720, label: "30 ngày" },
  { value: 0, label: "Tất cả" },
];

const TYPES: EventType[] = ["bullying", "toxic_speech", "high_anger", "manual", "camera_offline", "camera_online"];
const SEVERITIES: Severity[] = ["critical", "warning", "info"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors [&_svg]:size-3.5",
        active ? "border-signal/50 bg-signal/10 text-text" : "border-line text-dim hover:border-line-strong hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function EventsView() {
  const router = useRouter();
  const params = useSearchParams();
  const focus = params.get("focus");
  const { isOperator } = useRole();
  const { data: cameraData } = useCameras();

  const [hours, setHours] = useState(24);
  const [types, setTypes] = useState<EventType[]>([]);
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [camera, setCamera] = useState(params.get("camera") ?? "");
  const [onlyOpen, setOnlyOpen] = useState(params.get("status") === "open");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const [since] = useState(() => Date.now() / 1000);

  const queryString = query({
    type: types.join(","),
    severity: severities.join(","),
    camera_id: camera,
    acknowledged: onlyOpen ? false : undefined,
    since: hours ? Math.floor(since - hours * 3600) : undefined,
    q: search.trim(),
    limit,
  });
  const { data, isValidating } = useEvents(queryString);

  function openEvent(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("focus", id);
    else next.delete("focus");
    router.replace(`/events${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  async function ackAll() {
    const result = await api<{ count: number }>("/api/events/ack-all", {
      method: "POST",
      json: { camera_id: camera || null },
    });
    toast.success(`Đã xử lý ${result.count} cảnh báo`);
    revalidate("/api/events");
    revalidate("/api/stats");
  }

  return (
    <div className="space-y-4">
      {/* Một hàng bộ lọc duy nhất phía trên danh sách */}
      <div className="panel space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={hours} onChange={setHours} options={RANGES} />
          <Select value={camera} onChange={(e) => setCamera(e.target.value)} aria-label="Lọc theo camera">
            <option value="">Mọi camera</option>
            {cameraData?.cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Chip active={onlyOpen} onClick={() => setOnlyOpen(!onlyOpen)}>
            Chưa xử lý
          </Chip>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nội dung, camera…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map((type) => {
            const Icon = EVENT_ICONS[type];
            return (
              <Chip key={type} active={types.includes(type)} onClick={() => setTypes(toggle(types, type))}>
                <Icon /> {EVENT_LABELS[type]}
              </Chip>
            );
          })}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          {SEVERITIES.map((severity) => (
            <Chip
              key={severity}
              active={severities.includes(severity)}
              onClick={() => setSeverities(toggle(severities, severity))}
            >
              {SEVERITY_LABELS[severity]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-mute">
          {data ? `${data.total} sự kiện` : "Đang tải…"}
          {isValidating && data && " · đang cập nhật"}
        </span>
        {isOperator && (
          <Button size="sm" variant="outline" onClick={ackAll}>
            <CheckCheck /> Đánh dấu tất cả đã xử lý
          </Button>
        )}
      </div>

      <div className={cn("panel overflow-hidden transition-opacity", isValidating && data && "opacity-80")}>
        {!data ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data.events.length ? (
          <ul>
            {data.events.map((event) => {
              const Icon = EVENT_ICONS[event.type];
              return (
                <li key={event.id} className="border-b border-line/70 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openEvent(event.id)}
                    className={cn(
                      "grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-3 py-2.5 text-left transition-colors hover:bg-panel-2/60",
                      "md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]",
                      focus === event.id && "bg-signal/5",
                    )}
                  >
                    <EventThumb event={event} className="h-14 w-24" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0 text-mute" />
                        <span className="truncate font-medium text-text">{EVENT_LABELS[event.type]}</span>
                        {!event.acknowledged && event.severity !== "info" && (
                          <span className="size-1.5 shrink-0 rounded-full bg-warning" title="Chưa xử lý" />
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-dim">{event.message}</div>
                    </div>
                    <div className="hidden min-w-0 md:block">
                      <div className="truncate text-[13px] text-text">{event.camera_name || "—"}</div>
                      <div className="font-mono text-[11px] text-mute">
                        {event.confidence !== null ? `${event.confidence.toFixed(0)}% · ` : ""}
                        {event.video_id ? "có clip" : "không clip"}
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <SeverityBadge severity={event.severity} />
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[11px] text-dim tabular">{formatDateTime(event.created_at)}</div>
                      <div className="text-[11px] text-mute">{formatRelative(event.created_at)}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon={Siren} title="Không có cảnh báo">
            Không có sự kiện nào khớp bộ lọc hiện tại.
          </Empty>
        )}
      </div>

      {data && data.events.length < data.total && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setLimit(limit + 50)} loading={isValidating}>
            Tải thêm ({data.total - data.events.length} còn lại)
          </Button>
        </div>
      )}

      <EventSheet eventId={focus} onClose={() => openEvent(null)} />
    </div>
  );
}
