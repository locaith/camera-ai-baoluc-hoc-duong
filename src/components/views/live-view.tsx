"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera as CameraIcon,
  ChevronLeft,
  ChevronRight,
  Cctv,
  CircleDot,
  Expand,
  Flag,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  ScanEye,
  Square,
  X,
} from "lucide-react";

import { useCameraActions } from "@/components/camera/camera-actions";
import { CameraStateBadge } from "@/components/camera/camera-bits";
import { CameraTile } from "@/components/camera/camera-tile";
import { EventRow } from "@/components/events/event-bits";
import { Button } from "@/components/ui/button";
import { Empty, Meter, Skeleton } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/form";
import { Tooltip } from "@/components/ui/menu";
import { useRole } from "@/lib/connection";
import { useCameras, useEvents } from "@/lib/hooks";
import { classLabel } from "@/lib/labels";
import { useLiveConnection, useLiveStatus, useLiveThreshold } from "@/lib/live";
import { useRealtime } from "@/lib/realtime";
import type { AppEvent, Camera } from "@/lib/types";
import { cn } from "@/lib/utils";

type Layout = 1 | 4 | 9 | 16;

const LAYOUTS: { value: Layout; label: React.ReactNode; title: string }[] = [
  { value: 1, label: <Square />, title: "1 camera" },
  { value: 4, label: <Grid2x2 />, title: "2×2" },
  { value: 9, label: <Grid3x3 />, title: "3×3" },
  { value: 16, label: <LayoutGrid />, title: "4×4" },
];

const GRID: Record<Layout, string> = {
  1: "grid-cols-1",
  4: "sm:grid-cols-2",
  9: "sm:grid-cols-2 lg:grid-cols-3",
  16: "sm:grid-cols-2 lg:grid-cols-4",
};

const STREAM_WIDTH: Record<Layout, number> = { 1: 1280, 4: 800, 9: 560, 16: 420 };

function TileAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label} side="left">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="grid size-8 place-items-center rounded-md border border-white/15 bg-black/60 text-white/85 backdrop-blur transition-colors hover:border-signal/60 hover:text-signal [&_svg]:size-4"
      >
        {children}
      </button>
    </Tooltip>
  );
}

function FocusPanel({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const actions = useCameraActions();
  const { isOperator } = useRole();
  const live = useLiveStatus(camera.id);
  const threshold = useLiveThreshold();
  const analysis = live?.analysis ?? camera.analysis;
  const recording = live?.recording ?? Boolean(camera.recording);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <CameraTile camera={camera} width={1280} fps={12} size="lg" />
      <div className="panel flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow">Đang theo dõi</div>
            <div className="mt-1 font-display text-lg font-semibold">{camera.name}</div>
            <div className="text-xs text-dim">{camera.location || "Chưa đặt vị trí"}</div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Thoát chế độ phóng to">
            <X />
          </Button>
        </div>
        <CameraStateBadge state={live?.state ?? camera.state} />

        <div className="rounded-md border border-line bg-bg/40 p-3">
          <div className="flex items-center gap-2 text-[13px] text-dim">
            <ScanEye className="size-4 text-signal" /> Nhận định AI
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-semibold">{classLabel(analysis?.class)}</span>
            <span className="font-mono text-sm text-dim tabular">
              {analysis ? `${analysis.confidence.toFixed(1)}%` : "—"}
            </span>
          </div>
          <Meter
            className="mt-2.5"
            value={analysis?.bullying ? analysis.confidence : 0}
            tone={analysis?.bullying && analysis.confidence >= threshold ? "critical" : "warning"}
            label="Độ tin cậy bắt nạt"
          />
          <div className="mt-1.5 text-[11px] text-mute">Ngưỡng cảnh báo {threshold}%</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {isOperator &&
            (recording ? (
              <Button variant="danger" onClick={() => actions.stopRecording(camera)}>
                <CircleDot /> Dừng ghi
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => actions.record(camera, 30)}>
                <CircleDot className="text-critical" /> Ghi 30s
              </Button>
            ))}
          <Button variant="secondary" onClick={() => actions.snapshot(camera)}>
            <CameraIcon /> Chụp ảnh
          </Button>
          {isOperator && (
            <Button variant="secondary" onClick={() => actions.mark(camera)}>
              <Flag /> Đánh dấu
            </Button>
          )}
          <Button variant="secondary" asChild>
            <Link href={`/cameras/${camera.id}`}>
              <Maximize2 /> Chi tiết
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AlertFeed() {
  const router = useRouter();
  const { recent } = useRealtime();
  const { data } = useEvents("limit=20&severity=warning,critical");
  const feed: AppEvent[] = [];
  const seen = new Set<string>();
  for (const event of [...recent, ...(data?.events ?? [])]) {
    if (seen.has(event.id) || event.severity === "info") continue;
    seen.add(event.id);
    feed.push(event);
  }

  return (
    <aside className="panel flex max-h-[calc(100vh-150px)] min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-display text-sm font-semibold tracking-wide">Cảnh báo trực tiếp</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-good uppercase">
          <span className="size-1.5 animate-pulse-soft rounded-full bg-good" /> SSE
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {feed.length ? (
          feed.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              compact
              onClick={() => router.push(`/events?focus=${event.id}`)}
            />
          ))
        ) : (
          <p className="px-4 py-10 text-center text-sm text-dim">Chưa có cảnh báo.</p>
        )}
      </div>
    </aside>
  );
}

export function LiveView() {
  const router = useRouter();
  const actions = useCameraActions();
  const { isOperator } = useRole();
  const { data } = useCameras();
  const connection = useLiveConnection();
  const wallRef = useRef<HTMLDivElement>(null);

  // AppShell chỉ render ở trình duyệt nên đọc localStorage ngay khi khởi tạo được
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const saved = Number(localStorage.getItem("bds-live-layout"));
      if ([1, 4, 9, 16].includes(saved)) return saved as Layout;
    } catch {
      /* ignore */
    }
    return 4;
  });
  const [page, setPage] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hud, setHud] = useState(true);
  const [showFeed, setShowFeed] = useState(true);

  function changeLayout(value: Layout) {
    setLayout(value);
    setPage(0);
    try {
      localStorage.setItem("bds-live-layout", String(value));
    } catch {
      /* ignore */
    }
  }

  const cameras = (data?.cameras ?? []).filter((c) => c.enabled);
  const pages = Math.max(1, Math.ceil(cameras.length / layout));
  const current = Math.min(page, pages - 1);
  const visible = cameras.slice(current * layout, current * layout + layout);
  const focused = cameras.find((c) => c.id === focusId) ?? null;

  if (!data) return <Skeleton className="h-[60vh]" />;

  if (!cameras.length) {
    return (
      <div className="panel">
        <Empty
          icon={Cctv}
          title="Chưa có camera nào đang bật"
          action={
            <Button variant="primary" asChild>
              <Link href="/cameras?add=1">
                <Plus /> Thêm camera
              </Link>
            </Button>
          }
        >
          Thêm camera hoặc bật lại camera trong trang Quản lý camera.
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={layout} onChange={changeLayout} options={LAYOUTS} />
        {pages > 1 && !focused && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setPage(Math.max(0, current - 1))} disabled={current === 0} aria-label="Trang trước">
              <ChevronLeft />
            </Button>
            <span className="font-mono text-xs text-dim tabular">
              {current + 1}/{pages}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => setPage(Math.min(pages - 1, current + 1))} disabled={current >= pages - 1} aria-label="Trang sau">
              <ChevronRight />
            </Button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-mute sm:inline">
            {cameras.length} camera ·{" "}
            <span className={connection === "open" ? "text-good" : "text-warning"}>
              {connection === "open" ? "luồng WS ổn định" : "đang nối luồng"}
            </span>
          </span>
          <Button variant={hud ? "outline" : "ghost"} size="sm" onClick={() => setHud(!hud)}>
            <ScanEye /> Lớp AI
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => wallRef.current?.requestFullscreen?.()}
            aria-label="Toàn màn hình"
          >
            <Expand />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden xl:inline-flex"
            onClick={() => setShowFeed(!showFeed)}
            aria-label={showFeed ? "Ẩn cảnh báo" : "Hiện cảnh báo"}
          >
            {showFeed ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-4", showFeed && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <div ref={wallRef} className="min-w-0 bg-bg">
          {focused ? (
            <FocusPanel camera={focused} onClose={() => setFocusId(null)} />
          ) : (
            <div className={cn("grid gap-3", GRID[layout])}>
              {visible.map((camera) => (
                <CameraTile
                  key={camera.id}
                  camera={camera}
                  width={STREAM_WIDTH[layout]}
                  fps={layout >= 9 ? 6 : 10}
                  size={layout >= 9 ? "sm" : layout === 1 ? "lg" : "md"}
                  hud={hud}
                  onSelect={() => setFocusId(camera.id)}
                  actions={
                    <>
                      <TileAction label="Phóng to" onClick={() => setFocusId(camera.id)}>
                        <Maximize2 />
                      </TileAction>
                      <TileAction label="Chụp ảnh" onClick={() => actions.snapshot(camera)}>
                        <CameraIcon />
                      </TileAction>
                      {isOperator && (
                        <TileAction label="Ghi 30 giây" onClick={() => actions.record(camera, 30)}>
                          <CircleDot />
                        </TileAction>
                      )}
                      <TileAction label="Chi tiết camera" onClick={() => router.push(`/cameras/${camera.id}`)}>
                        <ChevronRight />
                      </TileAction>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
        {showFeed && (
          <div className="hidden min-h-0 xl:block">
            <AlertFeed />
          </div>
        )}
      </div>
    </div>
  );
}
