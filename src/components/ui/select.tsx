import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full cursor-pointer rounded-lg border border-edge bg-surface px-3 text-sm text-ink focus:outline-2 focus:outline-accent/60 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
