"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BrainCircuit,
  Cctv,
  CircleCheck,
  Cloud,
  CloudUpload,
  HardDrive,
  PlugZap,
  TriangleAlert,
} from "lucide-react";

import { StorageBadge } from "@/components/videos/video-bits";
import { Button } from "@/components/ui/button";
import { Meter, Skeleton, severityTone } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { SectionTitle } from "@/components/ui/stat-tile";
import { Switch } from "@/components/ui/switch";
import { api, query } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatBytes, formatDateTime, formatRelative } from "@/lib/format";
import { revalidate, useStorage, useVideos } from "@/lib/hooks";
import { AI_STATUS_LABELS, OFFLOAD_REASONS } from "@/lib/labels";
import type { OffloadResult, StorageSummary, Video } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Sơ đồ luồng dữ liệu: nguồn -> local -> AI -> R2, số liệu thật từ máy chủ. */
function Pipeline({ storage }: { storage: StorageSummary }) {
  const nodes = [
    { icon: Cctv, title: "Camera & tải lên", value: "Clip sự kiện · ghi tay · upload", tone: "text-dim" },
    {
      icon: HardDrive,
      title: "Bộ nhớ tạm (local)",
      value: `${storage.local.count} video · ${formatBytes(storage.local.bytes)}`,
      tone: "text-text",
    },
    {
      icon: BrainCircuit,
      title: "AI phân tích",
      value: storage.local.awaiting_ai ? `${storage.local.awaiting_ai} đang chờ` : "Hàng đợi trống",
      tone: storage.local.awaiting_ai ? "text-warning" : "text-good",
    },
    {
      icon: Cloud,
      title: "Cloudflare R2",
      value: storage.r2.enabled ? `${storage.r2.count} video · ${formatBytes(storage.r2.bytes)}` : "Chưa cấu hình",
      tone: storage.r2.enabled ? "text-info" : "text-mute",
    },
  ];

  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="eyebrow mb-5">Luồng lưu trữ video</div>
      <ol className="grid gap-4 md:grid-cols-4 md:gap-0">
        {nodes.map(({ icon: Icon, title, value, tone }, i) => (
          <li key={title} className="relative flex items-center gap-3 md:flex-col md:text-center">
            {i < nodes.length - 1 && (
              <div className="absolute top-6 left-[calc(50%+34px)] hidden h-px w-[calc(100%-68px)] overflow-hidden bg-line-strong md:block">
                <div className="h-full w-1/3 animate-[flow_2.2s_linear_infinite] bg-gradient-to-r from-transparent via-signal to-transparent" style={{ animationDelay: `${i * 0.5}s` }} />
              </div>
            )}
            <div
              className={cn(
                "brackets relative z-10 grid size-12 shrink-0 place-items-center rounded-lg border border-line bg-panel-2",
                i === 3 && !storage.r2.enabled && "opacity-50",
              )}
              style={{ "--bracket": i === 2 && storage.local.awaiting_ai ? "var(--warning)" : undefined } as React.CSSProperties}
            >
              <Icon className="size-5 text-signal" />
            </div>
            <div className="md:mt-3">
              <div className="text-[13px] font-semibold text-text">{title}</div>
              <div className={cn("mt-0.5 font-mono text-[11px]", tone)}>{value}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 max-w-3xl text-[13px] leading-relaxed text-dim">
        Mọi video được ghi vào ổ của máy chủ trước để AI xử lý ngay, không phụ thuộc Internet. Khi bộ nhớ tạm vượt{" "}
        <span className="text-text">{storage.policy.local_storage_max_gb} GB</span>
        {storage.policy.offload_after_hours > 0 && (
          <>
            {" "}hoặc video cũ hơn <span className="text-text">{storage.policy.offload_after_hours} giờ</span>
          </>
        )}
        , video đã phân tích xong được đẩy lên R2 (cũ nhất trước), kiểm tra kích thước rồi mới xoá bản local. Trang web
        vẫn phát được video trên R2 qua link ký tạm thời.
      </p>
    </div>
  );
}

function PolicyPanel({ storage }: { storage: StorageSummary }) {
  const { isAdmin } = useRole();
  const [auto, setAuto] = useState(storage.policy.auto_offload);
  const [maxGb, setMaxGb] = useState(String(storage.policy.local_storage_max_gb));
  const [hours, setHours] = useState(String(storage.policy.offload_after_hours));
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OffloadResult | null>(storage.policy.last_result);

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        json: { auto_offload: auto, local_storage_max_gb: Number(maxGb), offload_after_hours: Number(hours) },
      });
      toast.success("Đã lưu chính sách lưu trữ");
      revalidate("/api/storage");
      revalidate("/api/settings");
    } catch (e) {
      toast.error("Không lưu được", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function runNow(force: boolean) {
    setRunning(true);
    try {
      const res = await api<OffloadResult>("/api/storage/offload", { method: "POST", json: { force } });
      setResult(res);
      if (res.error) toast.error(res.error);
      else toast.success(`Đã đẩy ${res.offloaded.length} video lên R2`, {
        description: res.errors.length ? `${res.errors.length} lỗi` : undefined,
      });
      revalidate("/api/storage");
      revalidate("/api/videos");
    } catch (e) {
      toast.error("Đồng bộ thất bại", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="panel p-4 md:p-5">
      <SectionTitle eyebrow="Tự động" title="Chính sách đẩy lên R2" />
      {!isAdmin && <p className="mt-2 text-xs text-mute">Chỉ quản trị viên được thay đổi chính sách.</p>}
      <div className="mt-4 space-y-4">
        <fieldset disabled={!isAdmin} className="space-y-4 disabled:opacity-60">
        <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-bg/40 px-3 py-2.5">
          <span>
            <span className="block text-[13px] font-medium">Tự động đẩy lên R2</span>
            <span className="block text-xs text-mute">Chạy nền mỗi {storage.policy.interval_minutes} phút và sau mỗi video AI xử lý xong</span>
          </span>
          <Switch checked={auto} onCheckedChange={setAuto} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngưỡng bộ nhớ tạm (GB)" hint="Vượt ngưỡng → đẩy video cũ nhất tới khi còn 80%">
            <Input type="number" min={0.1} step={0.5} value={maxGb} onChange={(e) => setMaxGb(e.target.value)} />
          </Field>
          <Field label="Đẩy video cũ hơn (giờ)" hint="0 = chỉ đẩy theo dung lượng">
            <Input type="number" min={0} step={1} value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={save} loading={saving}>
            Lưu chính sách
          </Button>
          <Button onClick={() => runNow(false)} loading={running} disabled={!storage.r2.enabled}>
            Chạy chính sách ngay
          </Button>
          <Button variant="outline" onClick={() => runNow(true)} loading={running} disabled={!storage.r2.enabled}>
            <CloudUpload /> Đẩy tất cả lên R2
          </Button>
        </div>
        </fieldset>
        {(result || storage.policy.last_run) && (
          <div className="rounded-md border border-line bg-bg/40 p-3 text-xs">
            <div className="flex justify-between text-dim">
              <span>Lần chạy gần nhất</span>
              <span className="font-mono">{formatRelative(storage.policy.last_run)}</span>
            </div>
            {result?.error ? (
              <p className="mt-1.5 text-warning">{result.error}</p>
            ) : result ? (
              <p className="mt-1.5 text-text">
                Đẩy {result.offloaded.length} video
                {result.offloaded.length > 0 &&
                  ` (${[...new Set(result.offloaded.map((o) => OFFLOAD_REASONS[o.reason]))].join(", ")})`}
                {result.errors.length > 0 && <span className="text-critical"> · {result.errors.length} lỗi</span>}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function R2Panel({ storage }: { storage: StorageSummary }) {
  const { isAdmin } = useRole();
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const res = await api<{ success: boolean; error?: string }>("/api/storage/check", { method: "POST" });
      if (res.success) toast.success("Kết nối R2 tốt", { description: `Bucket ${storage.r2.bucket}` });
      else toast.error("R2 lỗi", { description: res.error });
      revalidate("/api/storage");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="panel p-4 md:p-5">
      <SectionTitle
        eyebrow="Lưu trữ đám mây"
        title="Cloudflare R2"
        action={
          storage.r2.enabled ? (
            <span className="flex items-center gap-1.5 text-xs text-good">
              <CircleCheck className="size-3.5" /> Đã cấu hình
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-warning">
              <TriangleAlert className="size-3.5" /> Chưa cấu hình
            </span>
          )
        }
      />
      {storage.r2.enabled ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-line bg-bg/40 p-3">
              <div className="text-xs text-dim">Video trên R2</div>
              <div className="mt-1 text-2xl font-semibold">{storage.r2.count}</div>
            </div>
            <div className="rounded-md border border-line bg-bg/40 p-3">
              <div className="text-xs text-dim">Dung lượng</div>
              <div className="mt-1 text-2xl font-semibold">{formatBytes(storage.r2.bytes)}</div>
            </div>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-dim">
            <div>bucket: <span className="text-text">{storage.r2.bucket}</span></div>
            <div className="break-all">endpoint: <span className="text-text">{storage.r2.endpoint}</span></div>
            {storage.r2.prefix && <div>prefix: <span className="text-text">{storage.r2.prefix}</span></div>}
            {storage.r2.uploading > 0 && <div className="text-warning">đang đẩy: {storage.r2.uploading} video</div>}
          </div>
          {storage.r2.error && (
            <p className="rounded border border-critical/30 bg-critical/5 p-2 font-mono text-[11px] break-all text-critical">
              {storage.r2.error}
            </p>
          )}
          {isAdmin && (
            <Button size="sm" onClick={check} loading={checking}>
              <PlugZap /> Kiểm tra kết nối
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-[13px] text-dim">
          <p>Video hiện chỉ lưu local. Khi cần mở rộng, bật R2 trong 3 bước:</p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Cloudflare Dashboard → R2 → Create bucket (ví dụ <span className="font-mono text-text">camera-videos</span>).</li>
            <li>R2 → Manage API tokens → Create token quyền <span className="text-text">Object Read &amp; Write</span>.</li>
            <li>Điền vào file <span className="font-mono text-text">.env</span> của máy chủ rồi khởi động lại:</li>
          </ol>
          <pre className="overflow-x-auto rounded border border-line bg-bg p-3 font-mono text-[11px] leading-relaxed text-dim">
{`R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET=camera-videos`}
          </pre>
          {storage.r2.error && <p className="text-critical">{storage.r2.error}</p>}
        </div>
      )}
    </div>
  );
}

function VideoStorageRow({ video, r2Enabled }: { video: Video; r2Enabled: boolean }) {
  const { isAdmin } = useRole();
  const [busy, setBusy] = useState(false);

  async function offload() {
    setBusy(true);
    try {
      await api(`/api/videos/${video.id}/offload`, { method: "POST" });
      toast.success("Đã đẩy lên R2", { description: video.title });
      revalidate("/api/videos");
      revalidate("/api/storage");
    } catch (e) {
      toast.error("Không đẩy được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-line/70">
      <td className="max-w-0 px-3 py-2">
        <Link href={`/videos/${video.id}`} className="block truncate text-[13px] text-text hover:text-signal">
          {video.title}
        </Link>
        <div className="truncate font-mono text-[10px] text-mute">{video.object_key}</div>
      </td>
      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-dim">{formatBytes(video.size_bytes)}</td>
      <td className="hidden px-3 py-2 text-xs whitespace-nowrap text-dim md:table-cell">{AI_STATUS_LABELS[video.ai_status]}</td>
      <td className="hidden px-3 py-2 font-mono text-[11px] whitespace-nowrap text-mute lg:table-cell">
        {formatDateTime(video.created_at)}
      </td>
      <td className="px-3 py-2">
        <StorageBadge storage={video.storage} />
      </td>
      <td className="px-3 py-2 text-right">
        {isAdmin && video.storage === "local" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={offload}
            loading={busy}
            disabled={!r2Enabled || video.ai_status === "processing" || video.ai_status === "recording" || video.ai_status === "pending"}
          >
            <CloudUpload /> R2
          </Button>
        )}
      </td>
    </tr>
  );
}

export function StorageView() {
  const { data: storage } = useStorage();
  const [location, setLocation] = useState<"local" | "r2">("local");
  const { data: videos } = useVideos(query({ storage: location === "local" ? "local,uploading" : "r2", limit: 30 }));

  if (!storage) return <Skeleton className="h-[70vh]" />;

  const disk = storage.local.disk;
  const diskPercent = disk.total ? (disk.used / disk.total) * 100 : 0;

  return (
    <div className="space-y-5">
      <Pipeline storage={storage} />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="panel p-4 md:p-5">
          <SectionTitle eyebrow="Máy chủ" title="Bộ nhớ tạm (local)" />
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">{formatBytes(storage.local.bytes)}</span>
              <span className="text-xs text-dim">/ {formatBytes(storage.local.limit_bytes)} ngưỡng</span>
            </div>
            <Meter
              className="mt-2.5 h-2"
              value={storage.local.percent}
              tone={severityTone(storage.local.percent, 75, 95)}
              label="Mức dùng bộ nhớ tạm"
            />
            <div className="mt-1.5 text-xs text-mute">{storage.local.percent}% ngưỡng đẩy R2 · {storage.local.count} video</div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex justify-between text-xs">
              <span className="text-dim">Ổ đĩa chứa thư mục lưu trữ</span>
              <span className="font-mono text-text">còn {formatBytes(disk.free)}</span>
            </div>
            <Meter className="mt-2" value={diskPercent} tone={severityTone(diskPercent, 80, 92)} label="Ổ đĩa" />
            <div className="mt-2 font-mono text-[11px] break-all text-mute">{storage.local.path}</div>
          </div>
        </div>

        <R2Panel storage={storage} />
        <PolicyPanel key={`${storage.policy.local_storage_max_gb}-${storage.policy.offload_after_hours}-${storage.policy.auto_offload}`} storage={storage} />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <SectionTitle eyebrow="Tệp" title="Video theo nơi lưu" />
          <div className="flex rounded-md border border-line bg-bg/50 p-0.5">
            {(["local", "r2"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLocation(value)}
                className={cn(
                  "h-7 rounded px-3 text-xs font-medium",
                  location === value ? "bg-panel-3 text-text" : "text-mute hover:text-dim",
                )}
              >
                {value === "local" ? `Local (${storage.local.count})` : `R2 (${storage.r2.count})`}
              </button>
            ))}
          </div>
        </div>
        {videos?.videos.length ? (
          <table className="w-full table-fixed text-left">
            <thead className="bg-panel-2/60">
              <tr>
                <th className="eyebrow px-3 py-2">Video</th>
                <th className="eyebrow w-24 px-3 py-2">Dung lượng</th>
                <th className="eyebrow hidden w-32 px-3 py-2 md:table-cell">AI</th>
                <th className="eyebrow hidden w-44 px-3 py-2 lg:table-cell">Tạo lúc</th>
                <th className="eyebrow w-40 px-3 py-2">Nơi lưu</th>
                <th className="w-24 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {videos.videos.map((video) => (
                <VideoStorageRow key={video.id} video={video} r2Enabled={storage.r2.enabled} />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-10 text-center text-sm text-dim">
            {location === "local" ? "Bộ nhớ tạm trống." : "Chưa có video nào trên R2."}
          </p>
        )}
      </div>
    </div>
  );
}
