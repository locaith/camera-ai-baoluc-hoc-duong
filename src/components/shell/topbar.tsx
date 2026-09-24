"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Bell, LogOut, Menu as MenuIcon, Settings, X } from "lucide-react";

import { disableGoogleAutoSelect } from "@/components/auth/google-button";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { mediaUrl } from "@/lib/api";
import { useConnection } from "@/lib/connection";
import { formatRelative } from "@/lib/format";
import { useCameras, useEvents } from "@/lib/hooks";
import { EVENT_LABELS, ROLE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { activeNav } from "./nav";
import { SidebarNav } from "./sidebar";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="hidden text-right leading-none md:block">
      <div className="font-mono text-[15px] text-text tabular">
        {now ? now.toLocaleTimeString("vi-VN", { hour12: false }) : "--:--:--"}
      </div>
      <div className="mt-1 font-mono text-[10px] tracking-wider text-mute uppercase">
        {now
          ? now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
          : "—"}
      </div>
    </div>
  );
}

/** Mức nguy cơ hiện tại = độ tin cậy "bắt nạt" cao nhất trong các camera đang chạy. */
function ThreatMeter() {
  const { data } = useCameras();
  const cameras = data?.cameras ?? [];
  const level = cameras.reduce((max, camera) => {
    const a = camera.analysis;
    if (!a || camera.state !== "online") return max;
    return Math.max(max, a.risk ?? (a.bullying ? a.confidence : 0));
  }, 0);

  const segments = 12;
  const lit = Math.round((level / 100) * segments);
  const label = level >= 85 ? "Nguy cơ cao" : level >= 60 ? "Chú ý" : "Bình thường";
  const color = level >= 85 ? "bg-critical" : level >= 60 ? "bg-warning" : "bg-good";

  return (
    <div className="hidden items-center gap-3 xl:flex" title={`Độ tin cậy bắt nạt cao nhất: ${level.toFixed(0)}%`}>
      <div className="text-right leading-none">
        <div className="eyebrow">Mức nguy cơ</div>
        <div className="mt-1 text-[13px] font-semibold text-text">{label}</div>
      </div>
      <div className="flex h-7 items-end gap-[3px]" aria-hidden>
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              "w-[5px] rounded-[1px] transition-colors",
              i < Math.max(1, lit) ? color : "bg-panel-3",
            )}
            style={{ height: `${40 + (i / segments) * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function AlertsBell() {
  const { data } = useEvents("acknowledged=false&severity=warning,critical&limit=6");
  const count = data?.total ?? 0;

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          className="relative grid size-10 place-items-center rounded-md border border-line bg-panel-2 text-dim transition-colors hover:border-line-strong hover:text-text"
          aria-label={`Cảnh báo chưa xử lý: ${count}`}
        >
          <Bell className="size-[18px]" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-critical px-1 text-center font-mono text-[10px] leading-5 font-semibold text-white tabular">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </MenuTrigger>
      <MenuContent className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <span className="eyebrow">Chưa xử lý</span>
          <Link href="/events?status=open" className="text-xs text-signal hover:underline">
            Xem tất cả
          </Link>
        </div>
        {data?.events.length ? (
          <ul className="max-h-[360px] overflow-y-auto">
            {data.events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events?focus=${event.id}`}
                  className="flex gap-3 border-b border-line/60 px-3.5 py-2.5 hover:bg-panel-2"
                >
                  <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded bg-bg">
                    {event.has_snapshot && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(`/api/events/${event.id}/snapshot`)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-[3px]",
                        event.severity === "critical" ? "bg-critical" : "bg-warning",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-text">
                      {EVENT_LABELS[event.type]}
                    </div>
                    <div className="truncate text-xs text-dim">{event.camera_name}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-mute">
                      {formatRelative(event.created_at)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-dim">Không có cảnh báo chưa xử lý.</div>
        )}
      </MenuContent>
    </Menu>
  );
}

function UserMenu() {
  const router = useRouter();
  const user = useConnection((s) => s.user);
  const clearSession = useConnection((s) => s.clearSession);
  if (!user) return null;

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          className="flex h-10 items-center gap-2 rounded-md border border-line bg-panel-2 pr-2.5 pl-1 transition-colors hover:border-line-strong"
          aria-label="Tài khoản"
        >
          <Avatar user={user} size={30} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block max-w-32 truncate text-[13px] text-text">{user.name}</span>
            <span className="block text-[10px] text-mute">{ROLE_LABELS[user.role]}</span>
          </span>
        </button>
      </MenuTrigger>
      <MenuContent className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar user={user} size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm text-text">{user.name}</div>
            <div className="truncate font-mono text-[11px] text-mute">{user.email || ROLE_LABELS[user.role]}</div>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/settings">
            <Settings /> Cài đặt & tài khoản
          </Link>
        </MenuItem>
        <MenuItem
          danger
          onSelect={() => {
            disableGoogleAutoSelect();
            clearSession();
            router.replace("/login");
          }}
        >
          <LogOut /> Đăng xuất
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          className="grid size-10 place-items-center rounded-md border border-line bg-panel-2 text-dim lg:hidden"
          aria-label="Mở menu"
        >
          <MenuIcon className="size-5" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-line bg-panel px-[13px] py-5 data-[state=open]:animate-[fade-in_0.15s_ease-out]">
          <DialogPrimitive.Title className="sr-only">Điều hướng</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Menu chính</DialogPrimitive.Description>
          <div className="flex items-center justify-between px-2 pb-6">
            <Logo />
            <DialogPrimitive.Close className="rounded p-1 text-mute hover:text-text">
              <X className="size-5" />
              <span className="sr-only">Đóng</span>
            </DialogPrimitive.Close>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const nav = activeNav(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <MobileNav />
        <div className="min-w-0 flex-1 leading-none">
          <div className="eyebrow">
            <span className="text-signal">{nav.code}</span> / Hệ thống giám sát
          </div>
          <h1 className="mt-1.5 truncate font-display text-xl font-semibold tracking-wide text-text">
            {nav.label}
          </h1>
        </div>
        <ThreatMeter />
        <div className="hidden h-8 w-px bg-line xl:block" />
        <Clock />
        <AlertsBell />
        <UserMenu />
      </div>
    </header>
  );
}
