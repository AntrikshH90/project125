import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-amber-accent/30 bg-amber-accent/10 text-amber-400",
        secondary: "border-graphite-600 bg-graphite-800 text-slate-dim",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400",
        outline: "border-graphite-600 text-slate-text"
      }
    },
    defaultVariants: { variant: "default" }
  }
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
