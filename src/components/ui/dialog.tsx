"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  wide,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_0.15s_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          "panel brackets fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col shadow-2xl shadow-black/60",
          wide ? "max-w-3xl" : "max-w-lg",
          "data-[state=open]:animate-[fade-in_0.18s_ease-out]",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <DialogPrimitive.Title className="font-display text-lg font-semibold tracking-wide">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-[13px] text-dim">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded p-1 text-mute hover:bg-panel-2 hover:text-text">
            <X className="size-4" />
            <span className="sr-only">Đóng</span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-5 mt-5 -mb-4 flex justify-end gap-2 border-t border-line px-5 py-3", className)}
      {...props}
    />
  );
}

/** Ngăn kéo bên phải (chi tiết sự kiện...) */
export function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-panel shadow-2xl shadow-black/60",
          "data-[state=open]:animate-[slide-in_0.25s_cubic-bezier(0.2,0.7,0.2,1)]",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <DialogPrimitive.Title className="font-display text-lg font-semibold tracking-wide">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          <DialogPrimitive.Close className="rounded p-1 text-mute hover:bg-panel-2 hover:text-text">
            <X className="size-4" />
            <span className="sr-only">Đóng</span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
