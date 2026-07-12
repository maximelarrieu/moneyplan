import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-ink placeholder:text-muted focus:outline-2 focus:outline-accent/60 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
