import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        aria-invalid={invalid || undefined}
        className={cn(
          "block h-10 w-full rounded-[10px] border bg-(--surface) px-3 text-sm",
          "border-(--border) text-(--foreground) placeholder:text-(--foreground-subtle)",
          "outline-none transition-[border-color,box-shadow] duration-150",
          "focus:border-(--primary) focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-(--destructive) aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_20%,transparent)]",
          className,
        )}
        {...props}
      />
    );
  },
);

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        data-slot="textarea"
        aria-invalid={invalid || undefined}
        className={cn(
          "block w-full rounded-[10px] border bg-(--surface) px-3 py-2 text-sm leading-relaxed",
          "border-(--border) text-(--foreground) placeholder:text-(--foreground-subtle)",
          "outline-none transition-[border-color,box-shadow] duration-150 resize-y",
          "focus:border-(--primary) focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-(--destructive) aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_20%,transparent)]",
          className,
        )}
        {...props}
      />
    );
  },
);
