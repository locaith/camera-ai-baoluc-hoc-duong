"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CircleCheck, Download, LaptopMinimal, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Confirm, Notice } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { useNowSeconds } from "@/lib/clock";
import { useConnection } from "@/lib/connection";
import { formatRelative } from "@/lib/format";
import { revalidate, useBridges } from "@/lib/hooks";
import type { Bridge } from "@/lib/types";

const ONLINE_SECONDS = 150;

function downloadUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/static/downloads/Camera-AI-Cau-noi.zip`;
}

function BridgeRow({ bridge, onRemove }: { bridge: Bridge; onRemove: () => void }) {
  const now = useNowSeconds();
  const online = bridge.streaming > 0 || (bridge.last_seen != null && now - bridge.last_seen < ONLINE_SECONDS);
  return (
    <li className="flex items-center gap-3.5 rounded-2xl border border-hairline bg-surface-2 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <LaptopMinimal className="size-4.5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{bridge.name}</div>
        <div className="truncate text-xs text-ink-3">
          {bridge.cameras.length
            ? `${bridge.streaming}/${bridge.cameras.length} camera đang gửi hình · ${bridge.cameras.map((c) => c.name).join(", ")}`
            : "Chưa thêm camera nào"}
          {!online && ` · hoạt động ${formatRelative(bridge.last_seen)}`}
        </div>
      </div>
      <Badge tone={online ? "success" : "neutral"} dot>
        {online ? "Đang chạy" : "Đã tắt"}
      </Badge>
      <Button variant="ghost" size="icon-sm" aria-label={`Gỡ ${bridge.name}`} title="Gỡ máy cầu nối" onClick={onRemove}>
        <Trash2 />
      </Button>
    </li>
  );
}

interface Pairing {
  known: Set<string>;
  code: string;
  expires: number;
}

function PairDialog({
  pairing,
  loading,
  onNewCode,
  onClose,
}: {
  pairing: Pairing | null;
  loading: boolean;
  onNewCode: () => void;
  onClose: () => void;
}) {
  const baseUrl = useConnection((s) => s.baseUrl);
  const { data } = useBridges(Boolean(pairing));
  const now = useNowSeconds();
  const code = pairing;
  const left = code ? Math.max(0, Math.round(code.expires - now)) : 0;
  // Máy cầu nối mới xuất hiện sau khi mở hộp thoại = ghép nối thành công
  const paired = pairing ? (data?.bridges.find((b) => !pairing.known.has(b.id)) ?? null) : null;

  const digits = code?.code.split("") ?? [];

  return (
    <Dialog open={Boolean(pairing)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Thêm máy cầu nối"
        description="Máy cầu nối là laptop hoặc máy tính đặt ở trường, cùng WiFi với camera. Nó đọc hình từ camera và gửi về máy chủ AI."
        wide
      >
        {paired ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CircleCheck className="size-10 text-success" strokeWidth={1.75} />
            <div className="font-serif text-[22px] text-ink">Đã ghép nối “{paired.name}”</div>
            <p className="max-w-md text-sm text-ink-2">
              Trên máy đó, chương trình sẽ tự tìm camera trong mạng và hỏi mật khẩu camera. Camera xuất hiện trong danh sách
              “Camera của trường” ngay khi thêm xong.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <ol className="space-y-3 text-sm text-ink-2">
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">1</span>
                <span>
                  Trên máy ở trường, tải và giải nén chương trình cầu nối:{" "}
                  <a href={downloadUrl(baseUrl)} className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline">
                    <Download className="size-3.5" /> Camera-AI-Cau-noi.zip
                  </a>{" "}
                  (khoảng 60 MB, không cần cài đặt).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">2</span>
                <span>Bấm đúp tệp <b className="font-medium text-ink">CAU-NOI-CAMERA.bat</b>, rồi nhập mã dưới đây khi chương trình hỏi.</span>
              </li>
            </ol>
            <div className="rounded-2xl border border-hairline bg-surface-2 px-5 py-6 text-center">
              <div className="text-[12px] font-medium tracking-[0.14em] text-ink-3 uppercase">Mã ghép nối</div>
              {code ? (
                <>
                  <div className="mt-3 flex justify-center gap-2" aria-label={`Mã ${code.code}`}>
                    {digits.map((d, i) => (
                      <span key={i} className="grid h-14 w-11 place-items-center rounded-xl border border-hairline-2 bg-surface font-serif text-[30px] text-ink tabular">
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-[13px] text-ink-3 tabular">
                    {left > 0 ? `Còn ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} · dùng được một lần` : "Mã đã hết hạn"}
                  </div>
                </>
              ) : (
                <LoaderCircle className="mx-auto mt-4 size-6 animate-spin text-ink-3" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-[13px] text-ink-3">
              <LoaderCircle className="size-3.5 animate-spin" /> Đang chờ máy ở trường nhập mã…
            </div>
            <Notice tone="neutral">
              Camera cần được nối vào WiFi bằng app của hãng trước (Imou Life với camera Imou). Mật khẩu camera Imou là{" "}
              <b>Mã an toàn</b> in trên tem dưới đáy camera.
            </Notice>
          </div>
        )}
        <DialogFooter>
          {!paired && (
            <Button variant="ghost" onClick={onNewCode} loading={loading}>
              <RefreshCw /> Lấy mã mới
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            {paired ? "Xong" : "Đóng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BridgesPanel() {
  const { data } = useBridges(true);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [removing, setRemoving] = useState<Bridge | null>(null);
  const [busy, setBusy] = useState(false);
  const bridges = data?.bridges ?? [];

  async function requestCode(known: Set<string>) {
    setLoadingCode(true);
    try {
      const result = await api<{ code: string; expires_in: number }>("/api/bridges/pair-code", { method: "POST" });
      setPairing({ known, code: result.code, expires: Date.now() / 1000 + result.expires_in });
    } catch (e) {
      toast.error("Chưa lấy được mã ghép nối", { description: (e as Error).message });
    } finally {
      setLoadingCode(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`/api/bridges/${removing.id}`, { method: "DELETE" });
      toast.success("Đã gỡ máy cầu nối", { description: removing.name });
      revalidate("/api/bridges");
      revalidate("/api/cameras");
      setRemoving(null);
    } catch (e) {
      toast.error("Chưa gỡ được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Camera IP ở trường"
        title="Máy cầu nối ở trường"
        description="Laptop đặt ở trường, cùng WiFi với camera, gửi hình về máy chủ AI qua Internet. Lắp camera xong chỉ cần bấm đúp là chạy."
        action={
          <Button variant="secondary" size="sm" loading={loadingCode && !pairing} onClick={() => void requestCode(new Set(bridges.map((b) => b.id)))}>
            <Plus /> Thêm máy cầu nối
          </Button>
        }
      />
      {bridges.length > 0 && (
        <ul className="mt-5 grid gap-2.5 md:grid-cols-2">
          {bridges.map((bridge) => (
            <BridgeRow key={bridge.id} bridge={bridge} onRemove={() => setRemoving(bridge)} />
          ))}
        </ul>
      )}
      <PairDialog
        pairing={pairing}
        loading={loadingCode}
        onNewCode={() => pairing && void requestCode(pairing.known)}
        onClose={() => setPairing(null)}
      />
      <Confirm
        open={Boolean(removing)}
        onOpenChange={(open) => !open && !busy && setRemoving(null)}
        title="Gỡ máy cầu nối?"
        description={`“${removing?.name ?? ""}” sẽ không gửi hình được nữa, các camera của máy này bị xoá khỏi danh sách. Sự việc và video đã lưu vẫn còn.`}
        confirmLabel="Gỡ máy cầu nối"
        danger
        loading={busy}
        onConfirm={() => void remove()}
      />
    </Card>
  );
}
