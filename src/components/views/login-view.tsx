"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock3,
  Cloud,
  KeyRound,
  LoaderCircle,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  Siren,
  TriangleAlert,
} from "lucide-react";

import { GoogleButton, disableGoogleAutoSelect } from "@/components/auth/google-button";
import { Logo, LogoMark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { DEFAULT_API_URL, isMixedContent, useConnection, useIsClient } from "@/lib/connection";
import { hostOf } from "@/lib/format";
import { useHealth } from "@/lib/hooks";
import type { GoogleLoginResult, SessionUser } from "@/lib/types";

const FEATURES = [
  {
    icon: ShieldAlert,
    title: "AI phân tích liên tục",
    text: "Nhận diện dấu hiệu bắt nạt trên mọi camera ngay tại máy chủ của trường.",
  },
  {
    icon: Siren,
    title: "Cảnh báo tức thời",
    text: "Ảnh chụp + clip trước/sau sự kiện, đẩy về web theo thời gian thực.",
  },
  {
    icon: Cloud,
    title: "Local trước, R2 sau",
    text: "Video lưu tạm tại máy để AI xử lý, tự đẩy lên Cloudflare R2 khi đầy.",
  },
];

function Viewfinder() {
  return (
    <div
      className="brackets relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-[#06080d]"
      style={{ "--bracket": "var(--signal)" } as React.CSSProperties}
    >
      <div className="scanlines absolute inset-0" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(91,130,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(91,130,255,0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-x-0 h-1/3 animate-sweep bg-gradient-to-b from-transparent via-signal/10 to-transparent" />
      <div className="absolute top-[30%] left-[16%] h-[46%] w-[20%] rounded-sm border border-good/70">
        <span className="absolute -top-5 left-0 font-mono text-[10px] text-good">BÌNH THƯỜNG 96%</span>
      </div>
      <div className="alarm absolute top-[24%] left-[52%] h-[52%] w-[26%] rounded-sm">
        <span className="absolute -top-5 left-0 font-mono text-[10px] text-critical">NGHI BẮT NẠT 91%</span>
      </div>
      <div className="absolute top-3 left-3 font-mono text-[10px] text-white/60">CAM-02 · HÀNH LANG TẦNG 2</div>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 font-mono text-[10px] text-good">
        <span className="size-1.5 animate-pulse-soft rounded-full bg-good" /> LIVE
      </div>
      <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between font-mono text-[10px] text-white/50">
        <span>AI · MOBILENETV2 · 224×224</span>
        <span className="text-critical">REC ●</span>
      </div>
    </div>
  );
}

function ServerSwitcher() {
  const baseUrl = useConnection((s) => s.baseUrl);
  const setBaseUrl = useConnection((s) => s.setBaseUrl);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(baseUrl);

  if (!editing) {
    return (
      <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-mute">
        <Server className="size-3.5" />
        Máy chủ AI: <span className="text-dim">{hostOf(baseUrl)}</span>
        <button
          type="button"
          className="text-signal hover:underline"
          onClick={() => {
            setValue(baseUrl);
            setEditing(true);
          }}
        >
          Đổi
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setBaseUrl(value);
        setEditing(false);
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={DEFAULT_API_URL}
        className="font-mono text-[13px]"
        autoFocus
      />
      <Button type="submit" size="md">
        Lưu
      </Button>
    </form>
  );
}

function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: "warning" | "critical" | "info";
  icon: typeof TriangleAlert;
  children: React.ReactNode;
}) {
  const styles = {
    warning: "border-warning/30 bg-warning/5 text-warning",
    critical: "border-critical/30 bg-critical/5 text-critical",
    info: "border-signal/30 bg-signal/5 text-signal",
  }[tone];
  return (
    <div className={`flex gap-2.5 rounded-md border p-3 text-xs leading-relaxed ${styles}`}>
      <Icon className="mt-px size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Waiting({ user, onReset }: { user: SessionUser; onReset: () => void }) {
  const pending = user.status === "pending";
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto grid size-16 place-items-center overflow-hidden rounded-full border border-line-strong bg-panel-3">
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          <span className="font-display text-xl">{user.name.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div>
        <div className="font-semibold text-text">{user.name}</div>
        <div className="font-mono text-xs text-dim">{user.email}</div>
      </div>
      {pending ? (
        <Notice tone="warning" icon={Clock3}>
          Đã tạo tài khoản. Quản trị viên cần <b>duyệt</b> trước khi bạn xem được camera — hãy báo cho quản trị viên
          của trường, sau đó đăng nhập lại.
        </Notice>
      ) : (
        <Notice tone="critical" icon={Lock}>
          Tài khoản này đã bị khoá. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.
        </Notice>
      )}
      <Button variant="secondary" className="w-full" onClick={onReset}>
        Đăng nhập bằng tài khoản khác
      </Button>
    </div>
  );
}

export function LoginView() {
  const router = useRouter();
  const isClient = useIsClient();
  const baseUrl = useConnection((s) => s.baseUrl);
  const token = useConnection((s) => s.token);
  const user = useConnection((s) => s.user);
  const setSession = useConnection((s) => s.setSession);
  const { data: health, error, isLoading, mutate } = useHealth();
  const [waiting, setWaiting] = useState<SessionUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [failure, setFailure] = useState("");

  const mode = health?.auth.mode;
  const clientId = health?.auth.google_client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const mixed = isClient && isMixedContent(baseUrl);

  // Đã đăng nhập (hoặc máy chủ ở chế độ nội bộ) -> vào thẳng hệ thống
  useEffect(() => {
    if (user && (token || mode === "none")) router.replace("/");
  }, [user, token, mode, router]);

  async function finish(sessionToken: string) {
    const me = await api<SessionUser>("/api/auth/me", { token: sessionToken });
    setSession(sessionToken, me);
    toast.success(`Xin chào, ${me.name || "bạn"}!`);
    router.replace("/");
  }

  async function withGoogle(credential: string) {
    setBusy(true);
    setFailure("");
    try {
      const result = await api<GoogleLoginResult>("/api/auth/google", {
        method: "POST",
        json: { credential },
        token: "",
      });
      if (result.status !== "active" || !result.token) {
        disableGoogleAutoSelect();
        setWaiting(result.user);
        return;
      }
      await finish(result.token);
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function withToken(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      await finish(apiToken.trim());
    } catch {
      setFailure("API token không đúng.");
    } finally {
      setBusy(false);
    }
  }

  async function enterLocal() {
    setBusy(true);
    try {
      await finish("");
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  let body: React.ReactNode;

  if (!isClient || (isLoading && !health)) {
    body = (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-dim">
        <LoaderCircle className="size-4 animate-spin" /> Đang kết nối máy chủ AI…
      </div>
    );
  } else if (error && !health) {
    body = (
      <div className="space-y-4">
        <Notice tone="critical" icon={TriangleAlert}>
          Không kết nối được máy chủ AI tại <span className="font-mono">{hostOf(baseUrl)}</span>. Hãy chắc chắn backend
          đang chạy (START.bat) và địa chỉ máy chủ đúng.
        </Notice>
        {mixed && (
          <Notice tone="warning" icon={TriangleAlert}>
            Trang đang chạy HTTPS nên trình duyệt chặn máy chủ HTTP ngoài localhost — cần địa chỉ HTTPS (Cloudflare
            Tunnel).
          </Notice>
        )}
        <Button variant="secondary" className="w-full" onClick={() => mutate()}>
          <RefreshCw /> Thử lại
        </Button>
      </div>
    );
  } else if (waiting) {
    body = <Waiting user={waiting} onReset={() => setWaiting(null)} />;
  } else if (mode === "google") {
    body = (
      <div className="space-y-5">
        {clientId ? (
          <div className={busy ? "pointer-events-none opacity-60" : undefined}>
            <GoogleButton clientId={clientId} onCredential={withGoogle} />
          </div>
        ) : null}
        {busy && (
          <div className="flex items-center justify-center gap-2 text-xs text-dim">
            <LoaderCircle className="size-3.5 animate-spin" /> Đang xác minh tài khoản Google…
          </div>
        )}
        <p className="text-center text-xs leading-relaxed text-mute">
          Lần đầu đăng nhập sẽ tự <b className="text-dim">đăng ký</b> tài khoản bằng Google. Quản trị viên duyệt và phân
          quyền trước khi bạn xem camera.
        </p>
      </div>
    );
  } else if (mode === "token") {
    body = (
      <form onSubmit={withToken} className="space-y-4">
        <Notice tone="info" icon={KeyRound}>
          Máy chủ chưa bật đăng nhập Google, đang dùng API token dành cho quản trị. Thêm{" "}
          <span className="font-mono">GOOGLE_CLIENT_ID</span> vào .env để bật đăng nhập Google.
        </Notice>
        <Input
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="API token"
          className="font-mono"
          autoComplete="current-password"
          required
        />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Vào hệ thống {!busy && <ArrowRight />}
        </Button>
      </form>
    );
  } else {
    body = (
      <div className="space-y-4">
        <Notice tone="warning" icon={TriangleAlert}>
          Máy chủ đang ở <b>chế độ nội bộ</b> (chưa bật đăng nhập Google) — ai truy cập được máy chủ cũng dùng được.
          Thêm <span className="font-mono">GOOGLE_CLIENT_ID</span> vào file .env để bắt buộc đăng nhập Google.
        </Notice>
        <Button variant="primary" size="lg" className="w-full" onClick={enterLocal} loading={busy}>
          Vào hệ thống {!busy && <ArrowRight />}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="sticky top-0 hidden h-screen flex-col justify-between gap-8 overflow-y-auto border-r border-line p-10 lg:flex xl:px-14">
        <Logo />
        <div className="max-w-xl">
          <div className="eyebrow mb-4 text-signal">Hệ thống giám sát bằng AI</div>
          <h1 className="font-display text-[38px] leading-[1.08] font-bold tracking-tight xl:text-[44px]">
            Mọi camera.
            <br />
            Một trung tâm
            <span className="text-signal"> cảnh giác</span>.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-dim">
            Kết nối camera IP qua RTSP/ONVIF, để AI nhận diện dấu hiệu bắt nạt từ hình ảnh và âm thanh, lưu bằng chứng
            và cảnh báo ngay lập tức cho giáo viên, bảo vệ.
          </p>
          <div className="mt-7 max-w-lg">
            <Viewfinder />
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="animate-rise" style={{ animationDelay: `${150 + i * 90}ms` }}>
              <Icon className="size-5 text-signal" />
              <div className="mt-2.5 text-sm font-semibold">{title}</div>
              <p className="mt-1 text-xs leading-relaxed text-mute">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoMark size={88} className="drop-shadow-[0_12px_40px_rgba(41,87,245,0.35)]" />
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-wide">Đăng nhập Camera AI</h2>
            <p className="mt-2 text-sm text-dim">Dùng tài khoản Google để đăng ký hoặc đăng nhập.</p>
          </div>

          <div className="panel brackets space-y-4 p-6">
            {body}
            {failure && (
              <Notice tone="critical" icon={TriangleAlert}>
                {failure}
              </Notice>
            )}
          </div>

          <div className="mt-6">
            <ServerSwitcher />
          </div>
        </div>
      </section>
    </div>
  );
}
