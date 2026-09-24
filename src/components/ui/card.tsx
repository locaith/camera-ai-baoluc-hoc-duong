import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  padded = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div className={cn("card", padded && "p-5 md:p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="font-serif text-[21px] leading-snug text-ink">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Tiêu đề trang: nhãn nhỏ · tiêu đề serif · mô tả · thao tác. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4 animate-rise", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <div className="eyebrow mb-3 flex items-center gap-2.5">
            <span className="h-px w-6 bg-gold" aria-hidden />
            {eyebrow}
          </div>
        )}
        <h1 className="display text-[32px] leading-[1.08] text-ink md:text-[42px]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Ô số liệu: nhãn · số lớn (serif) · ghi chú. */
export function Kpi({
  label,
  value,
  unit,
  note,
  icon: Icon,
  tone = "default",
  className,
  style,
  children,
}: {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  note?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "critical" | "warning" | "success" | "brand";
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const iconTone = {
    default: "bg-surface-3 text-ink-2",
    critical: "bg-critical-soft text-critical",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
    brand: "bg-brand-soft text-brand",
  }[tone];
  return (
    <div className={cn("card relative flex flex-col p-5 animate-rise", className)} style={style}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {Icon && (
          <span className={cn("grid size-8 place-items-center rounded-full", iconTone)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={cn("numeral text-[40px] leading-none", tone === "critical" ? "text-critical" : "text-ink")}>
          {value}
        </span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      {note && <div className="mt-2.5 text-xs leading-relaxed text-ink-3">{note}</div>}
      {children}
    </div>
  );
}
