"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const OVERLAY =
  "fixed inset-0 z-50 bg-[#16181d]/25 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_0.2s_ease-out]";

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
      <DialogPrimitive.Overlay className={OVERLAY} />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-3 bottom-3 z-50 flex max-h-[88dvh] flex-col rounded-[26px] border border-hairline bg-surface shadow-lift",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100vw-48px)] sm:-translate-x-1/2 sm:-translate-y-1/2",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
          "data-[state=open]:animate-[pop_0.22s_cubic-bezier(0.2,0.7,0.2,1)]",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
          <div>
            <DialogPrimitive.Title className="font-serif text-[24px] leading-tight text-ink">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1.5 text-sm text-ink-2">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink">
            <X className="size-4.5" />
            <span className="sr-only">Đóng</span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-3 pb-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "-mx-6 mt-6 -mb-6 flex flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/** Ngăn kéo bên phải (chi tiết sự việc...), toàn màn hình trên điện thoại. */
export function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={OVERLAY} />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-lift sm:inset-y-3 sm:right-3 sm:max-w-140 sm:rounded-[26px] sm:border sm:border-hairline",
          "data-[state=open]:animate-[slide-in_0.3s_cubic-bezier(0.2,0.7,0.2,1)]",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
          <DialogPrimitive.Title className="font-serif text-[21px] text-ink">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          <DialogPrimitive.Close className="-mr-2 grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink">
            <X className="size-4.5" />
            <span className="sr-only">Đóng</span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
