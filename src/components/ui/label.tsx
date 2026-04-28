import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn("mb-1.5 block text-uism text-(--foreground)", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-(--destructive)">*</span>}
    </label>
  );
}

export function FieldHelper({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-helper"
      className={cn("mt-1.5 text-uism text-(--foreground-muted)", className)}
      {...props}
    />
  );
}

export function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn("mt-1.5 text-uism text-(--destructive)", className)}
      {...props}
    />
  );
}
