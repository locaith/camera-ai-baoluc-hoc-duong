"use client";

import { toast } from "sonner";

import { api, apiUrl } from "@/lib/api";
import { useConnection } from "@/lib/connection";
import { revalidate } from "@/lib/hooks";
import type { Camera } from "@/lib/types";

/** Các thao tác nhanh trên camera (lưới trực tiếp, trang chi tiết...). */
export function useCameraActions() {
  async function snapshot(camera: Camera) {
    try {
      const { token } = useConnection.getState();
      const res = await fetch(apiUrl(`/api/cameras/${camera.id}/snapshot`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Camera chưa có hình ảnh");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `${camera.name.replace(/\s+/g, "_")}_${stamp}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Đã lưu ảnh chụp", { description: camera.name });
    } catch (error) {
      toast.error("Chưa chụp được ảnh", { description: String((error as Error).message) });
    }
  }

  async function record(camera: Camera, seconds = 30) {
    try {
      const result = await api<{ video_id: string; extended: boolean }>(
        `/api/cameras/${camera.id}/record`,
        { method: "POST", json: { seconds } },
      );
      toast.success(result.extended ? "Đã ghi thêm thời gian" : `Đang ghi ${seconds} giây`, {
        description: `${camera.name} · video sẽ có trong mục Video khi ghi xong`,
      });
      revalidate("/api/cameras");
      revalidate("/api/videos");
    } catch (error) {
      toast.error("Chưa ghi được", { description: String((error as Error).message) });
    }
  }

  async function stopRecording(camera: Camera) {
    try {
      await api(`/api/cameras/${camera.id}/record/stop`, { method: "POST" });
      toast("Đã dừng ghi", { description: camera.name });
      revalidate("/api/cameras");
    } catch (error) {
      toast.error("Chưa dừng được", { description: String((error as Error).message) });
    }
  }

  async function mark(camera: Camera, message = "") {
    try {
      await api(`/api/cameras/${camera.id}/mark`, { method: "POST", json: { message } });
      toast.success("Đã đánh dấu thời điểm này", { description: `${camera.name} · kèm ảnh và đoạn video` });
    } catch (error) {
      toast.error("Chưa đánh dấu được", { description: String((error as Error).message) });
    }
  }

  async function setPower(camera: Camera, on: boolean) {
    try {
      await api(`/api/cameras/${camera.id}/${on ? "start" : "stop"}`, { method: "POST" });
      toast(on ? "Đang bật camera" : "Đã tắt camera", { description: camera.name });
      revalidate("/api/cameras");
    } catch (error) {
      toast.error("Thao tác chưa thành công", { description: String((error as Error).message) });
    }
  }

  async function update(camera: Camera, patch: Partial<Camera>) {
    try {
      await api(`/api/cameras/${camera.id}`, { method: "PATCH", json: patch });
      revalidate("/api/cameras");
    } catch (error) {
      toast.error("Chưa lưu được", { description: String((error as Error).message) });
    }
  }

  return { snapshot, record, stopRecording, mark, setPower, update };
}
