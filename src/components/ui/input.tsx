import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-none border border-edge bg-surface px-3 text-sm text-ink transition-colors duration-150 placeholder:text-muted hover:border-axis disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
