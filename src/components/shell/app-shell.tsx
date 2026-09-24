"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConnection, useIsClient } from "@/lib/connection";
import { hostOf } from "@/lib/format";
import { useHealth } from "@/lib/hooks";

import { LogoMark } from "./logo";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function Booting() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={64} className="animate-pulse-soft" />
        <span className="eyebrow">Đang khởi động</span>
      </div>
    </div>
  );
}

function Unreachable({ baseUrl, onRetry }: { baseUrl: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="panel brackets w-full max-w-md p-6 text-center">
        <TriangleAlert className="mx-auto size-8 text-critical" />
        <h2 className="mt-3 font-display text-lg font-semibold">Mất kết nối máy chủ AI</h2>
        <p className="mt-2 text-sm text-dim">
          Không liên lạc được <span className="font-mono text-text">{hostOf(baseUrl)}</span>. Kiểm tra máy chủ (START.bat)
          hoặc đường truyền Cloudflare Tunnel.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={onRetry}>
            <RefreshCw /> Thử lại
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/login">Đổi máy chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  const router = useRouter();
  const baseUrl = useConnection((s) => s.baseUrl);
  const token = useConnection((s) => s.token);
  const user = useConnection((s) => s.user);
  const { data: health, error, mutate } = useHealth();

  const mode = health?.auth.mode;
  // Chế độ nội bộ không cần token, nhưng vẫn qua trang đăng nhập 1 lần để lấy hồ sơ
  const needLogin = Boolean(health) && (!user || (mode !== "none" && !token));

  useEffect(() => {
    if (isClient && needLogin) router.replace("/login");
  }, [isClient, needLogin, router]);

  if (!isClient) return <Booting />;
  if (error && !health) return <Unreachable baseUrl={baseUrl} onRetry={() => mutate()} />;
  if (!health || needLogin) return <Booting />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        {mode === "none" && (
          <div className="border-b border-warning/25 bg-warning/5 px-4 py-2 text-center text-xs text-warning md:px-6">
            Chế độ nội bộ: máy chủ chưa bật đăng nhập Google (GOOGLE_CLIENT_ID). Đừng mở máy chủ ra Internet ở chế độ này.
          </div>
        )}
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
