"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, LogOut, Megaphone, RotateCcw, Save, Trash2, Unlock, UserCheck, Volume2 } from "lucide-react";

import { useSignOut } from "@/components/shell/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Confirm, Notice, Skeleton } from "@/components/ui/feedback";
import { Field, Input, RangeField, Select, Textarea } from "@/components/ui/form";
import { SwitchRow } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useConnection, useRole } from "@/lib/connection";
import { formatRelative, formatUptime } from "@/lib/format";
import { revalidate, useHealth, useSettings, useSystem, useUsers } from "@/lib/hooks";
import { ROLE_HINTS, ROLE_LABELS } from "@/lib/labels";
import { playAlarm, SOUND_KEY, soundEnabled } from "@/lib/realtime";
import type { Role, SessionUser, Settings } from "@/lib/types";

function AccountCard() {
  const user = useConnection((s) => s.user);
  const signOut = useSignOut();
  if (!user) return null;
  return (
    <Card>
      <CardHeader eyebrow="Tài khoản" title="Thầy cô đang đăng nhập" />
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Avatar user={user} size={56} />
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[21px] text-ink">{user.name}</div>
          <div className="text-[13px] text-ink-3">{user.email || "—"}</div>
        </div>
        <Button variant="secondary" onClick={signOut}>
          <LogOut /> Đăng xuất
        </Button>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3">
        <Badge tone={user.role === "admin" ? "brand" : user.role === "operator" ? "gold" : "neutral"}>{ROLE_LABELS[user.role]}</Badge>
        <span className="pt-0.5 text-[13px] leading-relaxed text-ink-2">{ROLE_HINTS[user.role]}</span>
      </div>
    </Card>
  );
}

function AlertsCard() {
  const { isOperator } = useRole();
  const [sound, setSound] = useState(soundEnabled);
  const [text, setText] = useState("Thông báo. Đề nghị giáo viên trực tới khu vực hành lang tầng hai.");
  const [speaking, setSpeaking] = useState(false);

  return (
    <Card>
      <CardHeader eyebrow="Thông báo" title="Âm thanh cảnh báo" />
      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-2">
          <SwitchRow
            className="flex-1"
            label="Chuông báo trên thiết bị này"
            hint="Phát tiếng chuông khi có sự việc nghiêm trọng"
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
          <Button size="icon" variant="secondary" onClick={playAlarm} aria-label="Nghe thử chuông">
            <Volume2 />
          </Button>
        </div>
        {isOperator && (
          <div className="space-y-2">
            <div className="text-[13px] font-medium text-ink">Đọc thông báo qua loa của máy chủ</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={text} onChange={(e) => setText(e.target.value)} />
              <Button
                variant="secondary"
                loading={speaking}
                onClick={async () => {
                  setSpeaking(true);
                  try {
                    const res = await api<{ success: boolean; error?: string }>("/api/speech/speak", {
                      method: "POST",
                      json: { text },
                    });
                    if (res.success) toast.success("Loa đang đọc thông báo");
                    else toast.error(res.error ?? "Chưa đọc được");
                  } catch (e) {
                    toast.error("Chưa đọc được", { description: (e as Error).message });
                  } finally {
                    setSpeaking(false);
                  }
                }}
              >
                {!speaking && <Megaphone />} Phát loa
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function SchoolCard({ settings }: { settings: Settings }) {
  const [school, setSchool] = useState(settings.school_name);
  const [admins, setAdmins] = useState(settings.admin_emails ?? "");
  const [domains, setDomains] = useState(settings.allowed_domains ?? "");
  const [autoApprove, setAutoApprove] = useState(Boolean(settings.auto_approve));
  const [saving, setSaving] = useState(false);
  const { data: health } = useHealth();

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        json: { school_name: school.trim(), admin_emails: admins, allowed_domains: domains, auto_approve: autoApprove },
      });
      toast.success("Đã lưu thông tin nhà trường");
      revalidate("/api/settings");
      revalidate("/api/health");
    } catch (e) {
      toast.error("Chưa lưu được", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Nhà trường"
        title="Thông tin & đăng nhập"
        action={
          <Button size="sm" variant="primary" onClick={save} loading={saving}>
            {!saving && <Save />} Lưu
          </Button>
        }
      />
      <div className="mt-5 space-y-5">
        <Field label="Tên trường" hint="Hiện trên trang đăng nhập và menu.">
          <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Trường Quốc tế Ánh Dương" maxLength={120} />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
          <span className="text-[13px] text-ink-2">Đăng nhập bằng Google</span>
          {health?.auth.mode === "google" ? <Badge tone="success" dot>Đang bật</Badge> : <Badge tone="warning" dot>Chưa bật</Badge>}
        </div>
        <Field label="Email quản trị viên" hint="Các email này luôn có toàn quyền. Cách nhau bằng dấu phẩy.">
          <Textarea value={admins} onChange={(e) => setAdmins(e.target.value)} placeholder="hieutruong@truong.edu.vn" className="min-h-20" />
        </Field>
        <Field label="Tên miền email của trường" hint="Giáo viên dùng email thuộc các tên miền này được duyệt tự động.">
          <Input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="truong.edu.vn" />
        </Field>
        <SwitchRow
          label="Tự duyệt mọi tài khoản mới"
          hint="Không khuyến nghị — ai có tài khoản Google cũng xem được camera (quyền Chỉ xem)."
          checked={autoApprove}
          onCheckedChange={setAutoApprove}
        />
      </div>
    </Card>
  );
}

function UserRow({ user, me }: { user: SessionUser; me: string }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const self = user.id === me;

  async function patch(change: Partial<Pick<SessionUser, "role" | "status">>, message: string) {
    setBusy(true);
    try {
      await api(`/api/users/${user.id}`, { method: "PATCH", json: change });
      toast.success(message, { description: user.email });
      revalidate("/api/users");
    } catch (e) {
      toast.error("Chưa cập nhật được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/users/${user.id}`, { method: "DELETE" });
      toast.success("Đã xoá tài khoản", { description: user.email });
      revalidate("/api/users");
      setConfirm(false);
    } catch (e) {
      toast.error("Chưa xoá được", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="space-y-3 py-4">
      <div className="flex items-center gap-3.5">
        <Avatar user={user} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">{user.name}</span>
            {self && <span className="shrink-0 text-xs text-ink-3">(thầy cô)</span>}
            {user.status === "pending" ? (
              <Badge tone="warning" dot pulse className="shrink-0">
                Chờ duyệt
              </Badge>
            ) : user.status === "disabled" ? (
              <Badge tone="critical" className="shrink-0">
                Đã khoá
              </Badge>
            ) : null}
          </div>
          <div className="truncate text-[13px] text-ink-3">
            {user.email} · đăng nhập {formatRelative(user.last_login)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-[54px]">
        <Select
          value={user.role}
          disabled={busy || self}
          onChange={(e) => patch({ role: e.target.value as Role }, "Đã đổi quyền")}
          aria-label={`Quyền của ${user.email}`}
          className="w-40"
        >
          {(["viewer", "operator", "admin"] as Role[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
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
        title="Xoá tài khoản này?"
        description={`${user.email} sẽ không vào được hệ thống. Nếu đăng nhập lại, tài khoản sẽ ở trạng thái chờ duyệt.`}
        confirmLabel="Xoá"
        danger
        loading={busy}
        onConfirm={remove}
      />
    </li>
  );
}

function UsersCard() {
  const me = useConnection((s) => s.user?.id ?? "");
  const { data: health } = useHealth();
  const google = health?.auth.mode === "google";
  const { data } = useUsers(google);
  const users = data?.users ?? [];
  const pending = users.filter((u) => u.status === "pending").length;

  return (
    <Card>
      <CardHeader
        eyebrow="Quản trị"
        title="Người dùng"
        description="Thầy cô tự đăng ký bằng Google; quản trị viên duyệt và phân quyền."
        action={pending > 0 && <Badge tone="warning">{pending} chờ duyệt</Badge>}
      />
      {!google ? (
        <Notice tone="neutral" className="mt-5">
          Quản lý người dùng hoạt động khi đã bật đăng nhập Google.
        </Notice>
      ) : !data ? (
        <Skeleton className="mt-5 h-24" />
      ) : (
        <ul className="hairline-divide mt-2">
          {users.map((user) => (
            <UserRow key={user.id} user={user} me={me} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function AiCard({ initial, canEdit }: { initial: Settings; canEdit: boolean }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const { bullying_threshold, bullying_min_hits, event_cooldown, anger_threshold, pre_roll_seconds, post_roll_seconds, record_fps, video_sample_fps, record_max_width, tts_alert } = draft;
      await api("/api/settings", {
        method: "PUT",
        json: { bullying_threshold, bullying_min_hits, event_cooldown, anger_threshold, pre_roll_seconds, post_roll_seconds, record_fps, video_sample_fps, record_max_width, tts_alert },
      });
      toast.success("Đã lưu cài đặt AI");
      revalidate("/api/settings");
    } catch (e) {
      toast.error("Chưa lưu được", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="AI & ghi hình"
        title="Độ nhạy phát hiện"
        action={
          canEdit && (
            <>
              {dirty && (
                <Button size="sm" variant="ghost" onClick={() => setDraft(initial)}>
                  <RotateCcw /> Hoàn tác
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={save} loading={saving} disabled={!dirty}>
                {!saving && <Save />} Lưu
              </Button>
            </>
          )
        }
      />
      {!canEdit && <p className="mt-2 text-[13px] text-ink-3">Chỉ quản trị viên được thay đổi các thông số này.</p>}
      <fieldset disabled={!canEdit} className="mt-6 grid gap-x-10 gap-y-7 disabled:opacity-60 lg:grid-cols-2">
        <RangeField
          label="Ngưỡng báo động bắt nạt"
          hint="Thấp hơn = nhạy hơn nhưng dễ báo nhầm. Khuyến nghị 65–80%."
          value={draft.bullying_threshold}
          min={30}
          max={99}
          unit="%"
          onChange={(v) => set("bullying_threshold", v)}
        />
        <RangeField
          label="Số lần phát hiện liên tiếp"
          hint={`Báo động sau khoảng ${(draft.bullying_min_hits * 0.5).toFixed(1)} giây liên tục.`}
          value={draft.bullying_min_hits}
          min={1}
          max={12}
          onChange={(v) => set("bullying_min_hits", v)}
        />
        <RangeField
          label="Nghỉ giữa 2 lần báo cùng camera"
          value={draft.event_cooldown}
          min={0}
          max={300}
          step={5}
          unit=" giây"
          onChange={(v) => set("event_cooldown", v)}
        />
        <RangeField
          label="Ngưỡng la hét, căng thẳng"
          hint="Tính từ âm lượng và lời nói tiêu cực."
          value={draft.anger_threshold}
          min={30}
          max={100}
          unit="%"
          onChange={(v) => set("anger_threshold", v)}
        />
        <RangeField
          label="Lưu video trước sự việc"
          value={draft.pre_roll_seconds}
          min={0}
          max={30}
          unit=" giây"
          onChange={(v) => set("pre_roll_seconds", v)}
        />
        <RangeField
          label="Lưu video sau sự việc"
          value={draft.post_roll_seconds}
          min={3}
          max={120}
          unit=" giây"
          onChange={(v) => set("post_roll_seconds", v)}
        />
        <RangeField
          label="Độ mượt của clip lưu"
          value={draft.record_fps}
          min={2}
          max={25}
          unit=" khung/giây"
          onChange={(v) => set("record_fps", v)}
        />
        <RangeField
          label="Độ kỹ khi AI xem lại video"
          hint="Nhiều khung/giây hơn = chính xác hơn nhưng chậm hơn."
          value={draft.video_sample_fps}
          min={0.5}
          max={6}
          step={0.5}
          unit=" khung/giây"
          onChange={(v) => set("video_sample_fps", v)}
        />
        <Field label="Độ nét clip lưu">
          <Select value={String(draft.record_max_width)} onChange={(e) => set("record_max_width", Number(e.target.value))}>
            {[
              [640, "Tiết kiệm"],
              [960, "Vừa"],
              [1280, "Nét (khuyên dùng)"],
              [1920, "Rất nét"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <SwitchRow
          label="Đọc cảnh báo qua loa"
          hint="Loa máy chủ tự đọc khi có sự việc nghiêm trọng"
          checked={draft.tts_alert}
          onCheckedChange={(v) => set("tts_alert", v)}
        />
      </fieldset>
    </Card>
  );
}

function SystemCard() {
  const { data: system } = useSystem();
  if (!system) return <Skeleton className="h-48" />;
  const rows = [
    ["Phiên bản", `Camera AI ${system.version}`],
    ["Hoạt động liên tục", formatUptime(system.uptime)],
    ["AI phân tích hình ảnh", system.engine.running ? `Đang chạy · ${system.model.last_ms} ms/lần` : "Đang dừng"],
    ["Nghe lời nói", system.speech.whisper ? "Đang bật" : "Chưa bật"],
    ["Máy chủ", system.platform],
    ["Kết nối trực tiếp", `${system.realtime_clients} thiết bị`],
  ];
  return (
    <Card>
      <CardHeader eyebrow="Máy chủ" title="Hệ thống" />
      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="mt-0.5 truncate text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function SettingsView() {
  const { isAdmin } = useRole();
  const { data: settings } = useSettings();

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Hệ thống" title="Cài đặt" description="Tài khoản, thông báo và các thông số của hệ thống." />
      <div className="grid gap-5 lg:gap-6 xl:grid-cols-2">
        <div className="space-y-5 lg:space-y-6">
          <AccountCard />
          <AlertsCard />
          {isAdmin && settings && <SchoolCard key={`${settings.school_name}|${settings.admin_emails}|${settings.allowed_domains}|${settings.auto_approve}`} settings={settings} />}
        </div>
        <div className="space-y-5 lg:space-y-6">
          {isAdmin && <UsersCard />}
          {settings ? <AiCard key={JSON.stringify(settings)} initial={settings} canEdit={isAdmin} /> : <Skeleton className="h-96" />}
          {isAdmin && <SystemCard />}
        </div>
      </div>
    </div>
  );
}
