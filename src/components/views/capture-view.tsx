"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  CloudUpload,
  Download,
  Flag,
  LoaderCircle,
  RefreshCw,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Square,
  SwitchCamera,
  Video,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { aiVerdict, riskOf } from "@/components/camera/camera-bits";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Meter, Notice } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/form";
import { SwitchRow } from "@/components/ui/switch";
import { CaptureSession, captureSupported, type Facing } from "@/lib/capture";
import { useNowSeconds } from "@/lib/clock";
import { formatBytes, formatDuration } from "@/lib/format";
import { useRealtime } from "@/lib/realtime";
import { cn } from "@/lib/utils";

const STEPS = [
  "Cho phép dùng camera khi trình duyệt hỏi.",
  "Đặt thiết bị cố định, hướng về khu vực cần quan sát.",
  "Bấm Dừng khi xong — video được gửi về để AI xem lại toàn bộ.",
];

function useCaptureSession() {
  const [session] = useState(() => new CaptureSession());
  useEffect(() => {
    session.mount();
    return () => session.dispose();
  }, [session]);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  // Thẻ <video> xem trước: gắn luồng camera khi sẵn sàng
  const attach = useCallback((video: HTMLVideoElement | null) => session.attach(video), [session]);
  return { session, snapshot, attach };
}

function Elapsed({ since }: { since: number }) {
  const now = useNowSeconds();
  return <span className="tabular">{formatDuration(Math.max(0, now - Math.floor(since / 1000)))}</span>;
}

export function CaptureView() {
  const { session, snapshot, attach } = useCaptureSession();
  const { recent } = useRealtime();
  const [facing, setFacing] = useState<Facing>("environment");
  const [record, setRecord] = useState(true);
  const [audio, setAudio] = useState(true);
  const supported = captureSupported();

  const { phase } = snapshot;
  const immersive = phase === "starting" || phase === "live";
  const busy = phase === "live" || phase === "finishing" || phase === "uploading";

  // Nhắc trước khi đóng trang khi đang quay / đang gửi video
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const alerts = recent.filter(
    (event) => event.camera_id && snapshot.cameraIds.includes(event.camera_id) && event.type !== "manual",
  ).length;

  const threshold = snapshot.status?.threshold ?? 70;
  const analysis = snapshot.status?.analysis ?? null;
  const verdict = aiVerdict(analysis, threshold);
  const risk = riskOf(analysis);
  const alarm = verdict.level === 2;

  return (
    <div className="space-y-8">
      {!immersive && (
        <PageHeader
          eyebrow="Giám sát"
          title="Quay tại chỗ"
          description="Biến điện thoại hoặc máy tính thành một camera AI. AI phân tích liên tục và báo ngay cho nhà trường khi có dấu hiệu bắt nạt."
        />
      )}

      {/* ---------------- đang quay: toàn màn hình ---------------- */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex flex-col bg-frame text-white",
          !immersive && "pointer-events-none invisible",
        )}
        aria-hidden={!immersive}
      >
        <video
          ref={attach}
          autoPlay
          muted
          playsInline
          className={cn("absolute inset-0 size-full object-cover md:object-contain", snapshot.facing === "user" && "-scale-x-100")}
        />
        {alarm && <div className="pointer-events-none absolute inset-0 animate-breathe ring-8 ring-critical ring-inset" />}

        {phase === "starting" && (
          <div className="absolute inset-0 grid place-items-center bg-frame">
            <div className="flex flex-col items-center gap-4 text-center">
              <LoaderCircle className="size-7 animate-spin text-white/70" />
              <p className="text-[15px] text-white/80">Đang mở camera…</p>
              <p className="max-w-xs text-[13px] text-white/50">Nếu trình duyệt hỏi, hãy chọn Cho phép.</p>
            </div>
          </div>
        )}

        {phase === "live" && (
          <>
            <div className="relative flex items-start justify-between gap-3 bg-linear-to-b from-black/60 to-transparent px-4 pt-[max(16px,env(safe-area-inset-top))] pb-10">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-medium backdrop-blur-md">
                  <span className={cn("size-2 rounded-full", snapshot.recording ? "animate-breathe bg-critical" : "bg-[#5ee0a0]")} />
                  {snapshot.recording ? "Đang ghi" : "Đang quan sát"} · <Elapsed since={snapshot.startedAt} />
                </span>
                <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                  {snapshot.link !== "open" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/90 px-2.5 py-1">
                      <WifiOff className="size-3.5" /> Đang kết nối lại…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md">
                      <ShieldCheck className="size-3.5" /> AI đang phân tích
                    </span>
                  )}
                  {alerts > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-critical px-2.5 py-1">
                      <ShieldAlert className="size-3.5" /> {alerts} cảnh báo đã gửi
                    </span>
                  )}
                  {snapshot.marks > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md">
                      <Flag className="size-3.5" /> {snapshot.marks} lần đánh dấu
                    </span>
                  )}
                </div>
              </div>
              {!snapshot.recording && (
                <button
                  type="button"
                  onClick={() => void session.switchCamera()}
                  aria-label="Đổi camera"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60"
                >
                  <SwitchCamera className="size-5" strokeWidth={1.75} />
                </button>
              )}
            </div>

            {alarm && (
              <div className="pointer-events-none relative flex justify-center px-6">
                <span className="flex items-center gap-2 rounded-full bg-critical px-5 py-2.5 text-[15px] font-medium shadow-lift">
                  <ShieldAlert className="size-5" /> Phát hiện dấu hiệu bắt nạt
                </span>
              </div>
            )}

            <div className="relative mt-auto bg-linear-to-t from-black/70 via-black/35 to-transparent px-5 pt-16 pb-[max(20px,env(safe-area-inset-bottom))]">
              <div className="mx-auto max-w-md">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="font-medium">
                    {analysis ? verdict.label : "AI đang quan sát…"}
                    {analysis && verdict.level > 0 && <span className="ml-1.5 opacity-75 tabular">{risk.toFixed(0)}%</span>}
                  </span>
                  {snapshot.recording && <span className="text-white/60 tabular">{formatBytes(snapshot.recordedBytes)}</span>}
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
                {snapshot.recordLimited && (
                  <p className="mt-2 text-xs text-white/60">Đã đủ 20 phút ghi trên máy — AI vẫn tiếp tục quan sát.</p>
                )}

                <div className="mt-6 grid grid-cols-3 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (session.mark()) toast.success("Đã đánh dấu thời điểm này", { description: "Kèm ảnh và đoạn video gửi về trường." });
                    }}
                    className="flex flex-col items-center gap-1.5 justify-self-start text-[12px] text-white/85"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-white/12 ring-1 ring-white/20 backdrop-blur-md">
                      <Flag className="size-5" strokeWidth={1.75} />
                    </span>
                    Đánh dấu
                  </button>
                  <button
                    type="button"
                    onClick={() => void session.stop(true)}
                    aria-label="Dừng quay"
                    className="grid size-18 place-items-center justify-self-center rounded-full bg-white/15 ring-2 ring-white/80 backdrop-blur-md transition-transform active:scale-95"
                  >
                    <span className="grid size-13 place-items-center rounded-full bg-critical">
                      <Square className="size-5 fill-white" strokeWidth={0} />
                    </span>
                  </button>
                  <span className="justify-self-end text-right text-[11.5px] leading-snug text-white/55">
                    {snapshot.cameraName ? snapshot.cameraName.split(" · ")[0] : "Thiết bị"}
                    <br />
                    Camera AI
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------------- trước / sau khi quay ---------------- */}
      {!immersive && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-6">
          <Card className="space-y-6">
            {phase === "finishing" || phase === "uploading" ? (
              <div className="space-y-5 py-4">
                <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                  <CloudUpload className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="font-serif text-[26px] leading-tight text-ink">Đang gửi video về trường</h2>
                  <p className="mt-2 text-sm text-ink-2">Vui lòng giữ trang này mở cho tới khi hoàn tất.</p>
                </div>
                <div>
                  <div className="flex justify-between text-[13px] text-ink-2">
                    <span>{phase === "finishing" ? "Đang hoàn tất bản ghi…" : "Đang tải lên"}</span>
                    <span className="tabular">{Math.round(snapshot.uploadProgress * 100)}%</span>
                  </div>
                  <Meter className="mt-2" value={snapshot.uploadProgress * 100} tone="ink" />
                </div>
              </div>
            ) : phase === "done" ? (
              <div className="space-y-6 py-4">
                <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
                  <CircleCheck className="size-6" strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="font-serif text-[28px] leading-tight text-ink">Đã kết thúc phiên quay</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">
                    {snapshot.video
                      ? "Video đã được gửi về trường. AI đang xem lại toàn bộ và sẽ đánh dấu những đoạn cần chú ý."
                      : "Các cảnh báo trong lúc quay đã được gửi về trường."}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Cảnh báo", value: alerts },
                    { label: "Đánh dấu", value: snapshot.marks },
                    { label: "Dung lượng", value: snapshot.video ? formatBytes(snapshot.video.size_bytes) : "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-surface-2 px-4 py-3">
                      <dt className="text-xs text-ink-3">{item.label}</dt>
                      <dd className="numeral mt-1 text-[24px] text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2">
                  {snapshot.video && (
                    <Button variant="primary" asChild>
                      <Link href={`/videos/${snapshot.video.id}`}>
                        Xem phân tích video <ArrowRight />
                      </Link>
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => session.reset()}>
                    <ScanFace /> Quay tiếp
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {phase === "error" && (
                  <Notice tone="critical" title="Chưa hoàn tất">
                    {snapshot.error}
                  </Notice>
                )}
                {snapshot.hasPending && phase === "error" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => void session.retryUpload()}>
                      <RefreshCw /> Gửi lại video
                    </Button>
                    <Button variant="secondary" onClick={() => session.downloadPending()}>
                      <Download /> Lưu video về máy
                    </Button>
                    <Button variant="ghost" onClick={() => session.reset()}>
                      Bỏ qua
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_50%_40%,#1c1f27,#0e0f12_70%)] sm:aspect-video">
                      <div className="flex flex-col items-center gap-3 text-center text-white/70">
                        <span className="grid size-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
                          <Video className="size-6" strokeWidth={1.5} />
                        </span>
                        <span className="text-sm">Camera chưa bật</span>
                      </div>
                      <span className="absolute top-4 left-4 size-6 rounded-tl-lg border-t-2 border-l-2 border-white/40" />
                      <span className="absolute top-4 right-4 size-6 rounded-tr-lg border-t-2 border-r-2 border-white/40" />
                      <span className="absolute bottom-4 left-4 size-6 rounded-bl-lg border-b-2 border-l-2 border-white/40" />
                      <span className="absolute right-4 bottom-4 size-6 rounded-br-lg border-r-2 border-b-2 border-white/40" />
                    </div>

                    {!supported ? (
                      <Notice tone="warning" title="Thiết bị này chưa quay được">
                        Hãy mở trang bằng Chrome hoặc Safari phiên bản mới trên điện thoại hoặc máy tính có camera.
                      </Notice>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-sm font-medium text-ink">Dùng camera</span>
                          <Segmented
                            value={facing}
                            onChange={setFacing}
                            options={[
                              { value: "environment", label: "Camera sau" },
                              { value: "user", label: "Camera trước" },
                            ]}
                          />
                        </div>
                        <SwitchRow
                          label="Lưu video và gửi về trường khi dừng"
                          hint="Để AI xem lại toàn bộ với chất lượng đầy đủ (tối đa 20 phút)"
                          checked={record}
                          onCheckedChange={setRecord}
                        />
                        {record && (
                          <SwitchRow
                            label="Ghi cả âm thanh"
                            hint="Giúp nhận biết la hét, lời nói tiêu cực"
                            checked={audio}
                            onCheckedChange={setAudio}
                          />
                        )}
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="xl"
                      className="w-full"
                      disabled={!supported}
                      onClick={() => void session.start({ facing, record, audio })}
                    >
                      <ScanFace /> Bắt đầu quay
                    </Button>
                  </>
                )}
              </>
            )}
          </Card>

          <div className="space-y-5 lg:space-y-6">
            <Card>
              <div className="eyebrow">Cách dùng</div>
              <ol className="mt-4 space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="numeral text-[22px] leading-none text-gold">{String(i + 1).padStart(2, "0")}</span>
                    <span className="pt-0.5 text-sm leading-relaxed text-ink-2">{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Notice tone="neutral" icon={ShieldCheck} title="Riêng tư và an toàn">
              Hình ảnh chỉ gửi về hệ thống của nhà trường, dùng để bảo vệ học sinh. Khi có dấu hiệu bắt nạt, thầy cô phụ trách
              nhận thông báo ngay kèm ảnh và đoạn video.
            </Notice>
          </div>
        </div>
      )}
    </div>
  );
}
