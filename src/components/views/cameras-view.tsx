"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Cctv,
  CircleDot,
  EllipsisVertical,
  ExternalLink,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
} from "lucide-react";

import { useCameraActions } from "@/components/camera/camera-actions";
import { CameraStateBadge } from "@/components/camera/camera-bits";
import { AddCameraDialog, EditCameraDialog } from "@/components/camera/camera-dialogs";
import { Button } from "@/components/ui/button";
import { Confirm, Empty, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { api, mediaUrl } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatRelative } from "@/lib/format";
import { revalidate, useCameras } from "@/lib/hooks";
import { classLabel } from "@/lib/labels";
import type { Camera } from "@/lib/types";
import { cn } from "@/lib/utils";

function Thumb({ camera, tick }: { camera: Camera; tick: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded border border-line bg-[#050608]">
      {camera.state === "online" && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(`/api/cameras/${camera.id}/snapshot`, { w: 320, t: tick })}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid size-full place-items-center">
          <Cctv className="size-5 text-mute" />
        </div>
      )}
      {camera.recording && (
        <span className="absolute top-1 left-1 flex items-center gap-1 rounded bg-critical px-1 font-mono text-[9px] font-semibold text-white">
          <span className="size-1 animate-pulse-soft rounded-full bg-white" />
          REC
        </span>
      )}
    </div>
  );
}

function CameraRow({
  camera,
  tick,
  onEdit,
  onDelete,
}: {
  camera: Camera;
  tick: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const actions = useCameraActions();
  const { isAdmin, isOperator } = useRole();
  const a = camera.analysis;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-line/70 px-4 py-3 last:border-b-0 lg:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
      <Link href={`/cameras/${camera.id}`}>
        <Thumb camera={camera} tick={tick} />
      </Link>

      <div className="min-w-0">
        <Link href={`/cameras/${camera.id}`} className="block truncate font-medium text-text hover:text-signal">
          {camera.name}
        </Link>
        <div className="truncate text-xs text-dim">{camera.location || "Chưa đặt vị trí"}</div>
        <div className="mt-1 truncate font-mono text-[11px] text-mute">{camera.rtsp_url}</div>
      </div>

      <div className="hidden min-w-0 lg:block">
        <CameraStateBadge state={camera.state} />
        <div className="mt-1.5 font-mono text-[11px] text-mute">
          {camera.state === "online"
            ? `${camera.width}×${camera.height} · ${camera.codec.toUpperCase()} · ${camera.fps}fps`
            : camera.state === "error"
              ? `thử lại lần ${camera.reconnect_attempts}`
              : camera.connected_since
                ? formatRelative(camera.connected_since)
                : "—"}
        </div>
      </div>

      <div className="hidden min-w-0 lg:block">
        {camera.ai_enabled ? (
          <>
            <div className={cn("truncate text-[13px]", a?.bullying ? "text-critical" : "text-text")}>
              {classLabel(a?.class)}
            </div>
            <div className="font-mono text-[11px] text-mute">
              {a ? `${a.confidence.toFixed(1)}% · âm lượng ${camera.audio.level.toFixed(0)}%` : "chờ khung hình"}
            </div>
          </>
        ) : (
          <span className="text-xs text-mute">AI đang tắt</span>
        )}
      </div>

      <div className="hidden items-center gap-4 lg:flex">
        <label className="flex flex-col items-center gap-1 text-[10px] text-mute">
          <Switch
            disabled={!isAdmin}
            checked={camera.ai_enabled}
            onCheckedChange={(v) => actions.update(camera, { ai_enabled: v })}
            aria-label="Phân tích AI"
          />
          AI
        </label>
        <label className="flex flex-col items-center gap-1 text-[10px] text-mute">
          <Switch
            disabled={!isAdmin}
            checked={camera.record_on_event}
            onCheckedChange={(v) => actions.update(camera, { record_on_event: v })}
            aria-label="Ghi clip khi có sự kiện"
          />
          Ghi
        </label>
        <label className="flex flex-col items-center gap-1 text-[10px] text-mute">
          <Switch
            disabled={!isAdmin}
            checked={camera.audio_enabled}
            onCheckedChange={(v) => actions.update(camera, { audio_enabled: v })}
            aria-label="Phân tích âm thanh"
          />
          Âm
        </label>
      </div>

      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Thao tác ${camera.name}`}>
            <EllipsisVertical />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem asChild>
            <Link href={`/cameras/${camera.id}`}>
              <ExternalLink /> Mở chi tiết
            </Link>
          </MenuItem>
          {isAdmin && (
            <MenuItem onSelect={onEdit}>
              <Pencil /> Sửa
            </MenuItem>
          )}
          {isAdmin &&
            (camera.enabled ? (
              <MenuItem onSelect={() => actions.setPower(camera, false)}>
                <PowerOff /> Tắt camera
              </MenuItem>
            ) : (
              <MenuItem onSelect={() => actions.setPower(camera, true)}>
                <Power /> Bật camera
              </MenuItem>
            ))}
          {isOperator && (
            <MenuItem onSelect={() => actions.record(camera, 30)} disabled={camera.state !== "online"}>
              <CircleDot /> Ghi 30 giây
            </MenuItem>
          )}
          {isAdmin && (
            <>
              <MenuSeparator />
              <MenuItem danger onSelect={onDelete}>
                <Trash2 /> Xoá camera
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>
    </div>
  );
}

export function CamerasView() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAdmin } = useRole();
  const { data } = useCameras();
  const tick = useThumbTick();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(params.get("add") === "1" && isAdmin);
  const [editing, setEditing] = useState<Camera | null>(null);
  const [deleting, setDeleting] = useState<Camera | null>(null);
  const [busy, setBusy] = useState(false);

  const cameras = (data?.cameras ?? []).filter((camera) =>
    `${camera.name} ${camera.location} ${camera.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const online = data?.cameras.filter((c) => c.state === "online").length ?? 0;

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/cameras/${deleting.id}`, { method: "DELETE" });
      toast.success("Đã xoá camera", { description: deleting.name });
      revalidate("/api/cameras");
      setDeleting(null);
    } catch (error) {
      toast.error("Không xoá được", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, vị trí…"
            className="pl-9"
          />
        </div>
        <span className="font-mono text-xs text-mute">
          {online}/{data?.cameras.length ?? 0} trực tuyến
        </span>
        {isAdmin && (
          <Button variant="primary" className="ml-auto" onClick={() => setAdding(true)}>
            <Plus /> Thêm camera
          </Button>
        )}
      </div>

      <div className="panel overflow-hidden">
        <div className="hidden grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-4 border-b border-line bg-panel-2/60 px-4 py-2.5 lg:grid">
          <span className="eyebrow w-32">Hình ảnh</span>
          <span className="eyebrow">Camera</span>
          <span className="eyebrow">Trạng thái</span>
          <span className="eyebrow">Nhận định AI</span>
          <span className="eyebrow w-[132px]">AI · Ghi · Âm</span>
          <span className="w-8" />
        </div>
        {!data ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : cameras.length ? (
          cameras.map((camera) => (
            <CameraRow
              key={camera.id}
              camera={camera}
              tick={tick}
              onEdit={() => setEditing(camera)}
              onDelete={() => setDeleting(camera)}
            />
          ))
        ) : (
          <Empty
            icon={Cctv}
            title={search ? "Không có camera phù hợp" : "Chưa có camera"}
            action={
              !search &&
              isAdmin && (
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <Plus /> Thêm camera đầu tiên
                </Button>
              )
            }
          >
            {!search && "Nhập RTSP URL hoặc quét ONVIF để máy chủ tự tìm camera trong mạng LAN."}
          </Empty>
        )}
      </div>

      <AddCameraDialog
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open && params.get("add")) router.replace("/cameras");
        }}
      />
      <EditCameraDialog camera={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá camera?"
        description={
          <>
            Camera <b className="text-text">{deleting?.name}</b> sẽ ngừng giám sát. Cảnh báo và video đã lưu vẫn
            được giữ lại.
          </>
        }
        confirmLabel="Xoá camera"
        danger
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
}

/** Ảnh thu nhỏ làm mới mỗi 10 giây. */
function useThumbTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  return tick;
}
