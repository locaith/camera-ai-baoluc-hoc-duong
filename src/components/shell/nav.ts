import {
  Cctv,
  Clapperboard,
  HardDrive,
  House,
  Inbox,
  MonitorPlay,
  ScanFace,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Chỉ quản trị viên thấy */
  admin?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Giám sát",
    items: [
      { href: "/", label: "Tổng quan", icon: House },
      { href: "/live", label: "Trực tiếp", icon: MonitorPlay },
      { href: "/capture", label: "Quay tại chỗ", icon: ScanFace },
    ],
  },
  {
    label: "Hồ sơ",
    items: [
      { href: "/incidents", label: "Sự việc", icon: Inbox },
      { href: "/videos", label: "Video", icon: Clapperboard },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/cameras", label: "Camera", icon: Cctv, admin: true },
      { href: "/storage", label: "Lưu trữ", icon: HardDrive, admin: true },
      { href: "/settings", label: "Cài đặt", icon: Settings2 },
    ],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
