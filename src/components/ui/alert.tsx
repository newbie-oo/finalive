import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-button border px-3.5 py-3 text-left text-uism has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-muted border-border text-foreground",
        info:
          "bg-info-bg border-info/30 text-foreground *:data-[slot=alert-description]:text-muted-foreground",
        success:
          "bg-success-bg border-success/30 text-success-foreground *:data-[slot=alert-description]:text-success-foreground/90",
        warning:
          "bg-warning-bg border-warning/30 text-warning-foreground *:data-[slot=alert-description]:text-warning-foreground/90",
        destructive:
          "bg-destructive-bg border-destructive/30 text-destructive-foreground *:data-[slot=alert-description]:text-destructive-foreground/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-uism text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-2",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "absolute top-[calc(--spacing(1.25))] right-[calc(--spacing(1.25))]",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
