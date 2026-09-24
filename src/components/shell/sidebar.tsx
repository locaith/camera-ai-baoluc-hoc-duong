"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings2 } from "lucide-react";

import { disableGoogleAutoSelect } from "@/components/auth/google-button";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useConnection, useRole } from "@/lib/connection";
import { useHealth, useStats } from "@/lib/hooks";
import { ROLE_LABELS } from "@/lib/labels";
import { useRealtime } from "@/lib/realtime";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { NAV_GROUPS, isActive } from "./nav";

export function useSignOut() {
  const router = useRouter();
  const clearSession = useConnection((s) => s.clearSession);
  return () => {
    disableGoogleAutoSelect();
    clearSession();
    router.replace("/login");
  };
}

/** Số sự việc đang chờ xem (hiện trên menu). */
export function useNeedsReview() {
  const { data } = useStats(24);
  return data?.events.needs_review ?? 0;
}

function CountPill({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-critical px-1.5 text-center text-[11px] leading-5 font-semibold text-white tabular">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin } = useRole();
  const needsReview = useNeedsReview();

  return (
    <nav className="space-y-7">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.admin || isAdmin);
        if (!items.length) return null;
        return (
          <div key={group.label}>
            <div className="eyebrow mb-2 px-3">{group.label}</div>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] transition-all duration-200",
                        active
                          ? "bg-surface font-medium text-ink shadow-soft ring-1 ring-hairline"
                          : "text-ink-2 hover:bg-surface/70 hover:text-ink",
                      )}
                    >
                      <Icon
                        className={cn("size-4.5 shrink-0", active ? "text-brand" : "text-ink-3 group-hover:text-ink-2")}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.href === "/incidents" && <CountPill value={needsReview} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AccountMenu({ children, align = "start" }: { children: React.ReactNode; align?: "start" | "end" }) {
  const user = useConnection((s) => s.user);
  const signOut = useSignOut();
  if (!user) return null;
  return (
    <Menu>
      <MenuTrigger asChild>{children}</MenuTrigger>
      <MenuContent align={align} className="w-64">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar user={user} size={38} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-3">{user.email || ROLE_LABELS[user.role]}</div>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/settings">
            <Settings2 /> Tài khoản & cài đặt
          </Link>
        </MenuItem>
        <MenuItem danger onSelect={signOut}>
          <LogOut /> Đăng xuất
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function SystemPulse() {
  const { status } = useRealtime();
  const ok = status === "open";
  return (
    <div className="flex items-center gap-2.5 px-3 text-xs text-ink-3">
      <span className="relative flex size-2">
        {ok && <span className="absolute inset-0 animate-ping rounded-full bg-success/40" />}
        <span className={cn("relative size-2 rounded-full", ok ? "bg-success" : "bg-warning")} />
      </span>
      {ok ? "Hệ thống đang giám sát" : "Đang kết nối hệ thống…"}
    </div>
  );
}

export function Sidebar() {
  const user = useConnection((s) => s.user);
  const { data: health } = useHealth();

  return (
    <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col border-r border-hairline/70 px-4 py-7 lg:flex">
      <Link href="/" className="px-2">
        <Logo subtitle={health?.school_name} />
      </Link>
      <div className="mt-10 min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <SidebarNav />
      </div>
      <div className="space-y-4 pt-6">
        <SystemPulse />
        {user && (
          <AccountMenu>
            <button className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-surface/80">
              <Avatar user={user} size={38} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13.5px] font-medium text-ink">{user.name}</span>
                <span className="mt-0.5 block text-xs text-ink-3">{ROLE_LABELS[user.role]}</span>
              </span>
              <ChevronsUpDown className="size-4 text-ink-3" />
            </button>
          </AccountMenu>
        )}
      </div>
    </aside>
  );
}
