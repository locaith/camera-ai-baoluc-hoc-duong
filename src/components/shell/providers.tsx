"use client";

import { useEffect } from "react";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/menu";
import { useConnection } from "@/lib/connection";
import { liveSocket } from "@/lib/live";
import { RealtimeProvider } from "@/lib/realtime";

function LiveSocketBinder() {
  const baseUrl = useConnection((s) => s.baseUrl);
  const token = useConnection((s) => s.token);
  const signedIn = useConnection((s) => Boolean(s.user));

  useEffect(() => {
    liveSocket.configure(baseUrl && signedIn ? `${baseUrl}|${token}` : "");
  }, [baseUrl, token, signedIn]);

  // Dọn phiên đăng nhập kiểu cũ (lưu cả địa chỉ máy chủ) của bản trước
  useEffect(() => {
    try {
      localStorage.removeItem("camera-ai-session");
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        errorRetryCount: 2,
        dedupingInterval: 1000,
      }}
    >
      <TooltipProvider delayDuration={250}>
        <RealtimeProvider>
          <LiveSocketBinder />
          {children}
        </RealtimeProvider>
      </TooltipProvider>
      <Toaster
        theme="light"
        position="top-center"
        offset={16}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-2xl !border !border-hairline !bg-surface !text-ink !shadow-lift !font-sans !gap-3 !px-4 !py-3.5",
            title: "!text-[14px] !font-semibold",
            description: "!text-[13px] !text-ink-2",
            actionButton: "!rounded-full !bg-ink !px-3.5 !text-white",
            error: "[&_[data-icon]]:!text-critical",
            warning: "[&_[data-icon]]:!text-warning",
            success: "[&_[data-icon]]:!text-success",
            info: "[&_[data-icon]]:!text-brand",
          },
        }}
      />
    </SWRConfig>
  );
}
