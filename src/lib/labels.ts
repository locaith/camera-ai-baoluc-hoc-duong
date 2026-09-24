import type {
  AiStatus,
  CameraState,
  EventType,
  Role,
  Severity,
  StorageKind,
  VideoSource,
} from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Quản trị viên",
  operator: "Vận hành",
  viewer: "Người xem",
};

export const ROLE_HINTS: Record<Role, string> = {
  admin: "Toàn quyền: camera, cài đặt, lưu trữ, người dùng",
  operator: "Ghi hình, đánh dấu, xử lý cảnh báo, tải video",
  viewer: "Chỉ xem camera, cảnh báo và video",
};

export const CLASS_LABELS: Record<string, string> = {
  possible_bullying: "Nghi bắt nạt",
  "possible-bullying": "Nghi bắt nạt",
  "normal-interaction": "Bình thường",
  unclear: "Không rõ",
  Unlabeled: "Chưa gán nhãn",
  Unknown: "Không xác định",
};

export function classLabel(name?: string | null) {
  if (!name) return "—";
  return CLASS_LABELS[name] ?? name;
}

export const EVENT_LABELS: Record<EventType, string> = {
  bullying: "Bắt nạt",
  toxic_speech: "Lời nói tiêu cực",
  high_anger: "La hét / căng thẳng",
  camera_offline: "Mất kết nối",
  camera_online: "Kết nối lại",
  manual: "Đánh dấu",
};

/** Loại sự kiện hiển thị trên biểu đồ (màu categorical đã kiểm định). */
export const CHART_EVENT_TYPES = [
  { key: "bullying", label: "Bắt nạt", color: "var(--series-bullying)" },
  { key: "toxic_speech", label: "Lời nói tiêu cực", color: "var(--series-toxic)" },
  { key: "high_anger", label: "La hét / căng thẳng", color: "var(--series-anger)" },
] as const;

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Nghiêm trọng",
  warning: "Cảnh báo",
  info: "Thông tin",
};

export const STATE_LABELS: Record<CameraState, string> = {
  online: "Trực tuyến",
  connecting: "Đang kết nối",
  error: "Mất tín hiệu",
  offline: "Đã tắt",
};

export const SOURCE_LABELS: Record<VideoSource, string> = {
  upload: "Tải lên",
  recording: "Ghi thủ công",
  event: "Clip sự kiện",
};

export const AI_STATUS_LABELS: Record<AiStatus, string> = {
  pending: "Chờ phân tích",
  processing: "Đang phân tích",
  done: "Đã phân tích",
  failed: "Lỗi phân tích",
  recording: "Đang ghi",
};

export const STORAGE_LABELS: Record<StorageKind, string> = {
  local: "Local",
  uploading: "Đang đẩy R2",
  r2: "Cloudflare R2",
};

export const OFFLOAD_REASONS: Record<string, string> = {
  manual: "thủ công",
  age: "quá hạn lưu local",
  capacity: "vượt dung lượng",
};
