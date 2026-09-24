"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  CircleCheck,
  KeyRound,
  LoaderCircle,
  PenLine,
  RadioTower,
  RefreshCw,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { SwitchRow } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { revalidate, useDiscovered } from "@/lib/hooks";
import type { Camera, DiscoveredDevice, DiscoverySnapshot, RtspProbe } from "@/lib/types";

/** Đường dẫn luồng video phổ biến theo hãng camera. */
export const BRANDS = [
  { id: "hikvision", label: "Hikvision / HiLook", path: "/Streaming/Channels/101" },
  { id: "dahua", label: "Dahua / KBVision / Imou", path: "/cam/realmonitor?channel=1&subtype=0" },
  { id: "ezviz", label: "EZVIZ (mật khẩu = mã xác minh)", path: "/h264/ch1/main/av_stream" },
  { id: "tapo", label: "TP-Link Tapo / VIGI", path: "/stream1" },
  { id: "generic", label: "Hãng khác (thử /live)", path: "/live" },
] as const;

export function buildRtsp(ip: string, port: number, path: string, username: string, password: string) {
  const auth = username || password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";
  return `rtsp://${auth}${ip}:${port}${path}`;
}

interface Details {
  name: string;
  location: string;
  rtsp_url: string;
  manufacturer: string;
  model: string;
  ai_enabled: boolean;
  record_on_event: boolean;
  audio_enabled: boolean;
}

const EMPTY: Details = {
  name: "",
  location: "",
  rtsp_url: "",
  manufacturer: "",
  model: "",
  ai_enabled: true,
  record_on_event: true,
  audio_enabled: true,
};

function Preview({ probe }: { probe: RtspProbe }) {
  if (!probe.success) {
    return (
      <Notice tone="critical" title="Chưa kết nối được camera">
        <span className="wrap-break-word whitespace-pre-line">{probe.error}</span>
      </Notice>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline">
      {probe.snapshot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={probe.snapshot} alt="Hình ảnh từ camera" className="aspect-video w-full bg-frame object-cover" />
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-success-soft px-4 py-2.5 text-[13px] text-success">
        <span className="flex items-center gap-1.5 font-medium">
          <CircleCheck className="size-4" /> Đã nhận hình
        </span>
        <span className="text-ink-2">
          {probe.width}×{probe.height} · {probe.has_audio ? "có âm thanh" : "không có âm thanh"}
        </span>
      </div>
    </div>
  );
}

function DetailsForm({
  form,
  setForm,
  probe,
}: {
  form: Details;
  setForm: (form: Details) => void;
  probe: RtspProbe | null;
}) {
  return (
    <div className="space-y-5">
      {probe && <Preview probe={probe} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên camera">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Hành lang tầng 2"
            required
          />
        </Field>
        <Field label="Vị trí">
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Toà A · cầu thang phía đông"
          />
        </Field>
      </div>
      <div className="grid gap-2.5">
        <SwitchRow
          label="AI phát hiện bắt nạt"
          hint="Phân tích hình ảnh liên tục trên máy chủ của trường"
          checked={form.ai_enabled}
          onCheckedChange={(v) => setForm({ ...form, ai_enabled: v })}
        />
        <SwitchRow
          label="Lưu đoạn video khi có sự việc"
          hint="Ghi vài giây trước và sau thời điểm phát hiện làm bằng chứng"
          checked={form.record_on_event}
          onCheckedChange={(v) => setForm({ ...form, record_on_event: v })}
        />
        <SwitchRow
          label="Nghe âm thanh"
          hint="Nhận biết la hét, lời nói tiêu cực (nếu camera có micro)"
          checked={form.audio_enabled}
          onCheckedChange={(v) => setForm({ ...form, audio_enabled: v })}
        />
      </div>
    </div>
  );
}

function DeviceRow({ device, onPick }: { device: DiscoveredDevice; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={device.added}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-hairline bg-surface px-4 py-3 text-left transition-colors hover:border-hairline-2 hover:bg-surface-2 disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <RadioTower className="size-4.5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink tabular">{device.ip}</span>
        <span className="block text-xs text-ink-3">
          {device.kind === "onvif" ? "Camera hỗ trợ ONVIF · kết nối nhanh" : "Có luồng video (RTSP)"}
        </span>
      </span>
      {device.added ? <Badge tone="success">Đã thêm</Badge> : <ChevronRight className="size-4 text-ink-3" />}
    </button>
  );
}

function DeviceList({ onPick, onManual }: { onPick: (device: DiscoveredDevice) => void; onManual: () => void }) {
  const { data, mutate } = useDiscovered(true);
  const [scanning, setScanning] = useState(false);

  async function rescan() {
    setScanning(true);
    try {
      const snapshot = await api<DiscoverySnapshot>("/api/cameras/discover", { method: "POST" });
      await mutate(snapshot, { revalidate: false });
    } catch (e) {
      toast.error("Chưa quét được mạng", { description: (e as Error).message });
    } finally {
      setScanning(false);
    }
  }

  const devices = data?.devices ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-ink-3">
          {data?.scanned_at ? `Quét lần cuối ${formatRelative(data.scanned_at)}` : "Máy chủ đang quét mạng của trường…"}
        </p>
        <Button size="sm" variant="secondary" onClick={rescan} loading={scanning}>
          {!scanning && <RefreshCw />} Quét lại
        </Button>
      </div>
      {scanning && (
        <p className="flex items-center gap-2 text-[13px] text-ink-2">
          <LoaderCircle className="size-4 animate-spin" /> Đang tìm camera trong mạng (khoảng 5 giây)…
        </p>
      )}
      {devices.length ? (
        <div className="space-y-2">
          {devices.map((device) => (
            <DeviceRow key={device.ip} device={device} onPick={() => onPick(device)} />
          ))}
        </div>
      ) : data && !scanning ? (
        <Notice tone="neutral" icon={Wifi} title="Chưa thấy camera nào">
          Hãy chắc chắn camera đã cắm điện và cùng mạng WiFi/LAN với máy chủ, rồi bấm Quét lại.
        </Notice>
      ) : null}
      <button
        type="button"
        onClick={onManual}
        className="flex w-full items-center gap-3.5 rounded-2xl border border-dashed border-hairline-2 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-2">
          <PenLine className="size-4.5" strokeWidth={1.75} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-ink">Nhập địa chỉ camera thủ công</span>
          <span className="block text-xs text-ink-3">Dùng khi camera ở mạng khác hoặc không tự tìm thấy</span>
        </span>
        <ChevronRight className="size-4 text-ink-3" />
      </button>
    </div>
  );
}

type Step = { kind: "list" } | { kind: "device"; device: DiscoveredDevice } | { kind: "manual" } | { kind: "details" };

export function AddCameraDialog({
  open,
  onOpenChange,
  device,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mở thẳng bước kết nối cho camera tìm thấy trong mạng */
  device?: DiscoveredDevice | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <AddCameraBody key={device?.ip ?? "new"} device={device ?? null} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function AddCameraBody({ device, onDone }: { device: DiscoveredDevice | null; onDone: () => void }) {
  const [step, setStep] = useState<Step>(device ? { kind: "device", device } : { kind: "list" });
  const [form, setForm] = useState<Details>(EMPTY);
  const [probe, setProbe] = useState<RtspProbe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // bước kết nối thiết bị
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [brand, setBrand] = useState<string>(BRANDS[0].id);
  const [manualUrl, setManualUrl] = useState("");

  async function test(rtspUrl: string, extra: Partial<Details> = {}) {
    const result = await api<RtspProbe>("/api/cameras/test", { method: "POST", json: { rtsp_url: rtspUrl } });
    setProbe(result);
    if (result.success) {
      setForm((f) => ({ ...f, ...extra, rtsp_url: rtspUrl }));
      setStep({ kind: "details" });
    } else {
      setError(result.error || "Camera không phản hồi.");
    }
  }

  async function connectDevice(target: DiscoveredDevice) {
    setBusy(true);
    setError("");
    setProbe(null);
    try {
      if (target.kind === "onvif" && target.onvif_port) {
        const result = await api<{ success: boolean; rtsp?: string; manufacturer?: string; model?: string; error?: string }>(
          "/api/cameras/rtsp",
          { method: "POST", json: { address: target.ip, port: target.onvif_port, username, password } },
        );
        if (result.success && result.rtsp) {
          await test(result.rtsp, {
            manufacturer: result.manufacturer ?? "",
            model: result.model ?? "",
            name: [result.manufacturer, result.model].filter(Boolean).join(" ") || `Camera ${target.ip}`,
          });
          return;
        }
        // ONVIF không trả lời: thử theo hãng
        if (!target.rtsp_ports.length) {
          setError(result.error || "Sai tài khoản hoặc mật khẩu camera.");
          return;
        }
      }
      const port = target.rtsp_ports[0] ?? 554;
      const path = BRANDS.find((b) => b.id === brand)?.path ?? "/live";
      await test(buildRtsp(target.ip, port, path, username, password), { name: `Camera ${target.ip}` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function connectManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setProbe(null);
    try {
      await test(manualUrl.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const camera = await api<Camera>("/api/cameras", { method: "POST", json: form });
      toast.success("Đã thêm camera", { description: `${camera.name} đang kết nối…` });
      revalidate("/api/cameras");
      onDone();
    } catch (err) {
      toast.error("Chưa thêm được camera", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3"
      onClick={() => {
        setError("");
        setProbe(null);
        setStep({ kind: "list" });
      }}
    >
      <ArrowLeft /> Quay lại
    </Button>
  );

  if (step.kind === "details") {
    return (
      <DialogContent title="Đặt tên camera" description="Camera đã kết nối. Đặt tên dễ nhớ để thầy cô nhận ra." wide>
        <form onSubmit={save}>
          <DetailsForm form={form} setForm={setForm} probe={probe} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onDone}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Thêm camera
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  }

  if (step.kind === "device") {
    const target = step.device;
    const onvif = target.kind === "onvif";
    return (
      <DialogContent title={`Kết nối ${target.ip}`} description="Nhập tài khoản đăng nhập của camera (in trên thân máy hoặc trong ứng dụng của hãng)." wide>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void connectDevice(target);
          }}
        >
          {!device && back}
          {!onvif && (
            <Field label="Hãng camera">
              <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
                {BRANDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tài khoản camera">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Mật khẩu camera">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          {busy && (
            <p className="flex items-center gap-2 text-[13px] text-ink-2">
              <LoaderCircle className="size-4 animate-spin" /> Đang kết nối và lấy hình từ camera…
            </p>
          )}
          {error && (
            <Notice tone="critical" title="Chưa kết nối được">
              <span className="wrap-break-word">{error}</span>
            </Notice>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onDone}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {!busy && <KeyRound />} Kết nối
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  }

  if (step.kind === "manual") {
    return (
      <DialogContent title="Nhập địa chỉ camera" description="Địa chỉ luồng video RTSP, thường có dạng rtsp://tài-khoản:mật-khẩu@IP:554/..." wide>
        <form className="space-y-5" onSubmit={connectManual}>
          {back}
          <Field label="Địa chỉ luồng video (RTSP)" hint="Xem trong hướng dẫn sử dụng hoặc ứng dụng của hãng camera.">
            <Input
              value={manualUrl}
              onChange={(e) => {
                setManualUrl(e.target.value);
                setError("");
              }}
              placeholder="rtsp://admin:matkhau@192.168.1.64:554/Streaming/Channels/101"
              className="font-mono text-[13px]"
              required
            />
          </Field>
          {busy && (
            <p className="flex items-center gap-2 text-[13px] text-ink-2">
              <LoaderCircle className="size-4 animate-spin" /> Đang mở luồng video…
            </p>
          )}
          {error && (
            <Notice tone="critical" title="Chưa kết nối được">
              <span className="wrap-break-word">{error}</span>
            </Notice>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onDone}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!manualUrl.trim()}>
              {!busy && <Wifi />} Kiểm tra kết nối
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  }

  return (
    <DialogContent title="Thêm camera" description="Chọn camera máy chủ tìm thấy trong mạng của trường." wide>
      <DeviceList onPick={(d) => setStep({ kind: "device", device: d })} onManual={() => setStep({ kind: "manual" })} />
    </DialogContent>
  );
}

export function EditCameraDialog({
  camera,
  onOpenChange,
}: {
  camera: Camera | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(camera)} onOpenChange={onOpenChange}>
      {camera && <EditCameraBody key={camera.id} camera={camera} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function EditCameraBody({ camera, onDone }: { camera: Camera; onDone: () => void }) {
  const [form, setForm] = useState<Details>({
    name: camera.name,
    location: camera.location,
    rtsp_url: "",
    manufacturer: camera.manufacturer,
    model: camera.model,
    ai_enabled: camera.ai_enabled,
    record_on_event: camera.record_on_event,
    audio_enabled: camera.audio_enabled,
  });
  const [saving, setSaving] = useState(false);
  const [changeUrl, setChangeUrl] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { rtsp_url, ...rest } = form;
      await api(`/api/cameras/${camera.id}`, {
        method: "PATCH",
        json: rtsp_url.trim() ? { ...rest, rtsp_url: rtsp_url.trim() } : rest,
      });
      toast.success("Đã lưu camera", { description: form.name });
      revalidate("/api/cameras");
      onDone();
    } catch (error) {
      toast.error("Chưa lưu được", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent title="Sửa camera" description={camera.location || camera.name} wide>
      <form onSubmit={save}>
        <DetailsForm form={form} setForm={setForm} probe={null} />
        <div className="mt-5">
          {changeUrl ? (
            <Field label="Địa chỉ luồng video mới (RTSP)" hint={`Hiện tại: ${camera.rtsp_url}`}>
              <Input
                value={form.rtsp_url}
                onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })}
                placeholder="rtsp://…"
                className="font-mono text-[13px]"
              />
            </Field>
          ) : (
            <button
              type="button"
              onClick={() => setChangeUrl(true)}
              className="text-[13px] font-medium text-brand underline-offset-4 hover:underline"
            >
              Đổi địa chỉ luồng video
            </button>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Nút "Kết nối" cho 1 thiết bị trong danh sách camera trong mạng. */
export function useConnectDevice() {
  const [device, setDevice] = useState<DiscoveredDevice | null>(null);
  return {
    device,
    connect: setDevice,
    dialog: (
      <AddCameraDialog open={Boolean(device)} device={device} onOpenChange={(open) => !open && setDevice(null)} />
    ),
  };
}

