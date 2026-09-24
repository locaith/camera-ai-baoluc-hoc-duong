"use client";

import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-hairline-2 transition-colors",
        "data-[state=checked]:bg-ink disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgb(22_24_29/0.25)] transition-transform duration-200",
          "data-[state=checked]:translate-x-5.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

/** Dòng bật/tắt có tiêu đề + mô tả. */
export function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-hairline bg-surface-2 px-4 py-3.5",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}
