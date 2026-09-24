"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useConnection } from "@/lib/connection";
import { hostOf } from "@/lib/format";
import { useStats, useSystem } from "@/lib/hooks";
import { useRealtime } from "@/lib/realtime";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { NAV, activeNav } from "./nav";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeNav(pathname);
  const { data: stats } = useStats(24);
  const unack = stats?.events.unacknowledged ?? 0;

  return (
    <nav className="space-y-0.5">
      {NAV.map((item) => {
        const active = item.href === current.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-md px-3 text-[14px] transition-colors",
              active
                ? "bg-signal/[0.07] text-text"
                : "text-dim hover:bg-panel-2 hover:text-text",
            )}
          >
            {active && (
              <span className="absolute top-2 bottom-2 -left-[13px] w-[3px] rounded-r bg-signal shadow-[0_0_12px_var(--signal)]" />
            )}
            <Icon
              className={cn("size-[18px]", active ? "text-signal" : "text-mute group-hover:text-dim")}
            />
            <span className="flex-1 font-medium">{item.label}</span>
            {item.href === "/events" && unack > 0 ? (
              <span className="rounded bg-critical px-1.5 font-mono text-[11px] font-semibold text-white tabular">
                {unack > 99 ? "99+" : unack}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-mute/70">{item.code}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function ConnectionCard() {
  const baseUrl = useConnection((s) => s.baseUrl);
  const { status } = useRealtime();
  const { data: system } = useSystem();

  const tone =
    status === "open" ? "bg-good" : status === "connecting" ? "bg-warning" : "bg-critical";
  const label =
    status === "open" ? "Realtime" : status === "connecting" ? "Đang nối" : "Mất kết nối";

  return (
    <Link
      href="/settings"
      className="block rounded-md border border-line bg-bg/40 p-3 transition-colors hover:border-line-strong"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">Máy chủ AI</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-dim uppercase">
          <span className={cn("size-1.5 rounded-full", tone, status === "open" && "animate-pulse-soft")} />
          {label}
        </span>
      </div>
      <div className="mt-2 truncate font-mono text-xs text-text">{hostOf(baseUrl)}</div>
      <div className="mt-1 font-mono text-[10px] text-mute">
        v{system?.version ?? "—"} · {system?.recorder.encoder ?? "…"}
      </div>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-panel/70 px-[13px] py-5 backdrop-blur lg:flex">
      <div className="px-2 pb-6">
        <Logo />
      </div>
      <div className="eyebrow px-3 pb-2">Điều hướng</div>
      <SidebarNav />
      <div className="mt-auto pt-6">
        <ConnectionCard />
      </div>
    </aside>
  );
}
