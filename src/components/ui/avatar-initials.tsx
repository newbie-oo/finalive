import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-[12px]",
        md: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-base",
        xl: "h-24 w-24 text-2xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface AvatarInitialsProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  name: string;
  src?: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AvatarInitials({ name, src, size, className, ...props }: AvatarInitialsProps) {
  if (src) {
    return (
      <span
        className={cn(avatarVariants({ size, className }), "overflow-hidden bg-(--surface-muted)")}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(avatarVariants({ size, className }), "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]")}
      aria-label={name}
      {...props}
    >
      {getInitials(name)}
    </span>
  );
}
