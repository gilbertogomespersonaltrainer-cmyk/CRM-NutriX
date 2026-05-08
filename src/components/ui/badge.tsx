import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        active: "bg-[#052e16]/50 text-[#4ade80] border border-[#22c55e33]",
        pending: "bg-[#451a03]/50 text-[#fbbf24] border border-[#f59e0b33]",
        inactive: "bg-[#1c1917] text-[#78716c] border border-[#292524]",
        paid: "bg-[#052e16]/50 text-[#86efac] border border-[#22c55e22]",
        overdue: "bg-[#450a0a]/50 text-[#f87171] border border-[#ef444433]",
        info: "bg-[#172554]/50 text-[#93c5fd] border border-[#3b82f633]",
        default: "bg-[#1a1a1a] text-white border border-[#2a2a2a]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
