import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
  {
    variants: {
      variant: {
        default: "border-brand/30 bg-brand/10 text-brand",
        outline: "border-line bg-transparent text-muted",
        success: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        danger: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
        neutral: "border-line bg-sunken text-faint",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
