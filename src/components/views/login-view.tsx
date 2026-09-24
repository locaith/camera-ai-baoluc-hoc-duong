"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Check, Clock3, Copy, ExternalLink, LoaderCircle, Lock, RefreshCw } from "lucide-react";

import { GoogleButton, disableGoogleAutoSelect } from "@/components/auth/google-button";
import { Logo, LogoMark } from "@/components/shell/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { copyText, detectInAppBrowser, externalBrowserUrl, type InAppBrowser } from "@/lib/browser";
import { useConnection, useIsClient } from "@/lib/connection";
import { useHealth } from "@/lib/hooks";
import type { GoogleLoginResult, SessionUser } from "@/lib/types";

const PILLARS = [
  { no: "01", title: "Quan sát liên tục", text: "AI theo dõi hành lang, sân trường, cầu thang — cả ngày, không mệt mỏi." },
  { no: "02", title: "Báo ngay cho thầy cô", text: "Dấu hiệu bắt nạt được gửi tới điện thoại kèm ảnh và đoạn video." },
  { no: "03", title: "Lưu giữ bằng chứng", text: "Mọi sự việc có hồ sơ rõ ràng để nhà trường xử lý đúng mực." },
];

function BrandPanel({ school }: { school?: string }) {
  return (
    <section className="grain relative hidden h-dvh overflow-hidden bg-[#0f1f5c] text-white lg:sticky lg:top-0 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      {/* ánh sáng + vòng tròn đồng tâm rất mờ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 85% 110%, rgba(64,110,255,0.45), transparent 60%), radial-gradient(700px 500px at -10% -10%, rgba(29,63,184,0.9), transparent 60%)",
        }}
      />
      <svg aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 size-[720px] opacity-[0.09]" viewBox="0 0 100 100">
        {[48, 40, 32, 24, 16].map((r) => (
          <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="0.18" />
        ))}
      </svg>

      <div className="relative animate-rise">
        <Logo white subtitle={school} size={44} />
      </div>

      <div className="relative max-w-xl animate-rise [animation-delay:120ms]">
        <div className="mb-6 flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] text-[#d9c49b] uppercase">
          <span className="h-px w-8 bg-[#d9c49b]/70" /> Dành cho nhà trường
        </div>
        <h1 className="display text-[46px] leading-[1.06] xl:text-[56px]">
          An toàn của học sinh,
          <br />
          <span className="italic text-[#c9d6ff]">được nhìn thấy sớm hơn.</span>
        </h1>
        <p className="mt-6 max-w-md text-[15.5px] leading-relaxed text-white/70">
          Camera AI lặng lẽ quan sát các khu vực chung, nhận ra dấu hiệu bắt nạt và báo ngay cho thầy cô — để mỗi
          sự việc được xử lý kịp thời, tế nhị và đúng mực.
        </p>
      </div>

      <ul className="relative grid grid-cols-3 gap-8 border-t border-white/12 pt-8">
        {PILLARS.map((item, i) => (
          <li key={item.no} className="animate-rise" style={{ animationDelay: `${240 + i * 90}ms` }}>
            <div className="numeral text-[15px] text-[#d9c49b]">{item.no}</div>
            <div className="mt-2 text-[14px] font-medium">{item.title}</div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobileBrand({ school }: { school?: string }) {
  return (
    <div className="grain relative overflow-hidden rounded-b-[32px] bg-[#0f1f5c] px-6 pt-10 pb-12 text-white lg:hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(500px 300px at 100% 120%, rgba(64,110,255,0.5), transparent 60%)" }}
      />
      <div className="relative">
        <Logo white subtitle={school} size={40} />
        <h1 className="display mt-8 text-[32px] leading-[1.1]">
          An toàn của học sinh, <span className="italic text-[#c9d6ff]">được nhìn thấy sớm hơn.</span>
        </h1>
      </div>
    </div>
  );
}

/** Đang mở trong Zalo/Facebook...: cửa sổ Google sẽ trống -> mời mở bằng Chrome/Safari. */
function OpenInBrowser({ info, onStay }: { info: InAppBrowser; onStay: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/login`;
  const browser = info.os === "ios" ? "Safari" : "Chrome";

  return (
    <div className="space-y-4">
      <Notice tone="warning" icon={ExternalLink} title={`Hãy mở trang bằng ${browser}`}>
        Trang đang mở bên trong {info.app}. Google không cho đăng nhập trong trình duyệt của ứng dụng này nên cửa sổ đăng
        nhập sẽ bị trống.
      </Notice>
      {info.os !== "other" && (
        <Button variant="primary" size="lg" className="w-full" asChild>
          <a href={externalBrowserUrl(url, info.os)}>
            <ExternalLink /> Mở bằng {browser}
          </a>
        </Button>
      )}
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={async () => {
          if (await copyText(url)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }
        }}
      >
        {copied ? <Check /> : <Copy />} {copied ? "Đã chép liên kết" : "Sao chép liên kết"}
      </Button>
      <p className="text-center text-[13px] leading-relaxed text-ink-3">
        Hoặc bấm <b className="text-ink-2">{info.os === "ios" ? "⋯" : "⋮"}</b> ở góc màn hình → chọn{" "}
        <b className="text-ink-2">Mở bằng trình duyệt</b>, rồi đăng nhập bằng Google.
      </p>
      <button type="button" onClick={onStay} className="mx-auto block text-xs text-ink-3 underline underline-offset-2">
        Vẫn thử đăng nhập tại đây
      </button>
    </div>
  );
}

function Waiting({ user, onReset }: { user: SessionUser; onReset: () => void }) {
  const pending = user.status === "pending";
  return (
    <div className="space-y-6 text-center">
      <Avatar user={user} size={64} className="mx-auto" />
      <div>
        <div className="font-serif text-[22px] text-ink">{user.name}</div>
        <div className="mt-1 text-sm text-ink-3">{user.email}</div>
      </div>
      {pending ? (
        <Notice tone="warning" icon={Clock3} title="Đang chờ nhà trường duyệt" className="text-left">
          Tài khoản của thầy cô đã được ghi nhận. Quản trị viên sẽ duyệt và phân quyền; sau đó thầy cô chỉ cần đăng
          nhập lại.
        </Notice>
      ) : (
        <Notice tone="critical" icon={Lock} title="Tài khoản đang tạm khoá" className="text-left">
          Vui lòng liên hệ quản trị viên của trường nếu thầy cô cho rằng đây là nhầm lẫn.
        </Notice>
      )}
      <Button variant="secondary" className="w-full" onClick={onReset}>
        Dùng tài khoản Google khác
      </Button>
    </div>
  );
}

export function LoginView() {
  const router = useRouter();
  const isClient = useIsClient();
  const token = useConnection((s) => s.token);
  const user = useConnection((s) => s.user);
  const setSession = useConnection((s) => s.setSession);
  const setApiOverride = useConnection((s) => s.setApiOverride);
  const baseUrl = useConnection((s) => s.baseUrl);
  const { data: health, error, isLoading, isValidating, mutate } = useHealth();
  const [waiting, setWaiting] = useState<SessionUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [failure, setFailure] = useState("");
  const [stayInApp, setStayInApp] = useState(false);
  const inApp = isClient ? detectInAppBrowser(navigator.userAgent) : null;

  const mode = health?.auth.mode;
  const clientId = health?.auth.google_client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const school = health?.school_name || undefined;

  // Thử nghiệm: /login?api=https://... (hoặc ?api=default để về máy chủ mặc định)
  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("api");
    if (override === null) return;
    setApiOverride(override === "default" ? "" : override);
    router.replace("/login");
  }, [router, setApiOverride]);

  // Đã đăng nhập (hoặc đang dùng trực tiếp trên máy chủ) -> vào thẳng hệ thống
  useEffect(() => {
    if (user && (token || mode === "none")) router.replace("/");
  }, [user, token, mode, router]);

  async function finish(sessionToken: string) {
    const me = await api<SessionUser>("/api/auth/me", { token: sessionToken });
    setSession(sessionToken, me);
    toast.success(`Chào mừng, ${me.name || "thầy cô"}`);
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

  async function withCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      await finish(accessCode.trim());
    } catch {
      setFailure("Mã truy cập không đúng.");
    } finally {
      setBusy(false);
    }
  }

  async function enterLocal() {
    setBusy(true);
    setFailure("");
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
      <div className="space-y-4 py-2">
        <div className="skeleton mx-auto h-11 w-full max-w-90 rounded-full" />
        <p className="flex items-center justify-center gap-2 text-[13px] text-ink-3">
          <LoaderCircle className="size-3.5 animate-spin" /> Đang kết nối hệ thống…
        </p>
      </div>
    );
  } else if (error && !health) {
    body = (
      <div className="space-y-5">
        <Notice tone="warning" title="Hệ thống đang tạm gián đoạn">
          Máy chủ camera của trường chưa phản hồi. Thầy cô vui lòng thử lại sau ít phút.
        </Notice>
        <Button variant="secondary" className="w-full" onClick={() => mutate()} loading={isValidating}>
          {!isValidating && <RefreshCw />} Thử lại
        </Button>
      </div>
    );
  } else if (waiting) {
    body = <Waiting user={waiting} onReset={() => setWaiting(null)} />;
  } else if (health?.setup_required) {
    body = health.local ? (
      <div className="space-y-5">
        <Notice tone="info" title="Đang dùng trực tiếp trên máy chủ">
          Đăng nhập Google chưa được bật. Thầy cô có thể vào hệ thống ngay trên máy này, và nên hoàn tất cài đặt để
          giáo viên đăng nhập từ xa.
        </Notice>
        <Button variant="primary" size="lg" className="w-full" onClick={enterLocal} loading={busy}>
          Vào hệ thống {!busy && <ArrowRight />}
        </Button>
        <Button variant="link" className="mx-auto flex" asChild>
          <a href={`${baseUrl}/setup`} target="_blank" rel="noreferrer">
            Hoàn tất cài đặt đăng nhập Google
          </a>
        </Button>
      </div>
    ) : (
      <div className="space-y-4">
        <Notice tone="info" icon={Clock3} title="Nhà trường đang hoàn tất cài đặt">
          Hệ thống sắp sẵn sàng. Thầy cô vui lòng quay lại sau ít phút.
        </Notice>
        <details className="group rounded-2xl border border-hairline px-4 py-3 text-[13px] text-ink-2">
          <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
            Dành cho quản trị viên
          </summary>
          <p className="mt-2 leading-relaxed">
            Trang cài đặt ban đầu tự mở trên máy chủ của trường khi hệ thống khởi động (hoặc mở{" "}
            <span className="font-medium text-ink">127.0.0.1:8100/setup</span> ngay trên máy chủ). Điền mã đăng nhập
            Google, email quản trị viên rồi bấm Lưu.
          </p>
        </details>
      </div>
    );
  } else if (mode === "google" && inApp && !stayInApp) {
    body = <OpenInBrowser info={inApp} onStay={() => setStayInApp(true)} />;
  } else if (mode === "google") {
    body = (
      <div className="space-y-5">
        {clientId && (
          <div className={busy ? "pointer-events-none opacity-60" : undefined}>
            <GoogleButton clientId={clientId} onCredential={withGoogle} />
          </div>
        )}
        {busy && (
          <p className="flex items-center justify-center gap-2 text-[13px] text-ink-3">
            <LoaderCircle className="size-3.5 animate-spin" /> Đang xác minh tài khoản…
          </p>
        )}
      </div>
    );
  } else {
    body = (
      <form onSubmit={withCode} className="space-y-4">
        <Input
          type="password"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Mã truy cập quản trị"
          autoComplete="current-password"
          required
        />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Vào hệ thống {!busy && <ArrowRight />}
        </Button>
      </form>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.08fr_1fr]">
      <BrandPanel school={school} />
      <MobileBrand school={school} />

      <section className="flex items-start justify-center px-6 pt-10 pb-16 lg:min-h-dvh lg:items-center lg:py-16">
        <div className="w-full max-w-100 animate-rise [animation-delay:80ms]">
          <div className="hidden lg:block">
            <LogoMark size={52} priority />
          </div>
          <div className="eyebrow mt-0 lg:mt-10">{school || "Camera AI"}</div>
          <h2 className="display mt-3 text-[38px] leading-tight text-ink">Đăng nhập</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Dùng tài khoản Google của thầy cô để tiếp tục. Lần đầu đăng nhập sẽ tự tạo tài khoản và chờ nhà trường
            duyệt.
          </p>

          <div className="card mt-8 space-y-4 p-6">
            {body}
            {failure && (
              <Notice tone="critical" title="Chưa đăng nhập được">
                {failure}
              </Notice>
            )}
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-ink-3">
            Hình ảnh và video được lưu trữ riêng cho nhà trường, chỉ dùng để bảo vệ học sinh.
          </p>
        </div>
      </section>
    </div>
  );
}
