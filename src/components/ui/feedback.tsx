"use client";

import { AlertDialog } from "radix-ui";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
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
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <div className="mb-5 grid size-14 place-items-center rounded-full border border-hairline bg-surface-2 text-ink-3">
        <Icon className="size-6" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-[22px] text-ink">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type Tone = "brand" | "success" | "warning" | "critical" | "info" | "bullying" | "neutral" | "ink";

/** Thanh đo: phần tô mang mức độ, rãnh là cùng tông nhạt hơn. */
export function Meter({
  value,
  tone = "brand",
  className,
  label,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
}) {
  const colors: Record<Tone, [string, string]> = {
    ink: ["bg-ink", "bg-surface-3"],
    neutral: ["bg-series-neutral", "bg-surface-3"],
    brand: ["bg-brand", "bg-brand-soft"],
    success: ["bg-success", "bg-success-soft"],
    warning: ["bg-warning", "bg-warning-soft"],
    critical: ["bg-critical", "bg-critical-soft"],
    info: ["bg-info", "bg-info-soft"],
    bullying: ["bg-bullying", "bg-[#fdefe8]"],
  };
  const [fill, track] = colors[tone];
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", track, className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", fill)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function severityTone(value: number, warn = 60, critical = 85) {
  if (value >= critical) return "critical" as const;
  if (value >= warn) return "warning" as const;
  return "success" as const;
}

const NOTICE = {
  info: { icon: Info, className: "bg-info-soft text-info" },
  success: { icon: CircleCheck, className: "bg-success-soft text-success" },
  warning: { icon: TriangleAlert, className: "bg-warning-soft text-warning" },
  critical: { icon: CircleAlert, className: "bg-critical-soft text-critical" },
  neutral: { icon: Info, className: "bg-surface-3 text-ink-2" },
} as const;

/** Hộp thông báo mềm: luôn có biểu tượng + chữ, không chỉ dựa vào màu. */
export function Notice({
  tone = "info",
  icon,
  title,
  children,
  className,
}: {
  tone?: keyof typeof NOTICE;
  icon?: LucideIcon;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = icon ?? NOTICE[tone].icon;
  return (
    <div className={cn("flex gap-3 rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed", NOTICE[tone].className, className)}>
      <Icon className="mt-0.5 size-4.5 shrink-0" />
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && "mt-0.5", "text-ink-2 [&_b]:text-ink")}>{children}</div>}
      </div>
    </div>
  );
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
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[#16181d]/25 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_0.2s_ease-out]" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-hairline bg-surface p-6 shadow-lift data-[state=open]:animate-[pop_0.2s_ease-out]">
          <AlertDialog.Title className="font-serif text-[23px] leading-tight text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2.5 text-sm leading-relaxed text-ink-2">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">Huỷ</Button>
            </AlertDialog.Cancel>
            <Button variant={danger ? "danger-solid" : "primary"} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
