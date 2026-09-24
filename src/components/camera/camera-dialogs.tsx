"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tabs } from "radix-ui";
import {
  CircleCheck,
  Link2,
  LoaderCircle,
  Radar,
  ScanSearch,
  TriangleAlert,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { revalidate } from "@/lib/hooks";
import type { Camera, DiscoveredCamera, RtspProbe } from "@/lib/types";
import { cn } from "@/lib/utils";

const RTSP_TEMPLATES = [
  { label: "Hikvision / HiLook", url: "rtsp://admin:MẬT_KHẨU@192.168.1.64:554/Streaming/Channels/101" },
  { label: "Dahua / KBVision / Imou", url: "rtsp://admin:MẬT_KHẨU@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0" },
  { label: "EZVIZ", url: "rtsp://admin:MÃ_XÁC_MINH@192.168.1.20:554/h264/ch1/main/av_stream" },
  { label: "TP-Link Tapo / VIGI", url: "rtsp://TÀI_KHOẢN:MẬT_KHẨU@192.168.1.30:554/stream1" },
  { label: "Xiaomi / Yi (firmware RTSP)", url: "rtsp://192.168.1.40:554/ch0_0.h264" },
];

interface CameraForm {
  name: string;
  location: string;
  rtsp_url: string;
  manufacturer: string;
  model: string;
  ai_enabled: boolean;
  record_on_event: boolean;
  audio_enabled: boolean;
}

const EMPTY: CameraForm = {
  name: "",
  location: "",
  rtsp_url: "",
  manufacturer: "",
  model: "",
  ai_enabled: true,
  record_on_event: true,
  audio_enabled: true,
};

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-line bg-bg/40 px-3 py-2.5">
      <span>
        <span className="block text-[13px] font-medium text-text">{label}</span>
        <span className="block text-xs text-mute">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ProbeResult({ probe }: { probe: RtspProbe }) {
  if (!probe.success) {
    return (
      <div className="flex gap-2.5 rounded-md border border-critical/30 bg-critical/5 p-3 text-xs text-critical">
        <TriangleAlert className="size-4 shrink-0" />
        <span className="font-mono break-all whitespace-pre-line">{probe.error}</span>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-good/30 bg-good/5">
      {probe.snapshot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={probe.snapshot} alt="Ảnh xem trước" className="aspect-video w-full bg-black object-contain" />
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 font-mono text-xs text-good">
        <span className="flex items-center gap-1.5">
          <CircleCheck className="size-3.5" /> Kết nối được
        </span>
        <span>
          {probe.width}×{probe.height}
        </span>
        <span>{probe.codec?.toUpperCase()}</span>
        <span>{probe.has_audio ? `Âm thanh ${probe.audio_codec?.toUpperCase()}` : "Không có âm thanh"}</span>
      </div>
    </div>
  );
}

function CameraFields({
  form,
  setForm,
  editing,
}: {
  form: CameraForm;
  setForm: (f: CameraForm) => void;
  editing?: Camera;
}) {
  const [probe, setProbe] = useState<RtspProbe | null>(null);
  const [testing, setTesting] = useState(false);

  async function test() {
    if (!form.rtsp_url.trim()) return;
    setTesting(true);
    setProbe(null);
    try {
      setProbe(await api<RtspProbe>("/api/cameras/test", { method: "POST", json: { rtsp_url: form.rtsp_url.trim() } }));
    } catch (error) {
      setProbe({ success: false, error: (error as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
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
      <Field
        label="RTSP URL"
        hint={
          editing
            ? `Hiện tại: ${editing.rtsp_url} — để trống nếu không đổi`
            : "Luồng chính (main stream) cho chất lượng tốt nhất; luồng phụ (sub stream) nhẹ hơn cho CPU."
        }
      >
        <div className="flex gap-2">
          <Input
            value={form.rtsp_url}
            onChange={(e) => {
              setForm({ ...form, rtsp_url: e.target.value });
              setProbe(null);
            }}
            placeholder="rtsp://user:pass@192.168.1.10:554/stream1"
            className="font-mono text-[13px]"
            required={!editing}
          />
          <Button type="button" variant="outline" onClick={test} loading={testing} disabled={!form.rtsp_url.trim()}>
            {!testing && <Wifi />} Kiểm tra
          </Button>
        </div>
      </Field>
      {!editing && (
        <Select
          className="w-full text-[13px] text-dim"
          value=""
          onChange={(e) => {
            if (e.target.value) setForm({ ...form, rtsp_url: e.target.value });
          }}
        >
          <option value="">Mẫu URL theo hãng camera…</option>
          {RTSP_TEMPLATES.map((t) => (
            <option key={t.label} value={t.url}>
              {t.label}
            </option>
          ))}
        </Select>
      )}
      {testing && (
        <div className="flex items-center gap-2 text-xs text-dim">
          <LoaderCircle className="size-3.5 animate-spin" /> Đang mở luồng và lấy 1 khung hình…
        </div>
      )}
      {probe && <ProbeResult probe={probe} />}
      <div className="grid gap-2">
        <ToggleRow
          label="Phân tích AI"
          hint="Phát hiện dấu hiệu bắt nạt liên tục trên máy chủ"
          checked={form.ai_enabled}
          onChange={(v) => setForm({ ...form, ai_enabled: v })}
        />
        <ToggleRow
          label="Ghi clip khi có sự kiện"
          hint="Lưu video trước/sau sự kiện vào kho, AI phân tích lại"
          checked={form.record_on_event}
          onChange={(v) => setForm({ ...form, record_on_event: v })}
        />
        <ToggleRow
          label="Phân tích âm thanh"
          hint="Mức la hét + lời nói tiêu cực (cần Whisper)"
          checked={form.audio_enabled}
          onChange={(v) => setForm({ ...form, audio_enabled: v })}
        />
      </div>
    </div>
  );
}

function DiscoverTab({ onPick }: { onPick: (form: Partial<CameraForm>) => void }) {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<DiscoveredCamera[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<DiscoveredCamera | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [fetching, setFetching] = useState(false);

  async function scan() {
    setScanning(true);
    setError("");
    setFound(null);
    setSelected(null);
    try {
      const result = await api<{ success: boolean; cameras: DiscoveredCamera[]; error?: string }>(
        "/api/cameras/discover",
        { method: "POST" },
      );
      if (!result.success) setError(result.error ?? "Không quét được.");
      setFound(result.cameras);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  async function fetchRtsp() {
    if (!selected) return;
    setFetching(true);
    setError("");
    try {
      const result = await api<{ success: boolean; rtsp?: string; manufacturer?: string; model?: string; error?: string }>(
        "/api/cameras/rtsp",
        { method: "POST", json: { address: selected.ip, port: selected.port, username, password } },
      );
      if (!result.success || !result.rtsp) {
        setError(result.error ?? "Camera không trả về RTSP.");
        return;
      }
      onPick({
        rtsp_url: result.rtsp,
        manufacturer: result.manufacturer ?? "",
        model: result.model ?? "",
        name: [result.manufacturer, result.model].filter(Boolean).join(" ") || `Camera ${selected.ip}`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-bg/40 p-3">
        <div className="text-xs text-dim">
          Máy chủ gửi WS-Discovery trong mạng LAN để tìm camera hỗ trợ ONVIF (mất khoảng 5 giây).
        </div>
        <Button type="button" variant="primary" onClick={scan} loading={scanning}>
          {!scanning && <Radar />} Quét LAN
        </Button>
      </div>

      {found && !found.length && !error && (
        <p className="text-center text-sm text-dim">
          Không tìm thấy camera ONVIF. Hãy bật ONVIF trong cài đặt camera hoặc dùng tab RTSP.
        </p>
      )}

      {found && found.length > 0 && (
        <ul className="space-y-1.5">
          {found.map((camera) => (
            <li key={`${camera.ip}:${camera.port}`}>
              <button
                type="button"
                onClick={() => setSelected(camera)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                  selected?.ip === camera.ip && selected.port === camera.port
                    ? "border-signal/60 bg-signal/5"
                    : "border-line hover:border-line-strong",
                )}
              >
                <ScanSearch className="size-4 text-signal" />
                <span className="flex-1">
                  <span className="block font-mono text-[13px] text-text">
                    {camera.ip}:{camera.port}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-mute">{camera.xaddr}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-3 rounded-md border border-line p-3">
          <div className="text-[13px] text-dim">
            Đăng nhập ONVIF cho <span className="font-mono text-text">{selected.ip}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tài khoản">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Mật khẩu">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          <Button type="button" variant="outline" onClick={fetchRtsp} loading={fetching}>
            {!fetching && <Link2 />} Lấy RTSP từ camera
          </Button>
        </div>
      )}

      {error && (
        <div className="flex gap-2.5 rounded-md border border-critical/30 bg-critical/5 p-3 text-xs text-critical">
          <TriangleAlert className="size-4 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}
    </div>
  );
}

export function AddCameraDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState("rtsp");
  const [form, setForm] = useState<CameraForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const camera = await api<Camera>("/api/cameras", { method: "POST", json: form });
      toast.success("Đã thêm camera", { description: `${camera.name} đang kết nối…` });
      revalidate("/api/cameras");
      setForm(EMPTY);
      onOpenChange(false);
    } catch (error) {
      toast.error("Không thêm được camera", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Thêm camera" description="Kết nối camera IP qua RTSP hoặc tự tìm bằng ONVIF" wide>
        <Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List className="mb-4 inline-flex rounded-md border border-line bg-bg/50 p-0.5">
            {[
              { value: "rtsp", label: "Nhập RTSP" },
              { value: "onvif", label: "Quét ONVIF" },
            ].map((t) => (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                className="h-8 rounded px-4 text-[13px] font-medium text-mute data-[state=active]:bg-panel-3 data-[state=active]:text-text"
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="onvif">
            <DiscoverTab
              onPick={(picked) => {
                setForm({ ...form, ...picked });
                setTab("rtsp");
                toast.success("Đã lấy RTSP từ camera", { description: "Kiểm tra kết nối rồi lưu." });
              }}
            />
          </Tabs.Content>
          <Tabs.Content value="rtsp">
            <form onSubmit={save}>
              <CameraFields form={form} setForm={setForm} />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Huỷ
                </Button>
                <Button type="submit" variant="primary" loading={saving}>
                  Lưu camera
                </Button>
              </DialogFooter>
            </form>
          </Tabs.Content>
        </Tabs.Root>
      </DialogContent>
    </Dialog>
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
  const [form, setForm] = useState<CameraForm>({
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
      toast.error("Không lưu được", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent title="Sửa camera" description={camera.id} wide>
      <form onSubmit={save}>
        <CameraFields form={form} setForm={setForm} editing={camera} />
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
