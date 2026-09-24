"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Cctv,
  CircleCheck,
  Clapperboard,
  Inbox,
  MonitorPlay,
  Plus,
  RadioTower,
  ScanFace,
} from "lucide-react";

import { CameraTile } from "@/components/camera/camera-tile";
import { EventsChart } from "@/components/charts/events-chart";
import { EventRow } from "@/components/events/event-bits";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Kpi, PageHeader } from "@/components/ui/card";
import { Empty, Meter, Skeleton, severityTone } from "@/components/ui/feedback";
import { useConnection, useRole } from "@/lib/connection";
import { formatBytes, formatLongDate, formatUptime, greeting } from "@/lib/format";
import { useCameras, useDiscovered, useEvents, useStats, useSystem } from "@/lib/hooks";
import { INCIDENT_TYPES } from "@/lib/labels";
import { cn } from "@/lib/utils";

function SystemCard() {
  const { data: system } = useSystem();
  const { data: stats } = useStats(24);
  const { data: discovered } = useDiscovered(true);
  if (!system || !stats) return <Skeleton className="h-64" />;
  const storage = stats.storage.local;
  const rows = [
    {
      label: "AI phân tích hình ảnh",
      ok: system.engine.running,
      value: system.engine.running ? "Đang chạy" : "Đang dừng",
    },
    {
      label: "Hàng đợi video",
      ok: system.processor.queued === 0,
      value: system.processor.queued ? `${system.processor.queued} video chờ` : "Trống",
    },
    { label: "Hoạt động liên tục", ok: true, value: formatUptime(system.uptime) },
  ];
  return (
    <Card>
      <CardHeader eyebrow="Quản trị" title="Hệ thống" />
      <ul className="hairline-divide mt-4">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="text-ink-2">{row.label}</span>
            <span className="flex items-center gap-2 text-ink">
              <span className={cn("size-1.5 rounded-full", row.ok ? "bg-success" : "bg-warning")} />
              {row.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-hairline pt-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-ink-2">Bộ nhớ video trên máy chủ</span>
          <span className="text-ink tabular">
            {formatBytes(storage.bytes)} / {formatBytes(storage.limit_bytes)}
          </span>
        </div>
        <Meter className="mt-2.5" value={storage.percent} tone={severityTone(storage.percent, 75, 90)} label="Bộ nhớ video" />
      </div>
      {discovered && discovered.new > 0 && (
        <Link
          href="/cameras"
          className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-[13px] text-brand transition-colors hover:bg-[#e3e8f8]"
        >
          <RadioTower className="size-4.5 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">
            Tìm thấy <b>{discovered.new}</b> camera mới trong mạng của trường
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}
    </Card>
  );
}

function CaptureCard() {
  return (
    <div className="grain relative overflow-hidden rounded-[20px] bg-[#0f1f5c] p-6 text-white shadow-lift">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(420px 260px at 100% 0%, rgba(64,110,255,0.55), transparent 65%)" }}
      />
      <div className="relative">
        <span className="grid size-11 place-items-center rounded-full bg-white/12 ring-1 ring-white/20">
          <ScanFace className="size-5" strokeWidth={1.75} />
        </span>
        <h3 className="mt-5 font-serif text-[23px] leading-snug">Điện thoại của thầy cô cũng là một camera AI</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
          Ở nơi chưa có camera? Mở Quay tại chỗ, hướng về khu vực cần quan sát — AI sẽ phân tích và báo ngay khi có dấu
          hiệu bắt nạt.
        </p>
        <Button asChild className="mt-5 bg-white text-ink hover:bg-white/90">
          <Link href="/capture">
            Bắt đầu quay <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function DashboardView() {
  const router = useRouter();
  const user = useConnection((s) => s.user);
  const { isAdmin } = useRole();
  const { data: day } = useStats(24);
  const { data: week } = useStats(168);
  const { data: cameraData } = useCameras();
  const { data: review } = useEvents(`status=new&type=${INCIDENT_TYPES.join(",")}&limit=5`);

  const cameras = cameraData?.cameras ?? [];
  const fixed = cameras.filter((c) => !c.virtual);
  const devices = cameras.filter((c) => c.virtual);
  const online = fixed.filter((c) => c.state === "online");
  const needs = day?.events.needs_review ?? 0;
  const name = user?.name?.trim() || "thầy cô";

  let summary = "Đang tải tình hình trong ngày…";
  if (day && cameraData) {
    if (needs > 0) summary = `Có ${needs} sự việc đang chờ thầy cô xem và ghi nhận.`;
    else if (!fixed.length)
      summary = "Chưa có camera cố định nào. Thầy cô có thể thêm camera hoặc dùng điện thoại để quay tại chỗ.";
    else summary = `Mọi thứ đang yên bình — ${online.length}/${fixed.length} camera hoạt động, không có sự việc nào chờ xem.`;
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      <PageHeader
        eyebrow={formatLongDate()}
        title={
          <>
            {greeting()},
            <br className="sm:hidden" /> <span className="italic">{name}</span>
          </>
        }
        description={summary}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/live">
                <MonitorPlay /> Xem trực tiếp
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/capture">
                <ScanFace /> Quay tại chỗ
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {!day ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-37.5" />)
        ) : (
          <>
            <Kpi
              label="Cần xem"
              icon={Inbox}
              tone={needs ? "critical" : "default"}
              value={needs}
              note={
                <Link href="/incidents" className="hover:text-ink">
                  {needs ? "Mở danh sách sự việc →" : "Không có gì chờ xem"}
                </Link>
              }
            />
            <Kpi
              label="Hôm nay"
              icon={CalendarDays}
              value={day.events.today}
              note="sự việc được phát hiện hoặc đánh dấu"
              style={{ animationDelay: "60ms" }}
            />
            <Kpi
              label="Camera hoạt động"
              icon={Cctv}
              tone={day.cameras.error ? "warning" : "success"}
              value={day.cameras.online}
              unit={`/ ${day.cameras.total}`}
              note={
                day.cameras.devices
                  ? `+ ${day.cameras.devices} điện thoại đang quay`
                  : day.cameras.error
                    ? `${day.cameras.error} camera mất tín hiệu`
                    : "Tất cả đang ổn định"
              }
              style={{ animationDelay: "120ms" }}
            />
            <Kpi
              label="Video đã phân tích"
              icon={Clapperboard}
              value={day.videos.processed}
              unit={`/ ${day.videos.total}`}
              note={day.videos.flagged ? `${day.videos.flagged} video có dấu hiệu` : "Chưa có video đáng lo ngại"}
              style={{ animationDelay: "180ms" }}
            />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5 lg:space-y-6">
          <Card>
            <CardHeader
              eyebrow="Ưu tiên"
              title="Cần xem ngay"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/incidents">
                    Tất cả <ArrowUpRight />
                  </Link>
                </Button>
              }
            />
            <div className="mt-3 -mx-2">
              {!review ? (
                <div className="space-y-2 px-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : review.events.length ? (
                review.events.map((event) => (
                  <EventRow key={event.id} event={event} onClick={() => router.push(`/incidents?focus=${event.id}`)} />
                ))
              ) : (
                <div className="flex items-center gap-3.5 px-2 py-6">
                  <span className="grid size-11 place-items-center rounded-full bg-success-soft text-success">
                    <CircleCheck className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <div className="text-[15px] font-medium text-ink">Không có sự việc nào chờ xem</div>
                    <div className="text-[13px] text-ink-3">Hệ thống sẽ báo ngay khi AI phát hiện dấu hiệu bất thường.</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="7 ngày qua" title="Sự việc theo ngày" />
            <div className="mt-5">
              {week ? <EventsChart data={week.events.timeline} bucket={week.bucket} /> : <Skeleton className="h-65" />}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:space-y-6">
          <Card>
            <CardHeader
              eyebrow="Trực tiếp"
              title="Camera đang xem"
              action={
                cameras.length > 0 && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/live">
                      Mở <ArrowUpRight />
                    </Link>
                  </Button>
                )
              }
            />
            <div className="mt-4">
              {!cameraData ? (
                <Skeleton className="aspect-video" />
              ) : cameras.length ? (
                <div className="grid gap-3">
                  {[...devices, ...online, ...fixed.filter((c) => c.state !== "online")].slice(0, 2).map((camera) => (
                    <CameraTile
                      key={camera.id}
                      camera={camera}
                      width={640}
                      fps={6}
                      size="sm"
                      onSelect={() => router.push(camera.virtual ? "/live" : `/cameras/${camera.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Cctv}
                  title="Chưa có camera"
                  className="py-8"
                  action={
                    isAdmin && (
                      <Button variant="primary" size="sm" asChild>
                        <Link href="/cameras?add=1">
                          <Plus /> Thêm camera
                        </Link>
                      </Button>
                    )
                  }
                >
                  Máy chủ sẽ tự tìm camera trong mạng WiFi của trường.
                </Empty>
              )}
            </div>
          </Card>

          <CaptureCard />

          {isAdmin && <SystemCard />}
        </div>
      </div>
    </div>
  );
}
