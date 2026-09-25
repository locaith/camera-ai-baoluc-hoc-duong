export type CameraState = "online" | "connecting" | "error" | "offline";

export interface Analysis {
  class: string;
  confidence: number;
  bullying: boolean;
  /** Xác suất (%) lớp "nghi bắt nạt", kể cả khi lớp khác đứng đầu */
  risk?: number;
  probs?: Record<string, number>;
  time?: number;
}

export interface SpeechStatus {
  running: boolean;
  whisper: boolean;
  tts: boolean;
  last_text: string;
  toxic: boolean;
  bad_word: string;
  confidence: number;
  speech_detected: boolean;
  processed_chunks: number;
  last_age: number | null;
  error: string;
}

export interface RecordingStatus {
  video_id: string;
  active: boolean;
  started_at: number;
  end_time: number;
  frames: number;
  elapsed: number;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  manufacturer: string;
  model: string;
  rtsp_url: string;
  enabled: boolean;
  ai_enabled: boolean;
  audio_enabled: boolean;
  record_on_event: boolean;
  created_at: number;
  state: CameraState;
  connected: boolean;
  connected_since: number | null;
  reconnect_attempts: number;
  has_frame: boolean;
  video_frames: number;
  frame_age: number | null;
  fps: number;
  width: number;
  height: number;
  codec: string;
  has_audio: boolean;
  audio: {
    level: number;
    rms: number;
    sample_rate: number;
    channels: number;
    frames: number;
  };
  analysis: Analysis | null;
  anger: { value: number; status: string };
  recording: RecordingStatus | null;
  error: string;
  speech: SpeechStatus;
  /** "phone" = điện thoại/laptop đang quay bằng trang "Quay tại chỗ", "webcam" = webcam gắn vào máy chủ */
  source?: "rtsp" | "phone" | "webcam";
  virtual?: boolean;
  owner?: string;
}

export interface LiveStatus {
  state: CameraState;
  fps: number;
  width: number;
  height: number;
  has_audio: boolean;
  audio_level: number;
  anger: number;
  analysis: Pick<Analysis, "class" | "confidence" | "bullying" | "risk"> | null;
  recording: boolean;
}

export interface HistoryPoint {
  t: number;
  class: string;
  confidence: number;
  bullying: boolean;
  risk?: number;
  anger: number;
  audio: number;
}

export type EventType =
  | "bullying"
  | "toxic_speech"
  | "high_anger"
  | "camera_offline"
  | "camera_online"
  | "manual";

export type Severity = "critical" | "warning" | "info";

/** Quy trình xem xét của nhà trường */
export type ReviewStatus = "new" | "confirmed" | "false_alarm" | "resolved";

export interface AppEvent {
  id: string;
  camera_id: string | null;
  camera_name: string;
  type: EventType;
  severity: Severity;
  title: string;
  message: string;
  confidence: number | null;
  data: Record<string, unknown>;
  has_snapshot: boolean;
  video_id: string | null;
  acknowledged: boolean;
  acknowledged_at: number | null;
  status: ReviewStatus;
  note: string;
  handled_by: string;
  handled_at: number | null;
  created_at: number;
  video?: Video | null;
}

export type VideoSource = "upload" | "recording" | "event" | "phone";

export type AiStatus = "pending" | "processing" | "done" | "failed" | "recording";

export type StorageKind = "local" | "uploading" | "r2";

export interface AiSegment {
  start: number;
  end: number;
  peak: number;
  hits: number;
}

export interface AiSummary {
  samples: number;
  sample_fps: number;
  threshold: number;
  distribution: Record<string, number>;
  top_class: string;
  segments: AiSegment[];
  bullying_seconds: number;
  bullying_ratio: number;
  max_bullying_confidence: number;
  flagged: boolean;
  verdict: string;
}

export interface TimelineSample {
  t: number;
  class: string;
  confidence: number;
  bullying: boolean;
}

export interface Video {
  id: string;
  source: VideoSource;
  camera_id: string | null;
  camera_name: string;
  event_id: string | null;
  title: string;
  original_name: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  storage: StorageKind;
  has_thumbnail: boolean;
  ai_status: AiStatus;
  ai_progress: number;
  ai_summary: AiSummary | null;
  ai_error: string;
  flagged: boolean;
  created_at: number;
  processed_at: number | null;
  offloaded_at: number | null;
  ai_timeline?: TimelineSample[];
  event?: AppEvent | null;
}

export interface OffloadResult {
  success: boolean;
  error?: string;
  offloaded: { id: string; reason: "manual" | "age" | "capacity" }[];
  errors: { id: string; error: string }[];
}

export interface StorageSummary {
  local: {
    path: string;
    count: number;
    bytes: number;
    limit_bytes: number;
    percent: number;
    disk: { total: number; used: number; free: number };
    awaiting_ai: number;
  };
  r2: {
    configured: boolean;
    enabled: boolean;
    bucket: string;
    endpoint: string;
    prefix: string;
    count: number;
    bytes: number;
    uploading: number;
    error: string;
  };
  policy: {
    auto_offload: boolean;
    local_storage_max_gb: number;
    offload_after_hours: number;
    interval_minutes: number;
    last_run: number | null;
    last_result: OffloadResult | null;
  };
}

export interface Settings {
  bullying_threshold: number;
  bullying_min_hits: number;
  event_cooldown: number;
  anger_threshold: number;
  anger_min_hits: number;
  pre_roll_seconds: number;
  post_roll_seconds: number;
  record_fps: number;
  record_max_width: number;
  video_sample_fps: number;
  tts_alert: boolean;
  auto_offload: boolean;
  local_storage_max_gb: number;
  offload_after_hours: number;
  school_name: string;
  google_client_id: string;
  /** Chỉ quản trị viên nhận được 3 khoá dưới */
  admin_emails?: string;
  allowed_domains?: string;
  auto_approve?: boolean;
  /** Quyền của tài khoản được duyệt tự động */
  default_role?: "viewer" | "operator";
}

export type TimelineBucket = { t: number } & Record<EventType, number>;

export interface StatsOverview {
  hours: number;
  bucket: number;
  cameras: {
    total: number;
    online: number;
    error: number;
    ai_enabled: number;
    recording: number;
    devices: number;
  };
  events: {
    total: number;
    unacknowledged: number;
    needs_review: number;
    today: number;
    by_status: Partial<Record<ReviewStatus, number>>;
    by_type: Partial<Record<EventType, number>>;
    by_severity: Partial<Record<Severity, number>>;
    by_camera: { camera_id: string; camera_name: string; n: number }[];
    timeline: TimelineBucket[];
    recent: AppEvent[];
  };
  videos: {
    total: number;
    processed: number;
    queued: number;
    recording: number;
    flagged: number;
  };
  storage: StorageSummary;
}

export interface SystemInfo {
  name: string;
  version: string;
  uptime: number;
  platform: string;
  python: string;
  cpu: { percent: number; cores: number };
  memory: { percent: number; total: number; used: number; process: number };
  disk: { total: number; used: number; free: number };
  model: {
    name: string;
    architecture: string;
    input: number[];
    classes: string[];
    inferences: number;
    frames: number;
    last_ms: number;
  };
  engine: {
    running: boolean;
    interval: number;
    ticks: number;
    last_tick_ms: number;
    last_batch: number;
  };
  processor: { current: string | null; queued: number; processed: number };
  speech: SpeechStatus;
  recorder: { encoder: string | null };
  realtime_clients: number;
}

export type Role = "admin" | "operator" | "viewer";

export type AuthMode = "google" | "token" | "none";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: Role;
  status: "active" | "pending" | "disabled";
  created_at?: number | null;
  last_login?: number | null;
}

export interface Health {
  status: string;
  name: string;
  version: string;
  school_name: string;
  auth_required: boolean;
  auth: { mode: AuthMode; google_client_id: string };
  /** Máy chủ chưa bật đăng nhập Google: chỉ dùng được ngay trên máy chủ */
  setup_required: boolean;
  /** Ai đăng nhập cũng dùng được ngay, không chờ duyệt */
  open_signup?: boolean;
  local: boolean;
  time: number;
}

export interface GoogleLoginResult {
  status: "active" | "pending" | "disabled";
  token: string | null;
  expires?: number;
  user: SessionUser;
}

/** Thiết bị camera máy chủ tự tìm thấy trong cùng mạng WiFi/LAN */
export interface DiscoveredDevice {
  ip: string;
  onvif_port: number | null;
  xaddr: string;
  rtsp_ports: number[];
  kind: "onvif" | "rtsp";
  /** Hãng / model đọc từ ONVIF (không cần đăng nhập camera) */
  brand?: string;
  model?: string;
  first_seen: number;
  last_seen: number;
  added: boolean;
}

export interface DiscoverySnapshot {
  scanned_at: number | null;
  scanning: boolean;
  networks: string[];
  devices: DiscoveredDevice[];
  new: number;
}

/** Webcam gắn vào máy chủ (USB, webcam có sẵn) — không cần mật khẩu */
export interface ServerWebcam {
  name: string;
  audio: string;
  virtual: boolean;
  url: string;
  added: boolean;
}

export interface RtspProbe {
  success: boolean;
  error?: string;
  /** Lỗi kỹ thuật (đã che mật khẩu) */
  detail?: string;
  width?: number;
  height?: number;
  codec?: string;
  has_audio?: boolean;
  audio_codec?: string;
  snapshot?: string;
}
