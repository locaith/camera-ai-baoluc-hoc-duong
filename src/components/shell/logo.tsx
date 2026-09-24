import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Logo camera-AI. Bản gốc (public/camera-AI.png) có hình người màu navy,
 * nên trên nền tối dùng biến thể public/logo-dark.png (navy -> trắng, giữ xanh thương hiệu).
 */
export function LogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/logo-dark.png"
      alt="Camera AI"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

export function Logo({ compact, size = 40 }: { compact?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[17px] font-bold tracking-[0.16em] text-text">
            CAMERA <span className="text-signal">AI</span>
          </div>
          <div className="mt-1.5 font-mono text-[10px] tracking-[0.2em] text-mute uppercase">
            An toàn học đường
          </div>
        </div>
      )}
    </div>
  );
}
