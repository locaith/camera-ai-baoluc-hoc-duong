"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConnection, useIsClient } from "@/lib/connection";
import { useApi, useHealth } from "@/lib/hooks";
import type { SessionUser } from "@/lib/types";

import { LogoMark } from "./logo";
import { BottomNav, MobileHeader } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function Booting() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-5">
        <LogoMark size={64} className="animate-breathe" priority />
        <span className="eyebrow">Camera AI</span>
      </div>
    </div>
  );
}

/** Máy chủ của trường không phản hồi: thông báo thân thiện, không dùng thuật ngữ kỹ thuật. */
export function Offline({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-md text-center animate-rise">
        <LogoMark size={56} className="mx-auto opacity-90" priority />
        <h1 className="display mt-8 text-[34px] leading-tight text-ink">Hệ thống đang tạm gián đoạn</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          Máy chủ camera của trường chưa phản hồi. Thầy cô vui lòng thử lại sau ít phút; nếu kéo dài, hãy báo cho bộ
          phận quản trị của trường.
        </p>
        <Button variant="primary" size="lg" className="mt-8" onClick={onRetry} loading={retrying}>
          {!retrying && <RefreshCw />} Thử lại
        </Button>
      </div>
    </div>
  );
}

/** Cập nhật hồ sơ (quyền có thể được quản trị viên đổi trong lúc đang đăng nhập). */
function ProfileSync() {
  const setUser = useConnection((s) => s.setUser);
  const { data } = useApi<SessionUser>("/api/auth/me", { refreshInterval: 60000 });
  useEffect(() => {
    if (data && JSON.stringify(data) !== JSON.stringify(useConnection.getState().user)) setUser(data);
  }, [data, setUser]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  const router = useRouter();
  const baseUrl = useConnection((s) => s.baseUrl);
  const token = useConnection((s) => s.token);
  const user = useConnection((s) => s.user);
  const { data: health, error, mutate, isValidating } = useHealth();

  const mode = health?.auth.mode;
  // Chưa bật đăng nhập Google thì chỉ dùng được ngay trên máy chủ, vẫn qua trang đăng nhập 1 lần
  const needLogin = Boolean(health) && (!user || (mode !== "none" && !token));

  useEffect(() => {
    if (isClient && needLogin) router.replace("/login");
  }, [isClient, needLogin, router]);

  if (!isClient) return <Booting />;
  if (error && !health) return <Offline onRetry={() => mutate()} retrying={isValidating} />;
  if (!health || needLogin) return <Booting />;

  return (
    <div className="flex min-h-dvh">
      <ProfileSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        {health.setup_required && (
          <div className="border-b border-warning/20 bg-warning-soft px-4 py-2.5 text-center text-[13px] text-warning">
            Hệ thống chưa bật đăng nhập Google nên chỉ dùng được trên máy chủ.{" "}
            <a href={`${baseUrl}/setup`} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
              Hoàn tất cài đặt
            </a>
          </div>
        )}
        <main className="mx-auto w-full max-w-350 flex-1 px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-11 lg:pb-16">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
