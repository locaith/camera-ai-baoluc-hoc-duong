"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SessionUser } from "./types";

/** Địa chỉ máy chủ AI của trường. Đặt NEXT_PUBLIC_API_URL trên Vercel. */
export const DEFAULT_API_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8100",
);

export function normalizeUrl(value: string) {
  let url = value.trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

interface SessionState {
  /** Máy chủ đang dùng = apiOverride || DEFAULT_API_URL */
  baseUrl: string;
  /** Chỉ dùng khi thử nghiệm (mở /login?api=...), bình thường để trống */
  apiOverride: string;
  token: string;
  user: SessionUser | null;
  setApiOverride: (url: string) => void;
  setSession: (token: string, user: SessionUser) => void;
  setUser: (user: SessionUser) => void;
  clearSession: () => void;
}

export const useConnection = create<SessionState>()(
  persist(
    (set) => ({
      baseUrl: DEFAULT_API_URL,
      apiOverride: "",
      token: "",
      user: null,
      setApiOverride: (url) => {
        const apiOverride = url.trim() ? normalizeUrl(url) : "";
        set({ apiOverride, baseUrl: apiOverride || DEFAULT_API_URL, token: "", user: null });
      },
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: "", user: null }),
    }),
    {
      // v2: không lưu địa chỉ máy chủ nữa để đổi NEXT_PUBLIC_API_URL là mọi người dùng theo
      name: "camera-ai-session-v2",
      partialize: ({ apiOverride, token, user }) => ({ apiOverride, token, user }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SessionState>;
        const apiOverride = saved.apiOverride ?? "";
        return { ...current, ...saved, apiOverride, baseUrl: apiOverride || DEFAULT_API_URL };
      },
    },
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
