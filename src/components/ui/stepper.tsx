import * as React from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface StepperStep {
  label: string;
}

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepperStep[];
  /** Zero-based index of the current step. */
  current: number;
}

export function Stepper({ steps, current, className, ...props }: StepperProps) {
  return (
    <div
      role="list"
      aria-label="Checkout progress"
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      {steps.map((step, idx) => {
        const isPast = idx < current;
        const isCurrent = idx === current;
        const isFuture = idx > current;
        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-2">
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                  isPast && "bg-primary text-white",
                  isCurrent &&
                  "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  isFuture && "bg-muted text-muted-foreground",
                )}
              >
                {isPast ? (
                  <Check weight="bold" className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-uism",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isFuture
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                aria-hidden
                className={cn(
                  "mx-4 mb-6 h-0.5 w-20",
                  idx < current ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
