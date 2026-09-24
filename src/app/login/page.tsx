import type { Metadata } from "next";

import { LoginView } from "@/components/views/login-view";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return <LoginView />;
}
