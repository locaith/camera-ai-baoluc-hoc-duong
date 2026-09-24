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
  ScanFace,
  Square,
  X,
} from "lucide-react";

import { aiVerdict, CameraStateBadge, riskOf } from "@/components/camera/camera-bits";
import { useCameraActions } from "@/components/camera/camera-actions";
import { CameraTile } from "@/components/camera/camera-tile";
import { EventRow } from "@/components/events/event-bits";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Empty, Meter, Skeleton } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/form";
import { Tooltip } from "@/components/ui/menu";
import { useRole } from "@/lib/connection";
import { useCameras, useEvents } from "@/lib/hooks";
import { INCIDENT_TYPES } from "@/lib/labels";
import { useLiveStatus, useLiveThreshold } from "@/lib/live";
import { useRealtime } from "@/lib/realtime";
import type { AppEvent, Camera } from "@/lib/types";
import { cn } from "@/lib/utils";

type Layout = 1 | 4 | 9 | 16;

const LAYOUTS: { value: Layout; label: React.ReactNode; title: string }[] = [
  { value: 1, label: <Square />, title: "1 camera" },
  { value: 4, label: <Grid2x2 />, title: "4 camera" },
  { value: 9, label: <Grid3x3 />, title: "9 camera" },
  { value: 16, label: <LayoutGrid />, title: "16 camera" },
];

const GRID: Record<Layout, string> = {
  1: "grid-cols-1",
  4: "sm:grid-cols-2",
  9: "sm:grid-cols-2 lg:grid-cols-3",
  16: "sm:grid-cols-2 lg:grid-cols-4",
};

const STREAM_WIDTH: Record<Layout, number> = { 1: 1280, 4: 800, 9: 560, 16: 420 };

function TileAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={label} side="left">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70 [&_svg]:size-4"
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
  const verdict = aiVerdict(analysis, threshold);
  const risk = riskOf(analysis);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <CameraTile camera={camera} width={1280} fps={12} size="lg" />
      <Card className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow">Đang theo dõi</div>
            <div className="mt-1.5 truncate font-serif text-[24px] leading-tight text-ink">{camera.name}</div>
            <div className="mt-0.5 text-[13px] text-ink-3">{camera.location || (camera.virtual ? `Quay bởi ${camera.owner}` : "Chưa đặt vị trí")}</div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Thu nhỏ">
            <X />
          </Button>
        </div>
        <CameraStateBadge state={live?.state ?? camera.state} className="self-start" />

        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex items-center gap-2 text-[13px] text-ink-3">
            <ScanEye className="size-4" /> AI nhận định
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={cn("font-serif text-[24px]", verdict.level === 2 ? "text-critical" : "text-ink")}>{verdict.label}</span>
            <span className="text-sm text-ink-2 tabular">{analysis ? `${risk.toFixed(0)}%` : "—"}</span>
          </div>
          <Meter
            className="mt-3"
            value={risk}
            tone={verdict.level === 2 ? "critical" : verdict.level === 1 ? "warning" : "success"}
            label="Nguy cơ bắt nạt"
          />
          <div className="mt-2 text-xs text-ink-3">Cảnh báo khi nguy cơ từ {threshold}% trở lên</div>
        </div>

        {!camera.virtual && (
          <div className="grid grid-cols-2 gap-2">
            {isOperator &&
              (recording ? (
                <Button variant="danger" onClick={() => actions.stopRecording(camera)}>
                  <CircleDot /> Dừng ghi
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => actions.record(camera, 30)}>
                  <CircleDot className="text-critical" /> Ghi 30 giây
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
        )}
      </Card>
    </div>
  );
}

function AlertFeed() {
  const router = useRouter();
  const { recent } = useRealtime();
  const { data } = useEvents(`limit=20&type=${INCIDENT_TYPES.join(",")}`);
  const feed: AppEvent[] = [];
  const seen = new Set<string>();
  for (const event of [...recent, ...(data?.events ?? [])]) {
    if (seen.has(event.id) || !INCIDENT_TYPES.includes(event.type)) continue;
    seen.add(event.id);
    feed.push(event);
  }

  return (
    <Card padded={false} className="flex max-h-[calc(100dvh-200px)] min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <span className="font-serif text-[19px] text-ink">Diễn biến</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-3">
          <span className="size-1.5 animate-breathe rounded-full bg-success" /> Cập nhật tức thì
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {feed.length ? (
          feed.map((event) => (
            <EventRow key={event.id} event={event} compact onClick={() => router.push(`/incidents?focus=${event.id}&status=all`)} />
          ))
        ) : (
          <p className="px-4 py-12 text-center text-sm text-ink-3">Chưa có sự việc nào.</p>
        )}
      </div>
    </Card>
  );
}

export function LiveView() {
  const router = useRouter();
  const actions = useCameraActions();
  const { isOperator, isAdmin } = useRole();
  const { data } = useCameras();
  const wallRef = useRef<HTMLDivElement>(null);

  // AppShell chỉ render ở trình duyệt nên đọc localStorage ngay khi khởi tạo được
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const saved = Number(localStorage.getItem("camera-ai-live-layout"));
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
      localStorage.setItem("camera-ai-live-layout", String(value));
    } catch {
      /* ignore */
    }
  }

  // Điện thoại đang quay hiện đầu tiên
  const cameras = (data?.cameras ?? [])
    .filter((c) => c.enabled)
    .sort((a, b) => Number(Boolean(b.virtual)) - Number(Boolean(a.virtual)));
  const pages = Math.max(1, Math.ceil(cameras.length / layout));
  const current = Math.min(page, pages - 1);
  const visible = cameras.slice(current * layout, current * layout + layout);
  const focused = cameras.find((c) => c.id === focusId) ?? null;
  const online = cameras.filter((c) => c.state === "online").length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Giám sát"
        title="Trực tiếp"
        description={
          data
            ? cameras.length
              ? `${online}/${cameras.length} camera đang truyền hình ảnh. Bấm vào một camera để xem lớn.`
              : "Chưa có camera nào đang bật."
            : "Đang tải danh sách camera…"
        }
        actions={
          cameras.length > 0 && (
            <>
              <Segmented value={layout} onChange={changeLayout} options={LAYOUTS} className="hidden sm:inline-flex" />
              <Button variant={hud ? "secondary" : "ghost"} size="md" onClick={() => setHud(!hud)}>
                <ScanEye /> Nhận định AI
              </Button>
              <Button variant="ghost" size="icon" onClick={() => wallRef.current?.requestFullscreen?.()} aria-label="Toàn màn hình">
                <Expand />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden xl:inline-flex"
                onClick={() => setShowFeed(!showFeed)}
                aria-label={showFeed ? "Ẩn diễn biến" : "Hiện diễn biến"}
              >
                {showFeed ? <PanelRightClose /> : <PanelRightOpen />}
              </Button>
            </>
          )
        }
      />

      {!data ? (
        <Skeleton className="h-[60vh]" />
      ) : !cameras.length ? (
        <Card>
          <Empty
            icon={Cctv}
            title="Chưa có camera nào đang bật"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {isAdmin && (
                  <Button variant="secondary" asChild>
                    <Link href="/cameras?add=1">
                      <Plus /> Thêm camera
                    </Link>
                  </Button>
                )}
                <Button variant="primary" asChild>
                  <Link href="/capture">
                    <ScanFace /> Quay bằng điện thoại
                  </Link>
                </Button>
              </div>
            }
          >
            Thêm camera của trường, hoặc dùng điện thoại để quay tại chỗ — hình ảnh sẽ hiện tại đây.
          </Empty>
        </Card>
      ) : (
        <div className={cn("grid gap-5", showFeed && "xl:grid-cols-[minmax(0,1fr)_340px]")}>
          <div ref={wallRef} className="min-w-0 space-y-4 bg-canvas">
            {focused ? (
              <FocusPanel camera={focused} onClose={() => setFocusId(null)} />
            ) : (
              <>
                <div className={cn("grid gap-3 md:gap-4", GRID[layout])}>
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
                        !camera.virtual && (
                          <>
                            <TileAction label="Xem lớn" onClick={() => setFocusId(camera.id)}>
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
                        )
                      }
                    />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={() => setPage(Math.max(0, current - 1))} disabled={current === 0} aria-label="Trang trước">
                      <ChevronLeft />
                    </Button>
                    <span className="text-[13px] text-ink-2 tabular">
                      Trang {current + 1}/{pages}
                    </span>
                    <Button variant="ghost" size="icon-sm" onClick={() => setPage(Math.min(pages - 1, current + 1))} disabled={current >= pages - 1} aria-label="Trang sau">
                      <ChevronRight />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          {showFeed && (
            <div className="hidden min-h-0 xl:block">
              <AlertFeed />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
