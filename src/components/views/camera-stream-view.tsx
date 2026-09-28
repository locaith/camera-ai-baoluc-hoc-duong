"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, MonitorUp, ShieldAlert, ShieldCheck, Square, Webcam, WifiOff } from "lucide-react";

import { aiVerdict, riskOf } from "@/components/camera/camera-bits";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Empty, Notice, Skeleton } from "@/components/ui/feedback";
import { Field, Select } from "@/components/ui/form";
import { useNowSeconds } from "@/lib/clock";
import { useRole } from "@/lib/connection";
import { formatDuration } from "@/lib/format";
import { useCamera } from "@/lib/hooks";
import { listVideoInputs, StreamSession } from "@/lib/stream";
import { cn } from "@/lib/utils";

const STEPS = [
  "Cắm webcam vào máy này (hoặc dùng camera có sẵn của laptop).",
  "Bấm Bắt đầu phát và chọn Cho phép khi trình duyệt hỏi.",
  "Giữ trang này mở, không để máy ngủ. Camera hiện cho cả trường ở trang Trực tiếp.",
];

function useStreamSession(cameraId: string) {
  const [session] = useState(() => new StreamSession(cameraId));
  useEffect(() => () => session.dispose(), [session]);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const attach = useCallback((video: HTMLVideoElement | null) => session.attach(video), [session]);
  return { session, snapshot, attach };
}

function Elapsed({ since }: { since: number }) {
  const now = useNowSeconds();
  return <span className="tabular">{formatDuration(Math.max(0, now - Math.floor(since / 1000)))}</span>;
}

export function CameraStreamView({ id }: { id: string }) {
  const { isAdmin } = useRole();
  const { data: camera, error } = useCamera(id);
  const { session, snapshot, attach } = useStreamSession(id);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");

  const live = snapshot.phase === "live";

  // Tên webcam chỉ có sau khi được phép dùng camera → đọc lại danh sách khi bắt đầu phát
  useEffect(() => {
    let cancelled = false;
    void listVideoInputs().then((list) => {
      if (!cancelled) setDevices(list);
    });
    return () => {
      cancelled = true;
    };
  }, [live]);

  // Nhắc trước khi đóng trang khi đang phát
  useEffect(() => {
    if (!live) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [live]);

  if (error) {
    return (
      <Card>
        <Empty icon={Webcam} title="Không tìm thấy camera">
          Camera có thể đã bị xoá. <Link href="/cameras" className="text-brand">Về trang Camera</Link>
        </Empty>
      </Card>
    );
  }

  if (!camera) return <Skeleton className="h-[480px]" />;

  const threshold = snapshot.status?.threshold ?? 70;
  const analysis = snapshot.status?.analysis ?? null;
  const verdict = aiVerdict(analysis, threshold);
  const risk = riskOf(analysis);
  const selected = snapshot.deviceId || deviceId;
  const otherFeeder = !live && camera.state === "online" && camera.owner;

  return (
    <div className="space-y-7">
      <div className="animate-rise">
        <Link href="/cameras" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> Camera
        </Link>
        <h1 className="display mt-4 text-[30px] leading-tight text-ink md:text-[38px]">{camera.name}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-2">
          Phát webcam của máy này vào hệ thống. Máy chủ AI của trường phân tích, cảnh báo và lưu clip bằng chứng như một
          camera cố định.
        </p>
      </div>

      {camera.source !== "remote" ? (
        <Notice tone="warning" title="Camera này không phát từ máy khác">
          Chỉ camera tạo bằng nút <b>Phát webcam từ máy này</b> ở trang Camera mới phát được từ trình duyệt.
        </Notice>
      ) : !isAdmin ? (
        <Notice tone="warning" title="Cần quyền quản trị viên">
          Chỉ quản trị viên mới phát được camera vào hệ thống.
        </Notice>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <Card padded={false} className="overflow-hidden">
            <div className="relative aspect-video bg-frame text-white">
              <video ref={attach} autoPlay muted playsInline className="absolute inset-0 size-full object-contain" />
              {verdict.level === 2 && live && (
                <div className="pointer-events-none absolute inset-0 animate-breathe ring-8 ring-critical ring-inset" />
              )}
              {!live && (
                <div className="absolute inset-0 grid place-items-center">
                  {snapshot.phase === "starting" ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <LoaderCircle className="size-7 animate-spin text-white/70" />
                      <p className="text-sm text-white/75">Đang mở camera… Nếu trình duyệt hỏi, hãy chọn Cho phép.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center text-white/55">
                      <Webcam className="size-8" strokeWidth={1.5} />
                      <p className="text-sm">Chưa phát</p>
                    </div>
                  )}
                </div>
              )}
              {live && (
                <>
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 text-[12px]">
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 font-medium backdrop-blur-md">
                      <span className="size-2 animate-breathe rounded-full bg-[#5ee0a0]" /> Đang phát · <Elapsed since={snapshot.startedAt} />
                    </span>
                    {snapshot.link !== "open" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/90 px-2.5 py-1.5">
                        <WifiOff className="size-3.5" /> Đang kết nối lại…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5 backdrop-blur-md">
                        <ShieldCheck className="size-3.5" /> AI đang phân tích
                      </span>
                    )}
                  </div>
                  {verdict.level === 2 && (
                    <div className="absolute inset-x-0 top-14 flex justify-center">
                      <span className="flex items-center gap-2 rounded-full bg-critical px-4 py-2 text-sm font-medium shadow-lift">
                        <ShieldAlert className="size-4.5" /> Phát hiện dấu hiệu bắt nạt
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-4 pt-10 pb-4">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium">
                        {analysis ? verdict.label : "AI đang quan sát…"}
                        {analysis && <span className="ml-1.5 opacity-75 tabular">{risk.toFixed(0)}%</span>}
                      </span>
                      <span className="text-white/60 tabular">{snapshot.sent} khung đã gửi</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-500",
                          verdict.level === 2 ? "bg-[#ff8a7a]" : verdict.level === 1 ? "bg-[#ffc37a]" : "bg-white/85",
                        )}
                        style={{ width: `${Math.max(2, risk)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader eyebrow="Phát từ máy này" title={live ? "Camera đang phát" : "Bắt đầu phát"} />
              <div className="mt-5 space-y-4">
                <Field label="Webcam" hint={devices.some((d) => d.label) ? undefined : "Tên webcam hiện sau khi cho phép dùng camera."}>
                  <Select
                    value={selected}
                    onChange={(e) => {
                      setDeviceId(e.target.value);
                      if (live) void session.switchDevice(e.target.value);
                    }}
                  >
                    <option value="">Webcam mặc định của máy</option>
                    {devices
                      .filter((device) => device.deviceId)
                      .map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${index + 1}`}
                        </option>
                      ))}
                  </Select>
                </Field>
                {snapshot.error && <Notice tone="critical">{snapshot.error}</Notice>}
                {otherFeeder && (
                  <Notice tone="info" title="Camera đang được phát từ máy khác">
                    {camera.owner}. Bấm Bắt đầu phát để chuyển sang phát từ máy này.
                  </Notice>
                )}
                {live ? (
                  <Button variant="danger-solid" className="w-full" onClick={() => session.stop()}>
                    <Square className="fill-current" /> Dừng phát
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    loading={snapshot.phase === "starting"}
                    disabled={!camera.enabled}
                    onClick={() => void session.start(deviceId)}
                  >
                    <MonitorUp /> Bắt đầu phát
                  </Button>
                )}
                {!camera.enabled && (
                  <p className="text-[13px] text-ink-3">Camera đang tắt. Bật camera ở trang Camera rồi phát lại.</p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Cách dùng" title="3 bước" />
              <ol className="mt-4 space-y-3">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-ink-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand tabular">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
