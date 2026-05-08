import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]/50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
