"use client";

import { AlertDialog } from "radix-ui";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-panel-2", className)} />;
}

export function Empty({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="brackets mb-4 grid size-14 place-items-center rounded-lg border border-line bg-panel-2 text-mute">
        <Icon className="size-6" />
      </div>
      <p className="font-display text-base font-semibold tracking-wide">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-dim">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Thanh đo: phần tô mang mức độ, rãnh là cùng tông nhạt hơn. */
export function Meter({
  value,
  tone = "signal",
  className,
  label,
}: {
  value: number;
  tone?: "signal" | "good" | "warning" | "critical" | "info" | "bullying" | "neutral";
  className?: string;
  label?: string;
}) {
  const colors = {
    neutral: ["bg-dim", "bg-panel-3"],
    signal: ["bg-signal", "bg-signal/12"],
    good: ["bg-good", "bg-good/12"],
    warning: ["bg-warning", "bg-warning/12"],
    critical: ["bg-critical", "bg-critical/12"],
    info: ["bg-info", "bg-info/12"],
    bullying: ["bg-bullying", "bg-bullying/15"],
  }[tone];
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", colors[1], className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", colors[0])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function severityTone(value: number, warn = 60, critical = 85) {
  if (value >= critical) return "critical" as const;
  if (value >= warn) return "warning" as const;
  return "good" as const;
}

export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  danger,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-[fade-in_0.15s_ease-out]" />
        <AlertDialog.Content className="panel fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 p-5 shadow-2xl shadow-black/60 data-[state=open]:animate-[fade-in_0.15s_ease-out]">
          <AlertDialog.Title className="font-display text-lg font-semibold tracking-wide">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-dim">
            {description}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">Huỷ</Button>
            </AlertDialog.Cancel>
            <Button
              variant={danger ? "danger" : "primary"}
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
