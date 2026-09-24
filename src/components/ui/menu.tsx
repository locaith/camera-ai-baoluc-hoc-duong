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
        sideOffset={6}
        className={cn(
          "panel z-50 min-w-48 p-1 shadow-xl shadow-black/50 data-[state=open]:animate-[fade-in_0.12s_ease-out]",
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
        "flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[13px] outline-none select-none [&_svg]:size-4",
        danger
          ? "text-critical data-[highlighted]:bg-critical/10"
          : "text-dim data-[highlighted]:bg-panel-2 data-[highlighted]:text-text",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export const MenuSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-line" />;

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
          sideOffset={6}
          className="z-50 max-w-72 rounded border border-line-strong bg-panel-3 px-2.5 py-1.5 text-xs text-text shadow-lg shadow-black/40 data-[state=delayed-open]:animate-[fade-in_0.1s_ease-out]"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
