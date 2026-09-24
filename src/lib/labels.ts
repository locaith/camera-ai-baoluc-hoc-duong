import type {
  AiStatus,
  CameraState,
  EventType,
  ReviewStatus,
  Role,
  Severity,
  StorageKind,
  VideoSource,
} from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Quản trị viên",
  operator: "Giáo viên",
  viewer: "Chỉ xem",
};

export const ROLE_HINTS: Record<Role, string> = {
  admin: "Toàn quyền: camera, người dùng, cài đặt và lưu trữ",
  operator: "Xem, ghi nhận và xử lý sự việc; ghi hình, tải video",
  viewer: "Xem camera, sự việc, video và quay tại chỗ",
};

export const CLASS_LABELS: Record<string, string> = {
  possible_bullying: "Nghi bắt nạt",
  "possible-bullying": "Nghi bắt nạt",
  "normal-interaction": "Bình thường",
  unclear: "Chưa rõ",
  Unlabeled: "Chưa rõ",
  Unknown: "Chưa rõ",
};

export function classLabel(name?: string | null) {
  if (!name) return "—";
  return CLASS_LABELS[name] ?? name;
}

export const EVENT_LABELS: Record<EventType, string> = {
  bullying: "Nghi bắt nạt",
  toxic_speech: "Lời nói tiêu cực",
  high_anger: "La hét, căng thẳng",
  camera_offline: "Camera mất kết nối",
  camera_online: "Camera kết nối lại",
  manual: "Được đánh dấu",
};

/** Các loại "sự việc" cần nhà trường xem xét (khác thông báo kỹ thuật). */
export const INCIDENT_TYPES: EventType[] = ["bullying", "toxic_speech", "high_anger", "manual"];

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  new: "Cần xem",
  confirmed: "Đã xác nhận",
  false_alarm: "Báo nhầm",
  resolved: "Đã xử lý",
};

export const REVIEW_HINTS: Record<ReviewStatus, string> = {
  new: "Chưa có ai xem",
  confirmed: "Có sự việc thật, đang theo dõi",
  false_alarm: "AI nhận định chưa đúng",
  resolved: "Đã xử lý xong",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Mức độ cao",
  warning: "Mức độ vừa",
  info: "Thông tin",
};

export const STATE_LABELS: Record<CameraState, string> = {
  online: "Đang hoạt động",
  connecting: "Đang kết nối",
  error: "Mất tín hiệu",
  offline: "Đã tắt",
};

export const SOURCE_LABELS: Record<VideoSource, string> = {
  upload: "Tải lên",
  recording: "Ghi thủ công",
  event: "Clip sự việc",
  phone: "Quay tại chỗ",
};

export const AI_STATUS_LABELS: Record<AiStatus, string> = {
  pending: "Chờ phân tích",
  processing: "Đang phân tích",
  done: "Đã phân tích",
  failed: "Không phân tích được",
  recording: "Đang ghi",
};

export const STORAGE_LABELS: Record<StorageKind, string> = {
  local: "Máy chủ trường",
  uploading: "Đang chuyển lên đám mây",
  r2: "Lưu trữ đám mây",
};

export const OFFLOAD_REASONS: Record<string, string> = {
  manual: "thủ công",
  age: "đủ thời gian lưu",
  capacity: "bộ nhớ đầy",
};
