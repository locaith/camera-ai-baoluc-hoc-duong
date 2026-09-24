# Camera AI · An toàn học đường — Website

Giao diện web (Next.js 16) của nền tảng camera AI phòng chống bạo lực học đường: xem camera trực tiếp,
AI phát hiện dấu hiệu bắt nạt, cảnh báo realtime, kho video AI và lưu trữ Cloudflare R2.
Đăng ký / đăng nhập bằng Google, phân quyền quản trị viên · vận hành · người xem.

Website chỉ là lớp giao diện, deploy trên Vercel. Phần AI, camera và dữ liệu nằm ở **máy chủ AI
(FastAPI + TensorFlow)** chạy tại trường, vì máy chủ đó phải ở cùng mạng LAN với camera.

```
Trình duyệt ──HTTPS──▶ Website (Vercel)
     │
     └──REST · SSE · WebSocket──▶ Máy chủ AI (FastAPI, tại trường) ──RTSP/ONVIF──▶ Camera IP
                                     │  └── lưu video local ──(khi đầy)──▶ Cloudflare R2
                                     └── xác minh đăng nhập Google
```

## Tính năng

| Trang | Nội dung |
|---|---|
| Tổng quan | KPI, biểu đồ cảnh báo theo giờ/ngày, camera trực tiếp, cảnh báo realtime, trạng thái AI & máy chủ |
| Xem trực tiếp | Lưới 1/4/9/16 camera qua **một** WebSocket, lớp AI (nhãn, độ tin cậy, VU-meter), phóng to, ghi 30s, chụp ảnh |
| Camera | Thêm camera bằng RTSP (mẫu URL theo hãng, kiểm tra kèm ảnh xem trước) hoặc quét ONVIF trong LAN |
| Chi tiết camera | Diễn biến nguy cơ 2 phút, xác suất từng lớp, âm thanh/lời nói, cảnh báo & clip của camera |
| Cảnh báo | Lọc theo thời gian, loại, mức độ, camera; ảnh chụp + clip bằng chứng; đánh dấu đã xử lý |
| Kho video AI | Tải video lên (kéo thả, có tiến độ), AI phân tích, dòng thời gian bấm để tua tới đoạn nghi vấn |
| Lưu trữ | Luồng Local → AI → R2, dung lượng, chính sách tự đẩy lên R2, đẩy thủ công từng video |
| Cài đặt | Tài khoản, duyệt/khoá/phân quyền người dùng, ngưỡng AI, ghi hình, còi báo |

## Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `NEXT_PUBLIC_API_URL` | Địa chỉ máy chủ AI mà trình duyệt gọi tới. Cùng máy: `http://127.0.0.1:8000` · Từ xa: URL HTTPS của Cloudflare Tunnel |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Tuỳ chọn. Mặc định website lấy Client ID từ `/api/health` của máy chủ |

Người dùng vẫn có thể đổi máy chủ ngay trên trang đăng nhập (nút **Đổi**), lưu riêng trong trình duyệt.

## Chạy thử trên máy

```bash
npm install
cp .env.example .env.local   # sửa NEXT_PUBLIC_API_URL cho đúng cổng máy chủ AI
npm run dev                  # http://localhost:3000
```

## Deploy lên Vercel

1. Import repo này vào Vercel (Framework: Next.js, không cần chỉnh lệnh build).
2. Thêm biến `NEXT_PUBLIC_API_URL` cho Production và Preview, rồi Redeploy.
3. Trên máy chủ AI, thêm domain Vercel vào `CORS_ORIGINS` trong `.env`.

## Bật đăng nhập Google

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth client ID** → loại *Web application*.
2. **Authorized JavaScript origins**: `https://<tên-project>.vercel.app` và `http://localhost:3000` (không cần redirect URI).
3. Dán Client ID vào `.env` của máy chủ AI rồi khởi động lại:

   ```env
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   AUTH_ADMIN_EMAILS=email-cua-ban@gmail.com   # luôn là quản trị viên
   AUTH_ALLOWED_DOMAINS=truonghoc.edu.vn       # tuỳ chọn: tự duyệt email tên miền trường
   ```

Lần đầu đăng nhập, tài khoản được tạo tự động. Email trong `AUTH_ADMIN_EMAILS` (hoặc người đầu tiên nếu để
trống) là quản trị viên. Người khác ở trạng thái **chờ duyệt** cho tới khi quản trị viên duyệt trong
*Cài đặt → Người dùng*. Website không giữ client secret: máy chủ tự xác minh ID token với Google rồi cấp phiên (JWT).

| Vai trò | Quyền |
|---|---|
| Người xem | Xem camera, cảnh báo, video |
| Vận hành | + ghi hình, đánh dấu, xử lý cảnh báo, tải video lên |
| Quản trị viên | + thêm/sửa camera, cài đặt, lưu trữ R2, quản lý người dùng |

## Truy cập từ xa bằng Cloudflare Tunnel

Máy chủ AI mặc định chỉ nghe `127.0.0.1`. Để website trên Vercel dùng được từ mọi nơi:

```bash
cloudflared tunnel --url http://127.0.0.1:8000        # thử nhanh, URL tạm *.trycloudflare.com
```

Dùng lâu dài nên tạo *named tunnel* với domain riêng (ví dụ `camera-api.truonghoc.vn`), đặt
`NEXT_PUBLIC_API_URL` bằng domain đó, và **bắt buộc bật đăng nhập Google** trước khi mở máy chủ ra Internet.

## Công nghệ

Next.js 16 (App Router, React 19.2, React Compiler) · Tailwind CSS 4 · Radix UI · SWR · Zustand · Recharts ·
Google Identity Services · Sonner.
