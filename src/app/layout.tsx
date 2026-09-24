import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Newsreader } from "next/font/google";

import { Providers } from "@/components/shell/providers";

import "./globals.css";

const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Camera AI · An toàn học đường",
    template: "%s · Camera AI",
  },
  description:
    "Camera AI giúp nhà trường phát hiện sớm dấu hiệu bạo lực học đường: giám sát trực tiếp, cảnh báo tức thời, lưu bằng chứng và quay tại chỗ bằng điện thoại.",
  applicationName: "Camera AI",
  appleWebApp: { capable: true, title: "Camera AI", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f4ef",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
