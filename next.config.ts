import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Trang "Cảnh báo" cũ đã đổi thành "Sự việc"
  redirects() {
    return [{ source: "/events", destination: "/incidents", permanent: true }];
  },
};

export default nextConfig;
