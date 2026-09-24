"use client";

import { useSyncExternalStore } from "react";

/** Một bộ đếm giây dùng chung cho mọi timecode trên màn hình. */
let now = Math.floor(Date.now() / 1000);
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Math.floor(Date.now() / 1000);
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNowSeconds() {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}

const timecode = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatTimecode(seconds: number) {
  return seconds ? timecode.format(new Date(seconds * 1000)) : "--/--/---- --:--:--";
}
