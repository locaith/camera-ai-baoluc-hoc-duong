"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";

import { api } from "./api";
import { revalidate } from "./hooks";
import type { Settings } from "./types";
import { cn } from "./utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Tự lưu cài đặt: công tắc/danh sách lưu ngay, ô chữ lưu sau khi ngừng gõ.
 * Rời trang khi còn thay đổi chưa gửi thì gửi nốt trước khi đi.
 */
export function useSettingsAutosave() {
  const [state, setState] = useState<SaveState>("idle");
  const pending = useRef<Partial<Settings>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setState("saving");
    try {
      await api("/api/settings", { method: "PUT", json: patch });
      setState("saved");
      revalidate("/api/settings");
      revalidate("/api/health");
      revalidate("/api/storage");
      if ("auto_approve" in patch || "default_role" in patch) revalidate("/api/users");
    } catch (e) {
      setState("error");
      toast.error("Chưa lưu được", { description: (e as Error).message });
    }
  }

  function save(patch: Partial<Settings>, delay = 0) {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (delay > 0) timer.current = setTimeout(() => void flush(), delay);
    else void flush();
  }

  useEffect(
    () => () => {
      // Rời trang giữa lúc đang gõ: gửi nốt phần chưa lưu
      if (timer.current) clearTimeout(timer.current);
      const patch = pending.current;
      if (Object.keys(patch).length) void api("/api/settings", { method: "PUT", json: patch }).catch(() => {});
    },
    [],
  );

  return { state, save, flush };
}

/** Trạng thái tự lưu hiển thị ở góc thẻ cài đặt. */
export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  if (state === "idle") return <span className={cn("text-xs text-ink-3", className)}>Tự động lưu</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        state === "error" ? "text-critical" : state === "saved" ? "text-success" : "text-ink-3",
        className,
      )}
      aria-live="polite"
    >
      {state === "saving" && <LoaderCircle className="size-3.5 animate-spin" />}
      {state === "saved" && <Check className="size-3.5" />}
      {state === "error" && <CircleAlert className="size-3.5" />}
      {state === "saving" ? "Đang lưu…" : state === "saved" ? "Đã lưu" : "Chưa lưu được"}
    </span>
  );
}
