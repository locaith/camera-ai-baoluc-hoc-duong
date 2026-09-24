# Camera AI · An toàn học đường — Website

Giao diện web (Next.js 16) cho nhà trường: giám sát camera trực tiếp, AI phát hiện dấu hiệu bắt nạt,
thông báo tức thời, hồ sơ sự việc có quy trình ghi nhận, video bằng chứng, và **Quay tại chỗ** — biến điện
thoại/laptop của thầy cô thành một camera AI. Đăng ký / đăng nhập bằng Google.

Website chỉ là lớp giao diện, deploy trên Vercel. AI, camera và dữ liệu nằm ở **máy chủ AI (FastAPI +
TensorFlow)** chạy tại trường, cùng mạng WiFi/LAN với camera, ra Internet qua Cloudflare Tunnel.

```
Trình duyệt ──HTTPS──▶ Website (Vercel)
     │
     └──REST · SSE · WebSocket──▶ camera-api.locaith.ai (Cloudflare Tunnel)
                                     └──▶ Máy chủ AI tại trường ──RTSP/ONVIF──▶ Camera IP cùng mạng
                                            ├── lưu video trên máy ──(khi đầy)──▶ Cloudflare R2
                                            └── xác minh đăng nhập Google
```

## Các trang

| Trang | Dành cho | Nội dung |
|---|---|---|
| Tổng quan | Mọi người | Lời chào, số sự việc cần xem, hôm nay, camera hoạt động, 7 ngày qua, camera trực tiếp |
| Trực tiếp | Mọi người | Lưới 1/4/9/16 camera qua **một** WebSocket, nhận định AI, xem lớn, ghi 30 giây, chụp ảnh |
| Quay tại chỗ | Mọi người | Camera điện thoại/laptop gửi ~4 khung/giây về máy chủ để AI phân tích trực tiếp (cảnh báo, ảnh, clip như camera cố định); ghi video trên máy và gửi về khi dừng để AI xem lại toàn bộ |
| Sự việc | Mọi người | Cần xem · Đã xác nhận · Đã xử lý · Báo nhầm; ảnh + đoạn video; ghi chú và người xử lý |
| Video | Mọi người | Clip sự việc, quay tại chỗ, ghi thủ công, tải lên; dòng thời gian AI bấm để tua |
| Camera | Quản trị viên | Camera **tự tìm thấy trong cùng mạng WiFi** (ONVIF + cổng RTSP) → bấm Kết nối; thêm thủ công |
| Lưu trữ | Quản trị viên | Máy chủ → AI → đám mây (R2), chính sách tự chuyển |
| Cài đặt | Mọi người | Tài khoản, chuông báo; quản trị viên: tên trường, email quản trị, tên miền tự duyệt, người dùng, độ nhạy AI |

Vai trò: **Quản trị viên** (toàn quyền) · **Giáo viên** (ghi nhận/xử lý sự việc, ghi hình, tải video) ·
**Chỉ xem** (xem và quay tại chỗ).

## Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `NEXT_PUBLIC_API_URL` | Máy chủ AI của trường. Production: `https://camera-api.locaith.ai` · chạy thử trên máy chủ: `http://127.0.0.1:8100` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Tuỳ chọn. Mặc định lấy Client ID từ `/api/health` của máy chủ |

Thử nghiệm với máy chủ khác mà không build lại: mở `/login?api=https://...` (về mặc định: `/login?api=default`).

## Chạy thử trên máy

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://127.0.0.1:8100
npm run dev                  # http://localhost:3000
```

## Deploy

Repo đã nối với Vercel: đẩy lên nhánh `main` là tự deploy. Biến `NEXT_PUBLIC_API_URL` đặt trong
Vercel → Settings → Environment Variables. Trên máy chủ AI, domain Vercel phải có trong `CORS_ORIGINS`.

## Bật đăng nhập Google

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth client ID** → *Web application*.
2. **Authorized JavaScript origins**: `https://camera-ai-baoluc-hoc-duong.vercel.app` và `http://localhost:3000` (không cần redirect URI).
3. Trên máy chủ AI mở `http://127.0.0.1:8100/setup`, dán Client ID, nhập email quản trị viên rồi Lưu — có hiệu lực ngay.

Người đăng nhập lần đầu được tạo tài khoản ở trạng thái **chờ duyệt** (trừ email quản trị và tên miền được phép).
Website không giữ client secret: máy chủ tự xác minh ID token với Google rồi cấp phiên (JWT).
