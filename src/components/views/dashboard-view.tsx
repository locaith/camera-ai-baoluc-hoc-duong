"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BrainCircuit,
  Cctv,
  Film,
  HardDrive,
  Plus,
  Siren,
  TriangleAlert,
} from "lucide-react";

import { CameraTile } from "@/components/camera/camera-tile";
import { EventsChart } from "@/components/charts/events-chart";
import { EventRow } from "@/components/events/event-bits";
import { Button } from "@/components/ui/button";
import { Empty, Meter, Skeleton, severityTone } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/form";
import { SectionTitle, StatTile } from "@/components/ui/stat-tile";
import { useRole } from "@/lib/connection";
import { formatBytes, formatUptime } from "@/lib/format";
import { useCameras, useStats, useSystem } from "@/lib/hooks";
import { classLabel } from "@/lib/labels";
import { useRealtime } from "@/lib/realtime";
import type { AppEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: 24, label: "24 giờ" },
  { value: 168, label: "7 ngày" },
  { value: 720, label: "30 ngày" },
];

function StatusLine({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-[13px]">
      <span className="text-dim">{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs text-text">
        {ok !== undefined && (
          <span className={cn("size-1.5 rounded-full", ok ? "bg-good" : "bg-mute")} aria-hidden />
        )}
        {value}
      </span>
    </div>
  );
}

function SystemPanel() {
  const { data: system } = useSystem();
  if (!system) return <Skeleton className="h-72" />;
  return (
    <div className="panel p-4">
      <SectionTitle eyebrow="Máy chủ" title="Trạng thái AI" />
      <div className="mt-3 divide-y divide-line/70">
        <StatusLine
          label="AI engine"
          ok={system.engine.running}
          value={system.engine.running ? `mỗi ${system.engine.interval}s · ${system.model.last_ms}ms` : "Dừng"}
        />
        <StatusLine label="Mô hình" value={`${system.model.architecture} · ${system.model.classes.length} lớp`} />
        <StatusLine
          label="Hàng đợi video"
          ok={system.processor.queued === 0}
          value={system.processor.current ? `đang xử lý · ${system.processor.queued} chờ` : `${system.processor.queued} chờ`}
        />
        <StatusLine
          label="Nhận dạng giọng nói"
          ok={system.speech.whisper}
          value={system.speech.whisper ? "Whisper" : "Chưa cài"}
        />
        <StatusLine label="Mã hoá clip" ok={Boolean(system.recorder.encoder)} value={system.recorder.encoder ?? "—"} />
        <StatusLine label="Hoạt động" value={formatUptime(system.uptime)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div>
          <div className="flex justify-between text-xs">
            <span className="text-dim">CPU</span>
            <span className="font-mono text-text tabular">{system.cpu.percent.toFixed(0)}%</span>
          </div>
          <Meter className="mt-2" value={system.cpu.percent} tone={severityTone(system.cpu.percent, 70, 90)} label="CPU" />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <span className="text-dim">RAM</span>
            <span className="font-mono text-text tabular">{system.memory.percent.toFixed(0)}%</span>
          </div>
          <Meter className="mt-2" value={system.memory.percent} tone={severityTone(system.memory.percent, 75, 90)} label="RAM" />
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [hours, setHours] = useState(24);
  const { data: stats } = useStats(hours);
  const { data: cameraData } = useCameras();
  const { recent } = useRealtime();

  const cameras = cameraData?.cameras ?? [];
  const byType = stats?.events.by_type ?? {};
  const alerts = (byType.bullying ?? 0) + (byType.toxic_speech ?? 0) + (byType.high_anger ?? 0);
  const critical = stats?.events.by_severity.critical ?? 0;
  const rangeLabel = RANGES.find((r) => r.value === hours)?.label ?? `${hours} giờ`;

  // Gộp sự kiện realtime (SSE) với danh sách từ máy chủ
  const feed: AppEvent[] = [];
  const seen = new Set<string>();
  for (const event of [...recent, ...(stats?.events.recent ?? [])]) {
    if (seen.has(event.id) || event.severity === "info") continue;
    seen.add(event.id);
    feed.push(event);
  }

  const topCameras = stats?.events.by_camera ?? [];
  const maxCamera = Math.max(1, ...topCameras.map((c) => c.n));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-dim">
          Tình hình an toàn trong <span className="text-text">{rangeLabel.toLowerCase()}</span> qua
          {cameras.some((c) => c.analysis?.bullying) && (
            <span className="ml-2 inline-flex items-center gap-1 text-critical">
              <TriangleAlert className="size-3.5" /> đang có camera nghi bắt nạt
            </span>
          )}
        </p>
        <Segmented value={hours} onChange={setHours} options={RANGES} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {!stats ? (
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[118px]" />)
        ) : (
          <>
            <StatTile
              label="Camera trực tuyến"
              icon={Cctv}
              tone={stats.cameras.error ? "warning" : "good"}
              value={stats.cameras.online}
              unit={`/ ${stats.cameras.total}`}
              note={`${stats.cameras.ai_enabled} bật AI · ${stats.cameras.recording} đang ghi`}
            />
            <StatTile
              label={`Cảnh báo ${rangeLabel.toLowerCase()}`}
              icon={Siren}
              value={alerts}
              note={`${critical} nghiêm trọng · ${byType.bullying ?? 0} bắt nạt`}
              style={{ animationDelay: "60ms" }}
            />
            <StatTile
              label="Chưa xử lý"
              icon={TriangleAlert}
              tone={stats.events.unacknowledged ? "critical" : "default"}
              value={stats.events.unacknowledged}
              note={
                <Link href="/events?status=open" className="hover:text-text">
                  Mở danh sách cảnh báo →
                </Link>
              }
              style={{ animationDelay: "120ms" }}
            />
            <StatTile
              label="Video đã phân tích"
              icon={Film}
              value={stats.videos.processed}
              unit={`/ ${stats.videos.total}`}
              note={`${stats.videos.flagged} có dấu hiệu · ${stats.videos.queued} chờ AI`}
              style={{ animationDelay: "180ms" }}
            />
            <StatTile
              label="Bộ nhớ tạm (local)"
              icon={HardDrive}
              tone={stats.storage.local.percent >= 90 ? "warning" : "default"}
              value={formatBytes(stats.storage.local.bytes)}
              note={`${stats.storage.local.percent}% ngưỡng · R2 ${formatBytes(stats.storage.r2.bytes)}`}
              style={{ animationDelay: "240ms" }}
              className="col-span-2 md:col-span-1"
            >
              <Meter
                className="mt-3"
                value={stats.storage.local.percent}
                tone={severityTone(stats.storage.local.percent, 75, 90)}
                label="Dung lượng local"
              />
            </StatTile>
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <div className="panel p-4 md:p-5">
            <SectionTitle eyebrow={`Theo ${hours <= 72 ? "giờ" : "ngày"}`} title="Hoạt động cảnh báo" className="mb-4" />
            {stats ? (
              <EventsChart data={stats.events.timeline} bucket={stats.bucket} />
            ) : (
              <Skeleton className="h-[280px]" />
            )}
          </div>

          <div className="panel p-4 md:p-5">
            <SectionTitle
              eyebrow="WebSocket · 8 fps"
              title="Camera trực tiếp"
              className="mb-4"
              action={
                cameras.length > 0 && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/live">
                      Mở màn hình giám sát <ArrowUpRight />
                    </Link>
                  </Button>
                )
              }
            />
            {cameras.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {cameras.slice(0, 4).map((camera) => (
                  <CameraTile
                    key={camera.id}
                    camera={camera}
                    width={480}
                    size="sm"
                    onSelect={() => router.push(`/cameras/${camera.id}`)}
                  />
                ))}
              </div>
            ) : cameraData ? (
              <Empty
                icon={Cctv}
                title="Chưa có camera"
                action={
                  isAdmin && (
                    <Button variant="primary" asChild>
                      <Link href="/cameras?add=1">
                        <Plus /> Thêm camera
                      </Link>
                    </Button>
                  )
                }
              >
                Thêm camera IP qua RTSP hoặc quét ONVIF trong mạng LAN để bắt đầu giám sát.
              </Empty>
            ) : (
              <Skeleton className="h-60" />
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="panel p-4">
            <SectionTitle
              eyebrow="Realtime"
              title="Cảnh báo mới nhất"
              action={
                <Link href="/events" className="text-xs text-signal hover:underline">
                  Tất cả
                </Link>
              }
            />
            <div className="mt-3 space-y-1">
              {feed.length ? (
                feed.slice(0, 7).map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    compact
                    onClick={() => router.push(`/events?focus=${event.id}`)}
                  />
                ))
              ) : (
                <p className="py-8 text-center text-sm text-dim">Chưa có cảnh báo nào.</p>
              )}
            </div>
          </div>

          <SystemPanel />

          <div className="panel p-4">
            <SectionTitle eyebrow={rangeLabel} title="Camera nhiều cảnh báo nhất" />
            <div className="mt-4 space-y-3">
              {topCameras.length ? (
                topCameras.map((camera) => (
                  <Link
                    key={camera.camera_id}
                    href={`/cameras/${camera.camera_id}`}
                    className="block rounded hover:bg-panel-2/60"
                  >
                    <div className="flex justify-between text-[13px]">
                      <span className="truncate text-dim">{camera.camera_name}</span>
                      <span className="font-mono text-text tabular">{camera.n}</span>
                    </div>
                    <Meter className="mt-1.5" value={(camera.n / maxCamera) * 100} tone="neutral" />
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-dim">Không có dữ liệu.</p>
              )}
            </div>
          </div>

          {cameras.some((c) => c.analysis) && (
            <div className="panel p-4">
              <SectionTitle eyebrow="Mô hình hình ảnh" title="Nhận định hiện tại" />
              <ul className="mt-3 space-y-2">
                {cameras.map((camera) => (
                  <li key={camera.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <BrainCircuit className={cn("size-3.5 shrink-0", camera.analysis?.bullying ? "text-critical" : "text-mute")} />
                      <span className="truncate text-dim">{camera.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-text">
                      {camera.analysis ? `${classLabel(camera.analysis.class)} ${camera.analysis.confidence.toFixed(0)}%` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
