import Image from "next/image";

import { cn } from "@/lib/utils";

/** Biểu tượng camera-AI (đã căn giữa, nền trong suốt). white = bản trắng cho nền sẫm. */
export function LogoMark({
  className,
  size = 40,
  white,
  priority,
}: {
  className?: string;
  size?: number;
  white?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={white ? "/logo-mark-white.png" : "/logo-mark.png"}
      alt="Camera AI"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

export function Logo({
  subtitle,
  size = 40,
  white,
}: {
  subtitle?: string;
  size?: number;
  white?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <LogoMark size={size} white={white} priority />
      <div className="min-w-0">
        <div className={cn("font-serif text-[20px] leading-none tracking-[-0.01em]", white ? "text-white" : "text-ink")}>
          Camera AI
        </div>
        <div
          className={cn(
            "mt-1 line-clamp-2 text-[10.5px] leading-[1.45] font-medium tracking-[0.14em] uppercase",
            white ? "text-white/60" : "text-ink-3",
          )}
        >
          {subtitle || "An toàn học đường"}
        </div>
      </div>
    </div>
  );
}
