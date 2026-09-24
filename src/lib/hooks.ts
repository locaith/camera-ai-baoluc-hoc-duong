"use client";

import useSWR, { mutate, type SWRConfiguration } from "swr";

import { api } from "./api";
import { useConnection } from "./connection";
import type {
  AppEvent,
  Camera,
  Health,
  HistoryPoint,
  SessionUser,
  Settings,
  StatsOverview,
  StorageSummary,
  SystemInfo,
  Video,
} from "./types";

type Key = [string, string];

export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  const baseUrl = useConnection((s) => s.baseUrl);
  const token = useConnection((s) => s.token);
  return useSWR<T>(
    baseUrl && path ? ([baseUrl + "|" + token, path] as Key) : null,
    ([, p]: Key) => api<T>(p),
    config,
  );
}

/** Làm mới mọi truy vấn có path bắt đầu bằng prefix. */
export function revalidate(prefix: string) {
  return mutate(
    (key) => Array.isArray(key) && typeof key[1] === "string" && key[1].startsWith(prefix),
  );
}

export const useCameras = () =>
  useApi<{ cameras: Camera[] }>("/api/cameras", { refreshInterval: 3000 });

export const useCamera = (id: string | null) =>
  useApi<Camera>(id ? `/api/cameras/${id}` : null, { refreshInterval: 2000 });

export const useCameraHistory = (id: string | null) =>
  useApi<{ history: HistoryPoint[] }>(id ? `/api/cameras/${id}/history` : null, {
    refreshInterval: 2000,
  });

export const useStats = (hours: number) =>
  useApi<StatsOverview>(`/api/stats/overview?hours=${hours}`, {
    refreshInterval: 15000,
    keepPreviousData: true,
  });

export const useSystem = () =>
  useApi<SystemInfo>("/api/system", { refreshInterval: 5000 });

export const useStorage = () =>
  useApi<StorageSummary>("/api/storage", { refreshInterval: 10000 });

export const useSettings = () => useApi<Settings>("/api/settings");

export const useEvents = (queryString: string) =>
  useApi<{ events: AppEvent[]; total: number }>(`/api/events?${queryString}`, {
    refreshInterval: 30000,
    keepPreviousData: true,
  });

export const useEvent = (id: string | null) =>
  useApi<AppEvent>(id ? `/api/events/${id}` : null);

export const useVideos = (queryString: string) =>
  useApi<{ videos: Video[]; total: number }>(`/api/videos?${queryString}`, {
    refreshInterval: 20000,
    keepPreviousData: true,
  });

export const useVideo = (id: string | null) =>
  useApi<Video>(id ? `/api/videos/${id}` : null);

/** /api/health không cần đăng nhập: biết máy chủ có sống và đang dùng kiểu đăng nhập nào. */
export function useHealth() {
  const baseUrl = useConnection((s) => s.baseUrl);
  return useSWR<Health>(
    baseUrl ? ([baseUrl, "/api/health"] as Key) : null,
    ([base]: Key) => api<Health>("/api/health", { baseUrl: base, token: "" }),
    { refreshInterval: 30000, shouldRetryOnError: true, errorRetryInterval: 4000 },
  );
}

export const useUsers = (enabled: boolean) =>
  useApi<{ users: SessionUser[] }>(enabled ? "/api/users" : null, { refreshInterval: 15000 });
