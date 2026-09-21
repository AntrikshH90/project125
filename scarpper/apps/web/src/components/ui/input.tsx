import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-graphite-600 bg-graphite-900 px-3 py-1 text-sm text-slate-text shadow-sm transition-colors placeholder:text-zinc-600 focus-visible:outline-none focus-visible:border-amber-accent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[70px] w-full rounded-md border border-graphite-600 bg-graphite-900 px-3 py-2 text-sm text-slate-text shadow-sm transition-colors placeholder:text-zinc-600 focus-visible:outline-none focus-visible:border-amber-accent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
