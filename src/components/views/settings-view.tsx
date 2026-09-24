"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Lock,
  LogOut,
  Megaphone,
  RotateCcw,
  Save,
  Trash2,
  Unlock,
  UserCheck,
  Users,
  Volume2,
} from "lucide-react";

import { disableGoogleAutoSelect } from "@/components/auth/google-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confirm, Skeleton } from "@/components/ui/feedback";
import { Field, Input, RangeField, Select } from "@/components/ui/form";
import { SectionTitle } from "@/components/ui/stat-tile";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useConnection, useRole } from "@/lib/connection";
import { formatBytes, formatRelative, formatUptime, hostOf } from "@/lib/format";
import { revalidate, useHealth, useSettings, useSystem, useUsers } from "@/lib/hooks";
import { classLabel, ROLE_HINTS, ROLE_LABELS } from "@/lib/labels";
import { playAlarm, SOUND_KEY, soundEnabled } from "@/lib/realtime";
import type { Role, SessionUser, Settings } from "@/lib/types";

function Section({ children }: { children: React.ReactNode }) {
  return <section className="panel p-4 md:p-5">{children}</section>;
}

function AccountSection() {
  const router = useRouter();
  const user = useConnection((s) => s.user);
  const clearSession = useConnection((s) => s.clearSession);
  if (!user) return null;
  return (
    <Section>
      <SectionTitle eyebrow="Tài khoản" title="Bạn đang đăng nhập" />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Avatar user={user} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{user.name}</div>
          <div className="font-mono text-xs text-dim">{user.email || "—"}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge tone={user.role === "admin" ? "signal" : "neutral"}>{ROLE_LABELS[user.role]}</Badge>
            <span className="text-xs text-mute">{ROLE_HINTS[user.role]}</span>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            disableGoogleAutoSelect();
            clearSession();
            router.replace("/login");
          }}
        >
          <LogOut /> Đăng xuất
        </Button>
      </div>
    </Section>
  );
}

function UserRow({ user, me }: { user: SessionUser; me: string }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function patch(change: Partial<Pick<SessionUser, "role" | "status">>, message: string) {
    setBusy(true);
    try {
      await api(`/api/users/${user.id}`, { method: "PATCH", json: change });
      toast.success(message, { description: user.email });
      revalidate("/api/users");
    } catch (e) {
      toast.error("Không cập nhật được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/users/${user.id}`, { method: "DELETE" });
      toast.success("Đã xoá người dùng", { description: user.email });
      revalidate("/api/users");
      setConfirm(false);
    } catch (e) {
      toast.error("Không xoá được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const self = user.id === me;

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-line/70 py-3 last:border-b-0">
      <Avatar user={user} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-text">{user.name}</span>
          {self && <span className="font-mono text-[10px] text-mute">(bạn)</span>}
        </div>
        <div className="truncate font-mono text-[11px] text-dim">{user.email}</div>
        <div className="text-[10px] text-mute">Đăng nhập {formatRelative(user.last_login)}</div>
      </div>
      {user.status === "pending" ? (
        <Badge tone="warning" dot pulse>
          Chờ duyệt
        </Badge>
      ) : user.status === "disabled" ? (
        <Badge tone="critical">Đã khoá</Badge>
      ) : (
        <Badge tone="good" dot>
          Hoạt động
        </Badge>
      )}
      <Select
        value={user.role}
        disabled={busy}
        onChange={(e) => patch({ role: e.target.value as Role }, "Đã đổi vai trò")}
        aria-label={`Vai trò của ${user.email}`}
        className="h-8 text-[13px]"
      >
        {(["viewer", "operator", "admin"] as Role[]).map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </Select>
      <div className="flex gap-1.5">
        {user.status === "pending" && (
          <Button size="sm" variant="primary" loading={busy} onClick={() => patch({ status: "active" }, "Đã duyệt tài khoản")}>
            <UserCheck /> Duyệt
          </Button>
        )}
        {user.status === "active" && !self && (
          <Button size="sm" variant="ghost" loading={busy} onClick={() => patch({ status: "disabled" }, "Đã khoá tài khoản")}>
            <Lock /> Khoá
          </Button>
        )}
        {user.status === "disabled" && (
          <Button size="sm" variant="ghost" loading={busy} onClick={() => patch({ status: "active" }, "Đã mở khoá")}>
            <Unlock /> Mở khoá
          </Button>
        )}
        {!self && (
          <Button size="icon-sm" variant="ghost" onClick={() => setConfirm(true)} aria-label={`Xoá ${user.email}`}>
            <Trash2 />
          </Button>
        )}
      </div>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Xoá người dùng?"
        description={`${user.email} sẽ mất quyền truy cập. Nếu đăng nhập Google lại, tài khoản được tạo mới ở trạng thái chờ duyệt.`}
        confirmLabel="Xoá"
        danger
        loading={busy}
        onConfirm={remove}
      />
    </li>
  );
}

function UsersSection() {
  const me = useConnection((s) => s.user?.id ?? "");
  const { data: health } = useHealth();
  const google = health?.auth.mode === "google";
  const { data } = useUsers(google);
  const pending = data?.users.filter((u) => u.status === "pending").length ?? 0;

  return (
    <Section>
      <SectionTitle
        eyebrow="Quản trị"
        title="Người dùng"
        action={pending > 0 && <Badge tone="warning">{pending} chờ duyệt</Badge>}
      />
      {!google ? (
        <p className="mt-3 text-sm text-dim">
          Quản lý người dùng hoạt động khi máy chủ bật đăng nhập Google (<span className="font-mono">GOOGLE_CLIENT_ID</span>{" "}
          trong .env).
        </p>
      ) : !data ? (
        <Skeleton className="mt-4 h-24" />
      ) : (
        <>
          <p className="mt-2 text-xs text-mute">
            Người dùng tự đăng ký bằng Google. Tài khoản mới ở trạng thái <b className="text-dim">chờ duyệt</b> (trừ email
            quản trị và tên miền được phép trong .env).
          </p>
          <ul className="mt-3">
            {data.users.map((user) => (
              <UserRow key={user.id} user={user} me={me} />
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

function AiSettings({ initial, canEdit }: { initial: Settings; canEdit: boolean }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", { method: "PUT", json: draft });
      toast.success("Đã lưu cài đặt");
      revalidate("/api/settings");
      revalidate("/api/storage");
    } catch (e) {
      toast.error("Không lưu được", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section>
      <SectionTitle
        eyebrow="Máy chủ"
        title="Phát hiện & ghi hình"
        action={
          canEdit && (
            <div className="flex gap-2">
              {dirty && (
                <Button size="sm" variant="ghost" onClick={() => setDraft(initial)}>
                  <RotateCcw /> Hoàn tác
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={save} loading={saving} disabled={!dirty}>
                <Save /> Lưu
              </Button>
            </div>
          )
        }
      />
      {!canEdit && <p className="mt-2 text-xs text-mute">Chỉ quản trị viên được thay đổi các thông số này.</p>}
      <fieldset disabled={!canEdit} className="mt-5 grid gap-x-8 gap-y-6 disabled:opacity-60 lg:grid-cols-2">
        <RangeField
          label="Ngưỡng cảnh báo bắt nạt"
          hint="Độ tin cậy tối thiểu của lớp “Nghi bắt nạt” để tính là 1 lần phát hiện."
          value={draft.bullying_threshold}
          min={30}
          max={99}
          unit="%"
          onChange={(v) => set("bullying_threshold", v)}
        />
        <RangeField
          label="Số lần phát hiện liên tiếp"
          hint={`Mỗi lần cách nhau ~0.5 giây → cảnh báo sau khoảng ${(draft.bullying_min_hits * 0.5).toFixed(1)} giây.`}
          value={draft.bullying_min_hits}
          min={1}
          max={12}
          onChange={(v) => set("bullying_min_hits", v)}
        />
        <RangeField
          label="Khoảng nghỉ giữa 2 cảnh báo cùng loại"
          value={draft.event_cooldown}
          min={0}
          max={300}
          step={5}
          unit=" giây"
          onChange={(v) => set("event_cooldown", v)}
        />
        <RangeField
          label="Ngưỡng la hét / căng thẳng"
          hint="Tính từ mức âm lượng và lời nói tiêu cực."
          value={draft.anger_threshold}
          min={30}
          max={100}
          unit="%"
          onChange={(v) => set("anger_threshold", v)}
        />
        <RangeField
          label="Ghi trước sự kiện (pre-roll)"
          value={draft.pre_roll_seconds}
          min={0}
          max={30}
          unit=" giây"
          onChange={(v) => set("pre_roll_seconds", v)}
        />
        <RangeField
          label="Ghi sau sự kiện (post-roll)"
          value={draft.post_roll_seconds}
          min={3}
          max={120}
          unit=" giây"
          onChange={(v) => set("post_roll_seconds", v)}
        />
        <RangeField
          label="FPS clip ghi hình"
          value={draft.record_fps}
          min={2}
          max={25}
          unit=" fps"
          onChange={(v) => set("record_fps", v)}
        />
        <RangeField
          label="Tốc độ lấy mẫu khi AI xử lý video"
          hint="Nhiều khung/giây hơn = chính xác hơn nhưng chậm hơn."
          value={draft.video_sample_fps}
          min={0.5}
          max={6}
          step={0.5}
          unit=" khung/giây"
          onChange={(v) => set("video_sample_fps", v)}
        />
        <Field label="Độ rộng tối đa clip ghi hình">
          <Select
            value={String(draft.record_max_width)}
            onChange={(e) => set("record_max_width", Number(e.target.value))}
            className="w-full"
          >
            {[640, 960, 1280, 1920].map((w) => (
              <option key={w} value={w}>
                {w}px {w === 1280 ? "(khuyến nghị)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-bg/40 px-3 py-2.5">
          <span>
            <span className="block text-[13px] font-medium">Đọc cảnh báo bằng loa máy chủ</span>
            <span className="block text-xs text-mute">pyttsx3 đọc “Cảnh báo…” khi có sự kiện nghiêm trọng</span>
          </span>
          <Switch checked={draft.tts_alert} onCheckedChange={(v) => set("tts_alert", v)} />
        </label>
      </fieldset>
    </Section>
  );
}

function AlertSection() {
  const { isOperator } = useRole();
  const [sound, setSound] = useState(soundEnabled);
  const [text, setText] = useState("Cảnh báo. Phát hiện dấu hiệu bắt nạt tại hành lang tầng hai.");

  return (
    <Section>
      <SectionTitle eyebrow="Thông báo" title="Âm thanh cảnh báo" />
      <div className="mt-4 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-bg/40 px-3 py-2.5">
          <span>
            <span className="block text-[13px] font-medium">Còi báo trên trình duyệt này</span>
            <span className="block text-xs text-mute">Phát tiếng bíp khi có cảnh báo nghiêm trọng</span>
          </span>
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" onClick={playAlarm} aria-label="Nghe thử">
              <Volume2 />
            </Button>
            <Switch
              checked={sound}
              onCheckedChange={(v) => {
                setSound(v);
                try {
                  localStorage.setItem(SOUND_KEY, v ? "on" : "off");
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
        </label>
        {isOperator && (
          <div className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} />
            <Button
              variant="secondary"
              onClick={async () => {
                const res = await api<{ success: boolean; error?: string }>("/api/speech/speak", {
                  method: "POST",
                  json: { text },
                });
                if (res.success) toast.success("Đã gửi lệnh đọc tới loa máy chủ");
                else toast.error(res.error ?? "Không đọc được");
              }}
            >
              <Megaphone /> Phát loa
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}

function ServerSection() {
  const router = useRouter();
  const baseUrl = useConnection((s) => s.baseUrl);
  const setBaseUrl = useConnection((s) => s.setBaseUrl);
  const { data: system } = useSystem();
  const { data: health } = useHealth();
  const [value, setValue] = useState(baseUrl);

  return (
    <Section>
      <SectionTitle eyebrow="Kết nối" title="Máy chủ AI" />
      <div className="mt-4 space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim() === baseUrl) return;
            setBaseUrl(value);
            router.replace("/login");
          }}
        >
          <Input value={value} onChange={(e) => setValue(e.target.value)} className="font-mono text-[13px]" />
          <Button type="submit" variant="secondary" disabled={value.trim() === baseUrl}>
            <Check /> Đổi
          </Button>
        </form>
        <p className="text-xs text-mute">
          Đổi máy chủ sẽ đăng xuất và đăng nhập lại. Đăng nhập:{" "}
          <span className="text-dim">
            {health?.auth.mode === "google" ? "Google" : health?.auth.mode === "token" ? "API token" : "chế độ nội bộ"}
          </span>
        </p>
        {system && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-4 text-[13px]">
            {[
              ["Phiên bản", `${system.name} v${system.version}`],
              ["Máy chủ", hostOf(baseUrl)],
              ["Hệ điều hành", system.platform],
              ["Python", system.python],
              ["Hoạt động", formatUptime(system.uptime)],
              ["RAM tiến trình", formatBytes(system.memory.process)],
              ["Mô hình", `${system.model.architecture} · ${system.model.input.join("×")}`],
              ["Lớp nhận diện", system.model.classes.map(classLabel).join(", ")],
              ["Mã hoá clip", system.recorder.encoder ?? "—"],
              ["Giọng nói", system.speech.whisper ? "Whisper đang chạy" : "Chưa cài faster-whisper"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-mute">{label}</dt>
                <dd className="truncate text-text">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Section>
  );
}

export function SettingsView() {
  const { isAdmin } = useRole();
  const { data: settings } = useSettings();

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        <AccountSection />
        {isAdmin && <UsersSection />}
        <AlertSection />
      </div>
      <div className="space-y-5">
        {settings ? (
          <AiSettings key={JSON.stringify(settings)} initial={settings} canEdit={isAdmin} />
        ) : (
          <Skeleton className="h-96" />
        )}
        <ServerSection />
      </div>
      {!isAdmin && (
        <p className="flex items-center gap-2 text-xs text-mute xl:col-span-2">
          <Users className="size-3.5" /> Quản lý người dùng dành cho quản trị viên.
        </p>
      )}
    </div>
  );
}
