import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Avatar({ user, size = 32, className }: { user: Pick<SessionUser, "name" | "picture" | "email">; size?: number; className?: string }) {
  const initial = (user.name || user.email || "?").trim().slice(0, 1).toUpperCase();
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-panel-3 font-display font-semibold text-dim",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {user.picture ? (
        // Ảnh Google có thể chặn khi gửi Referer
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.picture} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
