import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "radix-ui";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  primary:
    "bg-brand text-white hover:bg-[#3a68ff] shadow-[0_0_0_1px_rgba(91,130,255,0.45),0_8px_24px_-12px_rgba(41,87,245,0.9)]",
  secondary: "bg-panel-2 text-text border border-line hover:border-line-strong hover:bg-panel-3",
  ghost: "text-dim hover:text-text hover:bg-panel-2",
  danger: "bg-critical/10 text-critical border border-critical/30 hover:bg-critical/20",
  outline: "border border-line-strong text-text hover:border-signal/60 hover:text-signal",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, asChild, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-all",
        "disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  );
});
