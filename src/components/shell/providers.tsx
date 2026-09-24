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
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "!bg-panel-2 !border !border-line-strong !text-text !font-sans !rounded-lg",
            description: "!text-dim",
          },
        }}
      />
    </SWRConfig>
  );
}
