"use client";

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-line bg-bg/60 px-3 text-sm text-text placeholder:text-mute",
          "transition-colors outline-none focus:border-signal/60 focus:ring-2 focus:ring-signal/15",
          "disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-line bg-bg/60 px-2.5 text-sm text-text outline-none",
        "focus:border-signal/60 focus:ring-2 focus:ring-signal/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
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
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[13px] font-medium text-dim">{label}</span>
      {children}
      {hint && <span className="block text-xs text-mute">{hint}</span>}
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
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[13px] font-medium text-dim">
          {label}
        </label>
        <span className="shrink-0 font-mono text-sm whitespace-nowrap text-text tabular">
          {Number.isInteger(step) ? value : value.toFixed(1)}
          {unit}
        </span>
      </div>
      <SliderPrimitive.Root
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="relative flex h-4 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-panel-3">
          <SliderPrimitive.Range className="absolute h-full bg-signal" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          className="block size-4 rounded-full border-2 border-signal bg-bg shadow transition-transform hover:scale-110"
        />
      </SliderPrimitive.Root>
      {hint && <p className="text-xs text-mute">{hint}</p>}
    </div>
  );
}

/** Nhóm nút chọn 1 (layout lưới, khoảng thời gian...) */
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
      className={cn("inline-flex rounded-md border border-line bg-bg/50 p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors [&_svg]:size-4",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              active ? "bg-panel-3 text-text shadow-sm" : "text-mute hover:text-dim",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
