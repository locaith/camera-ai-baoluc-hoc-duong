"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BrainCircuit, Cctv, CircleCheck, Cloud, CloudUpload, HardDrive, PlugZap, TriangleAlert } from "lucide-react";

import { StorageBadge } from "@/components/videos/video-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Meter, Skeleton, severityTone } from "@/components/ui/feedback";
import { Field, Input, Segmented } from "@/components/ui/form";
import { SwitchRow } from "@/components/ui/switch";
import { api, query } from "@/lib/api";
import { useRole } from "@/lib/connection";
import { formatBytes, formatRelative, formatWhen } from "@/lib/format";
import { revalidate, useStorage, useVideos } from "@/lib/hooks";
import { AI_STATUS_LABELS, OFFLOAD_REASONS } from "@/lib/labels";
import type { OffloadResult, StorageSummary, Video } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Hành trình của một video: camera -> máy chủ trường -> AI -> đám mây (số liệu thật). */
function Journey({ storage }: { storage: StorageSummary }) {
  const nodes = [
    { icon: Cctv, title: "Ghi hình", value: "Clip sự việc · quay tại chỗ · tải lên" },
    { icon: HardDrive, title: "Máy chủ của trường", value: `${storage.local.count} video · ${formatBytes(storage.local.bytes)}` },
    {
      icon: BrainCircuit,
      title: "AI xem lại",
      value: storage.local.awaiting_ai ? `${storage.local.awaiting_ai} video đang chờ` : "Không có video chờ",
    },
    {
      icon: Cloud,
      title: "Lưu trữ đám mây",
      value: storage.r2.enabled ? `${storage.r2.count} video · ${formatBytes(storage.r2.bytes)}` : "Chưa bật",
      muted: !storage.r2.enabled,
    },
  ];

  return (
    <Card>
      <ol className="grid gap-6 md:grid-cols-4 md:gap-0">
        {nodes.map(({ icon: Icon, title, value, muted }, i) => (
          <li key={title} className={cn("relative flex items-center gap-4 md:flex-col md:text-center", muted && "opacity-55")}>
            {i < nodes.length - 1 && (
              <span aria-hidden className="absolute top-6 left-[calc(50%+36px)] hidden h-px w-[calc(100%-72px)] bg-hairline-2 md:block" />
            )}
            <span className="relative grid size-12 shrink-0 place-items-center rounded-full border border-hairline bg-surface-2 text-ink-2">
              <Icon className="size-5" strokeWidth={1.6} />
            </span>
            <div className="md:mt-4">
              <div className="text-sm font-medium text-ink">{title}</div>
              <div className="mt-0.5 text-[13px] text-ink-3">{value}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-7 max-w-3xl border-t border-hairline pt-5 text-sm leading-relaxed text-ink-2">
        Video được lưu trên máy chủ của trường trước để AI xem ngay, không phụ thuộc Internet. Khi bộ nhớ vượt{" "}
        <b className="font-medium text-ink">{storage.policy.local_storage_max_gb} GB</b>
        {storage.policy.offload_after_hours > 0 && (
          <>
            {" "}hoặc video đã lưu quá <b className="font-medium text-ink">{storage.policy.offload_after_hours} giờ</b>
          </>
        )}
        , những video AI đã xem xong được chuyển lên lưu trữ đám mây (cũ nhất trước) và vẫn xem được như bình thường.
      </p>
    </Card>
  );
}

function PolicyCard({ storage }: { storage: StorageSummary }) {
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
      toast.error("Chưa lưu được", { description: (e as Error).message });
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
      else
        toast.success(`Đã chuyển ${res.offloaded.length} video lên đám mây`, {
          description: res.errors.length ? `${res.errors.length} video chưa chuyển được` : undefined,
        });
      revalidate("/api/storage");
      revalidate("/api/videos");
    } catch (e) {
      toast.error("Chưa chuyển được", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader eyebrow="Tự động" title="Chính sách chuyển video" />
      <fieldset disabled={!isAdmin} className="mt-5 space-y-4 disabled:opacity-60">
        <SwitchRow
          label="Tự chuyển video lên đám mây"
          hint={`Kiểm tra mỗi ${storage.policy.interval_minutes} phút và sau mỗi video AI xem xong`}
          checked={auto}
          onCheckedChange={setAuto}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Giới hạn bộ nhớ trên máy chủ (GB)" hint="Vượt giới hạn → chuyển video cũ nhất tới khi còn 80%">
            <Input type="number" min={0.1} step={0.5} value={maxGb} onChange={(e) => setMaxGb(e.target.value)} />
          </Field>
          <Field label="Chuyển video cũ hơn (giờ)" hint="0 = chỉ chuyển khi bộ nhớ đầy">
            <Input type="number" min={0} step={1} value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={save} loading={saving}>
            Lưu chính sách
          </Button>
          <Button onClick={() => runNow(false)} loading={running} disabled={!storage.r2.enabled}>
            Chạy ngay
          </Button>
          <Button variant="ghost" onClick={() => runNow(true)} loading={running} disabled={!storage.r2.enabled}>
            <CloudUpload /> Chuyển tất cả
          </Button>
        </div>
      </fieldset>
      {(result || storage.policy.last_run) && (
        <div className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-[13px]">
          <div className="flex justify-between text-ink-3">
            <span>Lần chạy gần nhất</span>
            <span>{formatRelative(storage.policy.last_run)}</span>
          </div>
          {result?.error ? (
            <p className="mt-1.5 text-warning">{result.error}</p>
          ) : result ? (
            <p className="mt-1.5 text-ink">
              Đã chuyển {result.offloaded.length} video
              {result.offloaded.length > 0 && ` (${[...new Set(result.offloaded.map((o) => OFFLOAD_REASONS[o.reason]))].join(", ")})`}
              {result.errors.length > 0 && <span className="text-critical"> · {result.errors.length} lỗi</span>}
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function CloudCard({ storage }: { storage: StorageSummary }) {
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const res = await api<{ success: boolean; error?: string }>("/api/storage/check", { method: "POST" });
      if (res.success) toast.success("Kết nối lưu trữ đám mây ổn định");
      else toast.error("Lưu trữ đám mây gặp lỗi", { description: res.error });
      revalidate("/api/storage");
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Cloudflare R2"
        title="Lưu trữ đám mây"
        action={
          storage.r2.enabled ? (
            <Badge tone="success">
              <CircleCheck /> Đã bật
            </Badge>
          ) : (
            <Badge tone="warning">
              <TriangleAlert /> Chưa bật
            </Badge>
          )
        }
      />
      {storage.r2.enabled ? (
        <div className="mt-5 space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-2 px-4 py-3">
              <dt className="text-xs text-ink-3">Video trên đám mây</dt>
              <dd className="numeral mt-1 text-[28px] text-ink">{storage.r2.count}</dd>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-3">
              <dt className="text-xs text-ink-3">Dung lượng</dt>
              <dd className="numeral mt-1 text-[28px] text-ink">{formatBytes(storage.r2.bytes)}</dd>
            </div>
          </dl>
          <div className="text-[13px] text-ink-3">
            Kho lưu trữ <span className="font-medium text-ink-2">{storage.r2.bucket}</span>
            {storage.r2.uploading > 0 && <span className="text-warning"> · đang chuyển {storage.r2.uploading} video</span>}
          </div>
          {storage.r2.error && <p className="rounded-2xl bg-critical-soft px-4 py-3 text-[13px] break-all text-critical">{storage.r2.error}</p>}
          <Button size="sm" onClick={check} loading={checking}>
            <PlugZap /> Kiểm tra kết nối
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
          <p>Hiện video chỉ lưu trên máy chủ của trường. Khi cần lưu lâu dài, bật Cloudflare R2:</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">
            <li>Cloudflare → R2 → tạo kho lưu trữ (ví dụ camera-videos).</li>
            <li>Tạo khoá truy cập quyền Đọc & Ghi.</li>
            <li>Điền vào tệp cấu hình .env trên máy chủ rồi khởi động lại:</li>
          </ol>
          <pre className="overflow-x-auto rounded-2xl bg-surface-2 p-4 font-mono text-[11.5px] leading-relaxed text-ink-2">
{`R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=camera-videos`}
          </pre>
          {storage.r2.error && <p className="text-critical">{storage.r2.error}</p>}
        </div>
      )}
    </Card>
  );
}

function FileRow({ video, cloud }: { video: Video; cloud: boolean }) {
  const [busy, setBusy] = useState(false);

  async function offload() {
    setBusy(true);
    try {
      await api(`/api/videos/${video.id}/offload`, { method: "POST" });
      toast.success("Đã chuyển lên đám mây", { description: video.title });
      revalidate("/api/videos");
      revalidate("/api/storage");
    } catch (e) {
      toast.error("Chưa chuyển được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-hairline">
      <td className="max-w-0 px-5 py-3">
        <Link href={`/videos/${video.id}`} className="block truncate text-sm text-ink hover:text-brand">
          {video.title}
        </Link>
        <div className="truncate text-xs text-ink-3">{video.camera_name || video.original_name}</div>
      </td>
      <td className="px-3 py-3 text-[13px] whitespace-nowrap text-ink-2 tabular">{formatBytes(video.size_bytes)}</td>
      <td className="hidden px-3 py-3 text-[13px] whitespace-nowrap text-ink-2 md:table-cell">{AI_STATUS_LABELS[video.ai_status]}</td>
      <td className="hidden px-3 py-3 text-[13px] whitespace-nowrap text-ink-3 lg:table-cell">{formatWhen(video.created_at)}</td>
      <td className="px-3 py-3">
        <StorageBadge storage={video.storage} />
      </td>
      <td className="px-5 py-3 text-right">
        {video.storage === "local" && cloud && (
          <Button
            size="sm"
            variant="ghost"
            onClick={offload}
            loading={busy}
            disabled={video.ai_status === "processing" || video.ai_status === "recording" || video.ai_status === "pending"}
          >
            <CloudUpload /> Chuyển
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
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hệ thống"
        title="Lưu trữ"
        description="Nơi lưu video bằng chứng: trên máy chủ của trường để AI xem ngay, sau đó chuyển lên đám mây khi cần."
      />

      <Journey storage={storage} />

      <div className="grid gap-5 lg:gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader eyebrow="Máy chủ của trường" title="Bộ nhớ video" />
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="numeral text-[36px] leading-none text-ink">{formatBytes(storage.local.bytes)}</span>
              <span className="text-[13px] text-ink-3">/ {formatBytes(storage.local.limit_bytes)}</span>
            </div>
            <Meter className="mt-4 h-2" value={storage.local.percent} tone={severityTone(storage.local.percent, 75, 95)} label="Bộ nhớ video" />
            <div className="mt-2 text-xs text-ink-3">
              {storage.local.percent}% giới hạn · {storage.local.count} video
            </div>
          </div>
          <div className="mt-6 border-t border-hairline pt-5">
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-2">Ổ đĩa máy chủ</span>
              <span className="text-ink">còn trống {formatBytes(disk.free)}</span>
            </div>
            <Meter className="mt-2.5" value={diskPercent} tone={severityTone(diskPercent, 80, 92)} label="Ổ đĩa" />
          </div>
        </Card>
        <CloudCard storage={storage} />
        <PolicyCard key={`${storage.policy.local_storage_max_gb}-${storage.policy.offload_after_hours}-${storage.policy.auto_offload}`} storage={storage} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="font-serif text-[21px] text-ink">Video theo nơi lưu</h2>
          <Segmented
            value={location}
            onChange={setLocation}
            options={[
              { value: "local", label: `Máy chủ (${storage.local.count})` },
              { value: "r2", label: `Đám mây (${storage.r2.count})` },
            ]}
          />
        </div>
        {videos?.videos.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 table-fixed text-left">
              <thead className="bg-surface-2 text-xs text-ink-3">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Video</th>
                  <th className="w-24 px-3 py-2.5 font-medium">Dung lượng</th>
                  <th className="hidden w-36 px-3 py-2.5 font-medium md:table-cell">AI</th>
                  <th className="hidden w-36 px-3 py-2.5 font-medium lg:table-cell">Ghi lúc</th>
                  <th className="w-48 px-3 py-2.5 font-medium">Nơi lưu</th>
                  <th className="w-28 px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {videos.videos.map((video) => (
                  <FileRow key={video.id} video={video} cloud={storage.r2.enabled} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border-t border-hairline py-12 text-center text-sm text-ink-3">
            {location === "local" ? "Chưa có video nào trên máy chủ." : "Chưa có video nào trên đám mây."}
          </p>
        )}
      </Card>
    </div>
  );
}
