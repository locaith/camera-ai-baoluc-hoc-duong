import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Chakra_Petch, JetBrains_Mono } from "next/font/google";

import { Providers } from "@/components/shell/providers";

import "./globals.css";

const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Camera AI · An toàn học đường",
    template: "%s · Camera AI",
  },
  description:
    "Nền tảng camera AI phòng chống bạo lực học đường: xem trực tiếp, phát hiện dấu hiệu bắt nạt, cảnh báo realtime, kho video AI và lưu trữ Cloudflare R2.",
  applicationName: "Camera AI",
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${body.variable} ${chakra.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
