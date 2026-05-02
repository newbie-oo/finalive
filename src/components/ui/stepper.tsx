import * as React from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface StepperStep {
  label: string;
}

interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  /** Zero-based index of the current step. */
  current: number;
}

export function Stepper({ steps, current, className, ...props }: StepperProps) {
  return (
    <ol
      role="list"
      aria-label="Checkout progress"
      className={cn("flex w-full items-center gap-2", className)}
      {...props}
    >
      {steps.map((step, idx) => {
        const isPast = idx < current;
        const isCurrent = idx === current;
        return (
          <li key={step.label} className="flex flex-1 items-center gap-2 min-w-0">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-uism font-semibold tabular-nums",
                isPast && "bg-(--success) text-white",
                isCurrent && "bg-(--primary) text-(--primary-fg)",
                !isPast && !isCurrent && "border border-(--border) text-(--foreground-muted)",
              )}
            >
              {isPast ? <Check weight="bold" className="h-4 w-4" /> : idx + 1}
            </span>
            <span
              className={cn(
                "truncate text-uism",
                isCurrent ? "text-(--foreground) font-medium" : "text-(--foreground-muted)",
              )}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "ml-auto h-px flex-1",
                  isPast ? "bg-(--success)" : "bg-(--border)",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
