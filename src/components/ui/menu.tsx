"use client";

import { DropdownMenu, Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  className,
  align = "end",
  ...props
}: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={8}
        className={cn(
          "z-50 min-w-52 rounded-2xl border border-hairline bg-surface p-1.5 shadow-lift data-[state=open]:animate-[pop_0.16s_ease-out]",
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  danger,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Item> & { danger?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm outline-none select-none [&_svg]:size-4 [&_svg]:shrink-0",
        danger
          ? "text-critical data-highlighted:bg-critical-soft"
          : "text-ink-2 data-highlighted:bg-surface-3 data-highlighted:text-ink",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export const MenuSeparator = () => <DropdownMenu.Separator className="mx-1.5 my-1 h-px bg-hairline" />;

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="z-50 max-w-72 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift data-[state=delayed-open]:animate-[fade-in_0.12s_ease-out]"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
