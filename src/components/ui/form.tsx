"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-xl border border-hairline-2 bg-surface text-[15px] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD, "h-11 px-3.5", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(FIELD, "min-h-24 px-3.5 py-3 leading-relaxed", className)} {...props} />;
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(FIELD, "h-11 appearance-none pr-10 pl-3.5 text-sm")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs leading-relaxed text-ink-3">{hint}</span>}
    </label>
  );
}

/** Thanh trượt có nhãn + giá trị (dùng cho ngưỡng AI). */
export function RangeField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  /** Gọi khi thả thanh trượt (để tự lưu) */
  onCommit?: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <span className="numeral shrink-0 text-lg whitespace-nowrap text-ink">
          {Number.isInteger(step) ? value : value.toFixed(1)}
          <span className="ml-0.5 font-sans text-xs text-ink-3">{unit}</span>
        </span>
      </div>
      <SliderPrimitive.Root
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={([v]) => onCommit?.(v)}
        className="relative flex h-5 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-surface-3">
          <SliderPrimitive.Range className="absolute h-full bg-ink" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          className="block size-5 rounded-full border border-hairline-2 bg-surface shadow-[0_2px_6px_rgb(22_24_29/0.18)] transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:outline-none"
        />
      </SliderPrimitive.Root>
      {hint && <p className="text-xs leading-relaxed text-ink-3">{hint}</p>}
    </div>
  );
}

/** Nhóm nút chọn 1 (bố cục lưới, khoảng thời gian...) */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
  size = "md",
}: {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={cn("inline-flex rounded-full border border-hairline bg-surface-3/70 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.title}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-all [&_svg]:size-4",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-[13px]",
              active
                ? "bg-surface text-ink shadow-[0_1px_3px_rgb(22_24_29/0.12)]"
                : "text-ink-3 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
