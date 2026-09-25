"use client";

import { useState } from "react";
import Link from "next/link";
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
  ScanFace,
  Webcam,
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
import { revalidate, useDiscovered, useWebcams } from "@/lib/hooks";
import type { Camera, DiscoveredDevice, DiscoverySnapshot, RtspProbe, ServerWebcam } from "@/lib/types";

/** Đường dẫn luồng video + cách lấy mật khẩu theo hãng camera. */
export const BRANDS = [
  {
    id: "imou",
    label: "Imou",
    path: "/cam/realmonitor?channel=1&subtype=0",
    hint: "Tài khoản là admin, mật khẩu là Mã an toàn (Safety code) in trên tem dán dưới đáy camera — nếu chưa đổi trong ứng dụng Imou. Nhập sai 5 lần camera sẽ tạm khoá khoảng 30 phút.",
  },
  {
    id: "dahua",
    label: "Dahua / KBVision",
    path: "/cam/realmonitor?channel=1&subtype=0",
    hint: "Dùng tài khoản admin và mật khẩu đã đặt khi cài đặt camera.",
  },
  {
    id: "hikvision",
    label: "Hikvision / HiLook",
    path: "/Streaming/Channels/101",
    hint: "Dùng tài khoản admin và mật khẩu kích hoạt camera.",
  },
  {
    id: "ezviz",
    label: "EZVIZ",
    path: "/h264/ch1/main/av_stream",
    hint: "Tài khoản là admin, mật khẩu là Mã xác minh (Verification code) 6 chữ in hoa trên tem dán camera.",
  },
  {
    id: "tapo",
    label: "TP-Link Tapo / VIGI",
    path: "/stream1",
    hint: "Trong ứng dụng Tapo: Cài đặt camera → Cài đặt nâng cao → Tài khoản camera. Tạo tài khoản rồi nhập vào đây.",
  },
  {
    id: "generic",
    label: "Hãng khác",
    path: "/live",
    hint: "Xem tài khoản trong hướng dẫn hoặc ứng dụng của hãng. Camera không đặt mật khẩu thì để trống.",
  },
] as const;

type BrandId = (typeof BRANDS)[number]["id"];

function brandIdFor(name?: string): BrandId {
  const key = (name ?? "").toLowerCase();
  if (key.includes("imou")) return "imou";
  if (key.includes("dahua") || key.includes("kbvision")) return "dahua";
  if (key.includes("hikvision") || key.includes("hilook")) return "hikvision";
  if (key.includes("ezviz")) return "ezviz";
  if (key.includes("tp-link") || key.includes("tapo") || key.includes("vigi")) return "tapo";
  return "generic";
}

export function buildRtsp(ip: string, port: number, path: string, username: string, password: string) {
  const auth = username || password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";
  return `rtsp://${auth}${ip}:${port}${path}`;
}

/** Không bao giờ hiện tài khoản/mật khẩu nằm trong địa chỉ camera. */
export function maskSecrets(text: string) {
  return text.replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^/\s'"]+@/gi, "$1***:***@");
}

export function webcamLabel(url: string) {
  try {
    return decodeURIComponent(url.replace(/^webcam:\/\//i, "").split("?")[0]);
  } catch {
    return url;
  }
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

interface Failure {
  error: string;
  detail?: string;
}

function FailureNotice({ failure }: { failure: Failure }) {
  return (
    <Notice tone="critical" title="Chưa kết nối được">
      <span className="wrap-break-word">{maskSecrets(failure.error)}</span>
      {failure.detail && failure.detail !== "timeout" && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-ink-3">Chi tiết kỹ thuật</summary>
          <p className="mt-1 font-mono text-[11px] leading-relaxed break-all text-ink-3">{maskSecrets(failure.detail)}</p>
        </details>
      )}
    </Notice>
  );
}

function Preview({ probe }: { probe: RtspProbe }) {
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
      {probe?.success && <Preview probe={probe} />}
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

function OptionRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  added,
  tone = "brand",
}: {
  icon: typeof RadioTower;
  title: string;
  subtitle: string;
  onClick: () => void;
  added?: boolean;
  tone?: "brand" | "gold" | "neutral";
}) {
  const iconTone = {
    brand: "bg-brand-soft text-brand",
    gold: "bg-[#f5eee1] text-[#7a5f2c]",
    neutral: "bg-surface-3 text-ink-2",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={added}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-hairline bg-surface px-4 py-3 text-left transition-colors hover:border-hairline-2 hover:bg-surface-2 disabled:opacity-60"
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${iconTone}`}>
        <Icon className="size-4.5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-3">{subtitle}</span>
      </span>
      {added ? <Badge tone="success">Đã thêm</Badge> : <ChevronRight className="size-4 shrink-0 text-ink-3" />}
    </button>
  );
}

export function deviceTitle(device: DiscoveredDevice) {
  return [device.brand, device.model].filter(Boolean).join(" · ") || device.ip;
}

function SourceList({
  onDevice,
  onWebcam,
  onManual,
}: {
  onDevice: (device: DiscoveredDevice) => void;
  onWebcam: (webcam: ServerWebcam) => void;
  onManual: () => void;
}) {
  const { data, mutate } = useDiscovered(true);
  const { data: webcamData } = useWebcams(true);
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
  const webcams = [...(webcamData?.webcams ?? [])].sort((a, b) => Number(a.virtual) - Number(b.virtual));

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-ink">Camera trong mạng WiFi của trường</div>
            <div className="text-xs text-ink-3">
              {data?.scanned_at ? `Quét lần cuối ${formatRelative(data.scanned_at)}` : "Máy chủ đang quét mạng…"}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={rescan} loading={scanning}>
            {!scanning && <RefreshCw />} Quét lại
          </Button>
        </div>
        {scanning && (
          <p className="flex items-center gap-2 text-[13px] text-ink-2">
            <LoaderCircle className="size-4 animate-spin" /> Đang tìm camera (khoảng 5 giây)…
          </p>
        )}
        {devices.length ? (
          <div className="space-y-2">
            {devices.map((device) => (
              <OptionRow
                key={device.ip}
                icon={RadioTower}
                title={deviceTitle(device)}
                subtitle={`${device.ip} · ${device.kind === "onvif" ? "hỗ trợ kết nối nhanh" : "camera IP"}`}
                added={device.added}
                onClick={() => onDevice(device)}
              />
            ))}
          </div>
        ) : data && !scanning ? (
          <p className="text-[13px] text-ink-3">Chưa thấy camera nào. Hãy chắc chắn camera đã bật và cùng mạng WiFi với máy chủ.</p>
        ) : null}
      </section>

      {webcams.length > 0 && (
        <section className="space-y-3">
          <div>
            <div className="text-sm font-medium text-ink">Webcam gắn vào máy chủ</div>
            <div className="text-xs text-ink-3">Không cần tài khoản hay mật khẩu</div>
          </div>
          <div className="space-y-2">
            {webcams.map((webcam) => (
              <OptionRow
                key={webcam.name}
                icon={Webcam}
                tone="gold"
                title={webcam.name}
                subtitle={webcam.virtual ? "Webcam ảo — cần bật ứng dụng tạo webcam trước" : webcam.audio ? "Có micro · dùng được ngay" : "Dùng được ngay"}
                added={webcam.added}
                onClick={() => onWebcam(webcam)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <OptionRow
          icon={PenLine}
          tone="neutral"
          title="Nhập địa chỉ camera thủ công"
          subtitle="Khi camera ở mạng khác hoặc không tự tìm thấy"
          onClick={onManual}
        />
        <Link
          href="/capture"
          className="flex items-center gap-3.5 rounded-2xl bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-surface-3"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2">
            <ScanFace className="size-4.5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">Webcam của laptop, điện thoại khác?</span>
            <span className="block text-xs text-ink-3">Mở Quay tại chỗ ngay trên máy đó — không cần mật khẩu</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-3" />
        </Link>
      </section>
    </div>
  );
}

type Step =
  | { kind: "list" }
  | { kind: "device"; device: DiscoveredDevice }
  | { kind: "webcam"; webcam: ServerWebcam }
  | { kind: "manual" }
  | { kind: "details" };

export function AddCameraDialog({
  open,
  onOpenChange,
  device,
  webcam,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mở thẳng bước kết nối cho camera tìm thấy trong mạng */
  device?: DiscoveredDevice | null;
  /** Mở thẳng bước thêm webcam của máy chủ */
  webcam?: ServerWebcam | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <AddCameraBody
          key={device?.ip ?? webcam?.name ?? "new"}
          device={device ?? null}
          webcam={webcam ?? null}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function AddCameraBody({
  device,
  webcam,
  onDone,
}: {
  device: DiscoveredDevice | null;
  webcam: ServerWebcam | null;
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>(
    device ? { kind: "device", device } : webcam ? { kind: "webcam", webcam } : { kind: "list" },
  );
  const direct = Boolean(device || webcam);
  const [form, setForm] = useState<Details>(EMPTY);
  const [probe, setProbe] = useState<RtspProbe | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  // bước kết nối camera trong mạng
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [brand, setBrand] = useState<BrandId>(brandIdFor(device?.brand));
  const [manualUrl, setManualUrl] = useState("");

  function reset() {
    setFailure(null);
    setProbe(null);
  }

  async function test(rtspUrl: string) {
    return api<RtspProbe>("/api/cameras/test", { method: "POST", json: { rtsp_url: rtspUrl } });
  }

  function finish(rtspUrl: string, result: RtspProbe, extra: Partial<Details>) {
    setProbe(result);
    setForm((f) => ({ ...f, ...extra, rtsp_url: rtspUrl, audio_enabled: Boolean(result.has_audio) }));
    setStep({ kind: "details" });
  }

  async function connectDevice(target: DiscoveredDevice) {
    setBusy(true);
    reset();
    const failures: Failure[] = [];
    const fallbackName = [target.brand, target.model].filter(Boolean).join(" ") || `Camera ${target.ip}`;
    try {
      // 1) ONVIF: camera tự trả về địa chỉ luồng video đúng
      if (target.kind === "onvif" && target.onvif_port) {
        const result = await api<{ success: boolean; rtsp?: string; manufacturer?: string; model?: string; error?: string; detail?: string }>(
          "/api/cameras/rtsp",
          { method: "POST", json: { address: target.ip, port: target.onvif_port, username, password } },
        );
        if (result.success && result.rtsp) {
          const probed = await test(result.rtsp);
          if (probed.success) {
            finish(result.rtsp, probed, {
              name: [result.manufacturer || target.brand, result.model || target.model].filter(Boolean).join(" ") || fallbackName,
              manufacturer: result.manufacturer || target.brand || "",
              model: result.model || target.model || "",
            });
            return;
          }
          failures.push({ error: probed.error ?? "Chưa nhận được hình.", detail: probed.detail });
        } else {
          failures.push({ error: result.error ?? "Camera không trả lời.", detail: result.detail });
        }
      }
      // 2) Theo đường dẫn chuẩn của hãng
      const path = BRANDS.find((b) => b.id === brand)?.path ?? "/live";
      const url = buildRtsp(target.ip, target.rtsp_ports[0] ?? 554, path, username.trim(), password);
      const probed = await test(url);
      if (probed.success) {
        finish(url, probed, { name: fallbackName, manufacturer: target.brand ?? "", model: target.model ?? "" });
        return;
      }
      failures.push({ error: probed.error ?? "Chưa nhận được hình.", detail: probed.detail });
      // Ưu tiên báo sai mật khẩu vì đó là lỗi người dùng tự sửa được
      setFailure(failures.find((f) => f.error.startsWith("Sai tài khoản")) ?? failures[failures.length - 1]);
    } catch (e) {
      setFailure({ error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function connectWebcam(target: ServerWebcam) {
    setBusy(true);
    reset();
    try {
      const probed = await test(target.url);
      if (probed.success) {
        finish(target.url, probed, { name: `Webcam ${target.name}`, manufacturer: target.name });
        return;
      }
      setFailure({ error: probed.error ?? "Webcam không gửi hình.", detail: probed.detail });
    } catch (e) {
      setFailure({ error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function connectManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    reset();
    try {
      const url = manualUrl.trim();
      const probed = await test(url);
      if (probed.success) finish(url, probed, {});
      else setFailure({ error: probed.error ?? "Chưa nhận được hình.", detail: probed.detail });
    } catch (err) {
      setFailure({ error: (err as Error).message });
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

  const back = !direct && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3"
      onClick={() => {
        reset();
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

  if (step.kind === "webcam") {
    const target = step.webcam;
    return (
      <DialogContent title={`Thêm ${target.name}`} description="Webcam gắn vào máy chủ — không cần tài khoản hay mật khẩu." wide>
        <div className="space-y-5">
          {back}
          {busy ? (
            <p className="flex items-center gap-2 text-[13px] text-ink-2">
              <LoaderCircle className="size-4 animate-spin" /> Đang mở webcam và lấy hình…
            </p>
          ) : (
            !failure && <p className="text-sm text-ink-2">Máy chủ sẽ mở webcam và lấy thử một khung hình.</p>
          )}
          {failure && <FailureNotice failure={failure} />}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onDone}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" loading={busy} onClick={() => void connectWebcam(target)}>
              {!busy && (failure ? <RefreshCw /> : <Webcam />)} {failure ? "Thử lại" : "Kết nối webcam"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    );
  }

  if (step.kind === "device") {
    const target = step.device;
    const brandInfo = BRANDS.find((b) => b.id === brand) ?? BRANDS[BRANDS.length - 1];
    return (
      <DialogContent
        title={`Kết nối ${deviceTitle(target)}`}
        description={`${target.ip} · nhập tài khoản đăng nhập của camera.`}
        wide
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void connectDevice(target);
          }}
        >
          {back}
          <Field label="Hãng camera">
            <Select value={brand} onChange={(e) => setBrand(e.target.value as BrandId)}>
              {BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </Field>
          <Notice tone="info" icon={KeyRound} title="Mật khẩu camera ở đâu?">
            {brandInfo.hint}
          </Notice>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tài khoản camera">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Mật khẩu camera" hint="Để trống nếu camera không đặt mật khẩu.">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          {busy && (
            <p className="flex items-center gap-2 text-[13px] text-ink-2">
              <LoaderCircle className="size-4 animate-spin" /> Đang kết nối và lấy hình từ camera…
            </p>
          )}
          {failure && <FailureNotice failure={failure} />}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onDone}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {!busy && <Wifi />} Kết nối
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
                setFailure(null);
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
          {failure && <FailureNotice failure={failure} />}
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
    <DialogContent title="Thêm camera" description="Chọn camera máy chủ tìm thấy, hoặc webcam gắn vào máy chủ." wide>
      <SourceList
        onDevice={(d) => {
          setBrand(brandIdFor(d.brand));
          setStep({ kind: "device", device: d });
        }}
        onWebcam={(w) => {
          setStep({ kind: "webcam", webcam: w });
          void connectWebcam(w);
        }}
        onManual={() => setStep({ kind: "manual" })}
      />
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
  const isWebcam = camera.source === "webcam";

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
        {!isWebcam && (
          <div className="mt-5">
            {changeUrl ? (
              <Field label="Địa chỉ luồng video mới (RTSP)" hint={`Hiện tại: ${maskSecrets(camera.rtsp_url)}`}>
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
        )}
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
