import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-surface-3 text-ink-2",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  critical: "bg-critical-soft text-critical",
  info: "bg-info-soft text-info",
  gold: "bg-[#f5eee1] text-[#7a5f2c]",
  outline: "border border-hairline-2 text-ink-2",
  dark: "bg-ink text-white",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  dot,
  pulse,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] leading-none font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("size-1.5 shrink-0 rounded-full bg-current", pulse && "animate-breathe")}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
