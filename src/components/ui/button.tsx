import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "radix-ui";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-ink text-white shadow-[0_1px_2px_rgb(22_24_29/0.25)] hover:bg-[#2c2f37]",
  brand: "bg-brand text-white shadow-[0_1px_2px_rgb(29_63_184/0.35)] hover:bg-brand-2",
  secondary:
    "border border-hairline-2 bg-surface text-ink shadow-[0_1px_2px_rgb(22_24_29/0.04)] hover:border-[#c8c2b4] hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink",
  danger: "bg-critical-soft text-critical hover:bg-[#fbe2dd]",
  "danger-solid": "bg-critical text-white hover:bg-[#9a1e14]",
  link: "text-brand underline-offset-4 hover:underline",
} as const;

const SIZES = {
  sm: "h-8 gap-1.5 px-3.5 text-[13px] [&_svg]:size-3.5",
  md: "h-10 gap-2 px-4.5 text-sm [&_svg]:size-4",
  lg: "h-12 gap-2.5 px-6 text-[15px] [&_svg]:size-4.5",
  xl: "h-14 gap-3 px-7 text-base [&_svg]:size-5",
  icon: "size-10 [&_svg]:size-4.5",
  "icon-sm": "size-8 [&_svg]:size-4",
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
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap select-none",
        "transition-[background-color,color,border-color,box-shadow,transform] duration-200 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
        VARIANTS[variant],
        variant === "link" ? "h-auto px-0" : SIZES[size],
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
