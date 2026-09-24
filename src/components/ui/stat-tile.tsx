import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Stat tile: nhãn · giá trị · ghi chú. Giá trị dùng font sans, số tỷ lệ (không tabular). */
export function StatTile({
  label,
  value,
  unit,
  note,
  icon: Icon,
  tone = "default",
  children,
  className,
  style,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "critical" | "warning" | "signal" | "good";
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("panel relative overflow-hidden p-4 animate-rise", className)} style={style}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-dim">{label}</span>
        {Icon && (
          <Icon
            className={cn(
              "size-4",
              tone === "critical"
                ? "text-critical"
                : tone === "warning"
                  ? "text-warning"
                  : tone === "signal"
                    ? "text-signal"
                    : tone === "good"
                      ? "text-good"
                    : "text-mute",
            )}
          />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[30px] leading-none font-semibold tracking-tight text-text">{value}</span>
        {unit && <span className="text-sm text-dim">{unit}</span>}
      </div>
      {note && <div className="mt-2 text-xs text-mute">{note}</div>}
      {children}
      {tone === "critical" && (
        <span className="absolute inset-x-0 top-0 h-[2px] bg-critical shadow-[0_0_12px_var(--critical)]" />
      )}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="font-display text-[15px] font-semibold tracking-wide text-text">{title}</h2>
      </div>
      {action}
    </div>
  );
}
