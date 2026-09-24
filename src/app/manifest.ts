import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Camera AI · An toàn học đường",
    short_name: "Camera AI",
    description: "Giám sát, cảnh báo sớm và lưu bằng chứng bạo lực học đường bằng AI.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#f6f4ef",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Quay tại chỗ", url: "/capture" },
      { name: "Sự việc cần xem", url: "/incidents" },
    ],
  };
}
