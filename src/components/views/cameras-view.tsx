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
  RadioTower,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react";

import { useCameraActions } from "@/components/camera/camera-actions";
import { aiVerdict, CameraStateBadge } from "@/components/camera/camera-bits";
import { AddCameraDialog, EditCameraDialog } from "@/components/camera/camera-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Confirm, Empty, Skeleton } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { api, mediaUrl } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatRelative } from "@/lib/format";
import { revalidate, useCameras, useDiscovered, useSettings } from "@/lib/hooks";
import type { Camera, DiscoveredDevice, DiscoverySnapshot } from "@/lib/types";

/** Ảnh thu nhỏ làm mới mỗi 10 giây. */
function useThumbTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  return tick;
}

function Thumb({ camera, tick }: { camera: Camera; tick: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-frame sm:w-36">
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
          <Cctv className="size-5 text-white/35" strokeWidth={1.5} />
        </div>
      )}
      {camera.recording && (
        <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-critical px-1.5 py-0.5 text-[9.5px] font-semibold text-white">
          <span className="size-1 animate-breathe rounded-full bg-white" /> GHI
        </span>
      )}
    </div>
  );
}

function CameraRow({
  camera,
  tick,
  threshold,
  onEdit,
  onDelete,
}: {
  camera: Camera;
  tick: number;
  threshold: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const actions = useCameraActions();
  const { isAdmin, isOperator } = useRole();
  const verdict = aiVerdict(camera.analysis, threshold);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
      <Link href={`/cameras/${camera.id}`}>
        <Thumb camera={camera} tick={tick} />
      </Link>

      <div className="min-w-0">
        <Link href={`/cameras/${camera.id}`} className="block truncate text-[15px] font-medium text-ink hover:text-brand">
          {camera.name}
        </Link>
        <div className="mt-0.5 truncate text-[13px] text-ink-3">{camera.location || "Chưa đặt vị trí"}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:hidden">
          <CameraStateBadge state={camera.state} />
        </div>
      </div>

      <div className="hidden min-w-0 space-y-1.5 lg:block">
        <CameraStateBadge state={camera.state} />
        <div className={verdict.level === 2 && camera.state === "online" ? "text-xs text-critical" : "text-xs text-ink-3"}>
          {camera.state === "online"
            ? camera.ai_enabled
              ? `AI: ${verdict.label.toLowerCase()}`
              : "AI đang tắt"
            : camera.state === "error"
              ? `Đang thử kết nối lại (lần ${camera.reconnect_attempts})`
              : camera.connected_since
                ? `Hoạt động từ ${formatRelative(camera.connected_since)}`
                : "—"}
        </div>
      </div>

      <div className="hidden items-center gap-5 lg:flex">
        {[
          { key: "ai_enabled", label: "AI" },
          { key: "record_on_event", label: "Lưu clip" },
          { key: "audio_enabled", label: "Âm thanh" },
        ].map((item) => (
          <label key={item.key} className="flex flex-col items-center gap-1.5 text-[11px] text-ink-3">
            <Switch
              disabled={!isAdmin}
              checked={Boolean(camera[item.key as keyof Camera])}
              onCheckedChange={(v) => actions.update(camera, { [item.key]: v } as Partial<Camera>)}
              aria-label={item.label}
            />
            {item.label}
          </label>
        ))}
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
              <Pencil /> Sửa thông tin
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

function NetworkPanel({ onConnect }: { onConnect: (device: DiscoveredDevice) => void }) {
  const { data, mutate } = useDiscovered(true);
  const [scanning, setScanning] = useState(false);
  const fresh = (data?.devices ?? []).filter((d) => !d.added);

  async function rescan() {
    setScanning(true);
    try {
      const snapshot = await api<DiscoverySnapshot>("/api/cameras/discover", { method: "POST" });
      await mutate(snapshot, { revalidate: false });
      const count = snapshot.devices.filter((d) => !d.added).length;
      toast.success(count ? `Tìm thấy ${count} camera chưa kết nối` : "Không có camera mới trong mạng");
    } catch (e) {
      toast.error("Chưa quét được mạng", { description: (e as Error).message });
    } finally {
      setScanning(false);
    }
  }

  return (
    <Card className={fresh.length ? "ring-1 ring-brand/15" : undefined}>
      <CardHeader
        eyebrow="Cùng mạng WiFi của trường"
        title={fresh.length ? `${fresh.length} camera sẵn sàng kết nối` : "Tự tìm camera trong mạng"}
        description={
          data?.scanned_at
            ? `Máy chủ tự quét mạng mỗi 10 phút · lần cuối ${formatRelative(data.scanned_at)}`
            : "Máy chủ đang quét mạng lần đầu…"
        }
        action={
          <Button variant="secondary" size="sm" onClick={rescan} loading={scanning}>
            {!scanning && <RefreshCw />} Quét ngay
          </Button>
        }
      />
      {fresh.length > 0 && (
        <ul className="mt-5 grid gap-2.5 md:grid-cols-2">
          {fresh.map((device) => (
            <li key={device.ip} className="flex items-center gap-3.5 rounded-2xl border border-hairline bg-surface-2 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <RadioTower className="size-4.5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink tabular">{device.ip}</div>
                <div className="text-xs text-ink-3">{device.kind === "onvif" ? "Hỗ trợ kết nối nhanh (ONVIF)" : "Camera IP (RTSP)"}</div>
              </div>
              <Button variant="primary" size="sm" onClick={() => onConnect(device)}>
                Kết nối
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PhonesPanel({ phones }: { phones: Camera[] }) {
  if (!phones.length) return null;
  return (
    <Card>
      <CardHeader
        eyebrow="Quay tại chỗ"
        title="Điện thoại đang làm camera"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/live">Xem trực tiếp</Link>
          </Button>
        }
      />
      <ul className="mt-4 space-y-2">
        {phones.map((phone) => (
          <li key={phone.id} className="flex items-center gap-3.5 rounded-2xl bg-surface-2 px-4 py-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#f5eee1] text-[#7a5f2c]">
              <Smartphone className="size-4.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">{phone.name}</div>
              <div className="text-xs text-ink-3">Bắt đầu {formatRelative(phone.created_at)}</div>
            </div>
            <Badge tone="success" dot>
              Đang quay
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CamerasView() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAdmin } = useRole();
  const { data } = useCameras();
  const { data: settings } = useSettings();
  const tick = useThumbTick();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(params.get("add") === "1" && isAdmin);
  const [device, setDevice] = useState<DiscoveredDevice | null>(null);
  const [editing, setEditing] = useState<Camera | null>(null);
  const [deleting, setDeleting] = useState<Camera | null>(null);
  const [busy, setBusy] = useState(false);

  const all = data?.cameras ?? [];
  const phones = all.filter((c) => c.virtual);
  const fixed = all.filter((c) => !c.virtual);
  const cameras = fixed.filter((camera) =>
    `${camera.name} ${camera.location}`.toLowerCase().includes(search.toLowerCase()),
  );
  const online = fixed.filter((c) => c.state === "online").length;

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/cameras/${deleting.id}`, { method: "DELETE" });
      toast.success("Đã xoá camera", { description: deleting.name });
      revalidate("/api/cameras");
      setDeleting(null);
    } catch (error) {
      toast.error("Chưa xoá được", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hệ thống"
        title="Camera"
        description={
          data
            ? `${online}/${fixed.length} camera đang hoạt động. Máy chủ tự tìm camera mới trong cùng mạng WiFi của trường.`
            : "Đang tải danh sách camera…"
        }
        actions={
          isAdmin && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus /> Thêm camera
            </Button>
          )
        }
      />

      {isAdmin && <NetworkPanel onConnect={setDevice} />}
      <PhonesPanel phones={phones} />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <h2 className="font-serif text-[21px] text-ink">Camera của trường</h2>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, vị trí…" className="h-10 pl-10" />
          </div>
        </div>
        {!data ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : cameras.length ? (
          <div className="hairline-divide">
            {cameras.map((camera) => (
              <CameraRow
                key={camera.id}
                camera={camera}
                tick={tick}
                threshold={settings?.bullying_threshold ?? 70}
                onEdit={() => setEditing(camera)}
                onDelete={() => setDeleting(camera)}
              />
            ))}
          </div>
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
            {!search && "Chọn camera máy chủ tìm thấy trong mạng, hoặc nhập địa chỉ camera thủ công."}
          </Empty>
        )}
      </Card>

      <AddCameraDialog
        open={adding || Boolean(device)}
        device={device}
        onOpenChange={(open) => {
          if (open) return;
          setAdding(false);
          setDevice(null);
          if (params.get("add")) router.replace("/cameras");
        }}
      />
      <EditCameraDialog camera={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá camera này?"
        description={
          <>
            <b>{deleting?.name}</b> sẽ ngừng giám sát. Các sự việc và video đã lưu vẫn được giữ lại.
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
