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
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-panel-3 transition-colors",
        "data-[state=checked]:border-signal/60 data-[state=checked]:bg-signal/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-3.5 translate-x-0.5 rounded-full bg-mute shadow transition-transform",
          "data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-signal",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
