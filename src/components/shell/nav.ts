import {
  Cctv,
  Film,
  HardDrive,
  LayoutDashboard,
  MonitorPlay,
  Settings,
  Siren,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  code: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Tổng quan", code: "01", icon: LayoutDashboard },
  { href: "/live", label: "Xem trực tiếp", code: "02", icon: MonitorPlay },
  { href: "/cameras", label: "Camera", code: "03", icon: Cctv },
  { href: "/events", label: "Cảnh báo", code: "04", icon: Siren },
  { href: "/videos", label: "Kho video AI", code: "05", icon: Film },
  { href: "/storage", label: "Lưu trữ", code: "06", icon: HardDrive },
  { href: "/settings", label: "Cài đặt", code: "07", icon: Settings },
];

export function activeNav(pathname: string) {
  if (pathname === "/") return NAV[0];
  return NAV.slice(1).find((item) => pathname.startsWith(item.href)) ?? NAV[0];
}
