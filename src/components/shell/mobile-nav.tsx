"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Bell, ChevronRight, House, Inbox, LogOut, Menu as MenuIcon, MonitorPlay, ScanFace } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { useConnection, useRole } from "@/lib/connection";
import { useHealth } from "@/lib/hooks";
import { ROLE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { LogoMark } from "./logo";
import { NAV, isActive } from "./nav";
import { AccountMenu, useNeedsReview, useSignOut } from "./sidebar";

export function MobileHeader() {
  const user = useConnection((s) => s.user);
  const { data: health } = useHealth();
  const needsReview = useNeedsReview();

  return (
    <header className="sticky top-0 z-30 flex h-15 items-center justify-between gap-3 border-b border-hairline/70 bg-canvas/85 px-4 backdrop-blur-xl lg:hidden">
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <LogoMark size={32} priority />
        <span className="min-w-0">
          <span className="block font-serif text-[18px] leading-none text-ink">Camera AI</span>
          <span className="mt-0.5 block truncate text-[10px] leading-[1.5] font-medium tracking-[0.12em] text-ink-3 uppercase">
            {health?.school_name || "An toàn học đường"}
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-1.5">
        <Link
          href="/incidents"
          aria-label={`Sự việc cần xem: ${needsReview}`}
          className="relative grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface"
        >
          <Bell className="size-5" strokeWidth={1.75} />
          {needsReview > 0 && (
            <span className="absolute top-1 right-1 min-w-4.5 rounded-full bg-critical px-1 text-center text-[10px] leading-4.5 font-semibold text-white tabular">
              {needsReview > 99 ? "99+" : needsReview}
            </span>
          )}
        </Link>
        {user && (
          <AccountMenu align="end">
            <button aria-label="Tài khoản" className="rounded-full">
              <Avatar user={user} size={34} />
            </button>
          </AccountMenu>
        )}
      </div>
    </header>
  );
}

const TABS = [
  { href: "/", label: "Tổng quan", icon: House },
  { href: "/live", label: "Trực tiếp", icon: MonitorPlay },
  { href: "/capture", label: "Quay", icon: ScanFace, primary: true },
  { href: "/incidents", label: "Sự việc", icon: Inbox },
];

function MoreSheet() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const user = useConnection((s) => s.user);
  const { isAdmin } = useRole();
  const signOut = useSignOut();
  const extra = NAV.filter((item) => !TABS.some((tab) => tab.href === item.href) && (!item.admin || isAdmin));
  const active = extra.some((item) => isActive(pathname, item.href));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className={cn("flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] font-medium", active ? "text-ink" : "text-ink-3")}
      >
        <MenuIcon className={cn("size-5.5", active && "text-brand")} strokeWidth={1.75} />
        Thêm
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#16181d]/25 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_0.2s_ease-out]" />
        <DialogPrimitive.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-hairline bg-surface shadow-lift data-[state=open]:animate-[rise_0.3s_cubic-bezier(0.2,0.7,0.2,1)]">
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Các mục khác</DialogPrimitive.Description>
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-hairline-2" />
          {user && (
            <div className="flex items-center gap-3 px-6 pt-5 pb-3">
              <Avatar user={user} size={44} />
              <div className="min-w-0">
                <div className="truncate font-serif text-[19px] text-ink">{user.name}</div>
                <div className="text-xs text-ink-3">{ROLE_LABELS[user.role]}</div>
              </div>
            </div>
          )}
          <ul className="px-3 pb-3">
            {extra.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex h-13 items-center gap-3.5 rounded-2xl px-3 text-[15px] text-ink hover:bg-surface-3"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-surface-3 text-ink-2">
                      <Icon className="size-4.5" strokeWidth={1.75} />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="size-4 text-ink-3" />
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex h-13 w-full items-center gap-3.5 rounded-2xl px-3 text-[15px] text-critical hover:bg-critical-soft"
              >
                <span className="grid size-9 place-items-center rounded-full bg-critical-soft">
                  <LogOut className="size-4.5" strokeWidth={1.75} />
                </span>
                Đăng xuất
              </button>
            </li>
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const needsReview = useNeedsReview();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/90 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          if (tab.primary) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 pb-2 text-[10.5px] font-medium text-ink"
              >
                <span
                  className={cn(
                    "-mt-4 grid size-12 place-items-center rounded-full text-white shadow-lift ring-4 ring-canvas transition-colors",
                    active ? "bg-brand" : "bg-ink",
                  )}
                >
                  <Icon className="size-5.5" strokeWidth={1.75} />
                </span>
                {tab.label}
              </Link>
            );
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] font-medium",
                active ? "text-ink" : "text-ink-3",
              )}
            >
              <Icon className={cn("size-5.5", active && "text-brand")} strokeWidth={1.75} />
              {tab.label}
              {tab.href === "/incidents" && needsReview > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-1.5 min-w-4.5 rounded-full bg-critical px-1 text-center text-[10px] leading-4.5 font-semibold text-white tabular">
                  {needsReview > 99 ? "99+" : needsReview}
                </span>
              )}
            </Link>
          );
        })}
        <MoreSheet />
      </div>
    </nav>
  );
}
