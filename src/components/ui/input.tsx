import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]/50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
