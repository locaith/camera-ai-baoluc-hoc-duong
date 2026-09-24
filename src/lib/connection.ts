"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SessionUser } from "./types";

/** Địa chỉ máy chủ AI (FastAPI). Đặt NEXT_PUBLIC_API_URL trên Vercel. */
export const DEFAULT_API_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
);

export function normalizeUrl(value: string) {
  let url = value.trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

interface SessionState {
  baseUrl: string;
  token: string;
  user: SessionUser | null;
  setBaseUrl: (baseUrl: string) => void;
  setSession: (token: string, user: SessionUser) => void;
  clearSession: () => void;
}

export const useConnection = create<SessionState>()(
  persist(
    (set) => ({
      baseUrl: DEFAULT_API_URL,
      token: "",
      user: null,
      setBaseUrl: (baseUrl) =>
        set({ baseUrl: normalizeUrl(baseUrl) || DEFAULT_API_URL, token: "", user: null }),
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: "", user: null }),
    }),
    { name: "camera-ai-session" },
  ),
);

export function useSessionUser() {
  return useConnection((s) => s.user);
}

const RANK = { viewer: 1, operator: 2, admin: 3 } as const;

/** Quyền trong giao diện (máy chủ vẫn kiểm tra lại mọi thao tác). */
export function useRole() {
  const user = useConnection((s) => s.user);
  const role = user?.role ?? "viewer";
  return {
    role,
    isOperator: RANK[role] >= RANK.operator,
    isAdmin: role === "admin",
  };
}

const noopSubscribe = () => () => {};

/** true sau khi hydrate ở trình duyệt (localStorage đã sẵn sàng). */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Trang https gọi backend http (không phải localhost) sẽ bị trình duyệt chặn. */
export function isMixedContent(baseUrl: string) {
  if (typeof window === "undefined" || window.location.protocol !== "https:") return false;
  try {
    const url = new URL(baseUrl);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.protocol === "http:" && !local;
  } catch {
    return false;
  }
}
