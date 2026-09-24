import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TONES = {
  neutral: "border-line-strong bg-panel-2 text-dim",
  signal: "border-signal/35 bg-signal/10 text-signal",
  good: "border-good/35 bg-good/10 text-good",
  critical: "border-critical/40 bg-critical/12 text-critical",
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-info/35 bg-info/10 text-info",
  solid: "border-transparent bg-text text-bg",
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
        "inline-flex h-[22px] items-center gap-1.5 rounded border px-2 font-mono text-[11px] font-medium tracking-wide whitespace-nowrap uppercase",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("size-1.5 rounded-full bg-current", pulse && "animate-pulse-soft")}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
