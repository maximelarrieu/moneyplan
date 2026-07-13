import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-edge px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-2",
        className,
      )}
      {...props}
    />
  );
}
