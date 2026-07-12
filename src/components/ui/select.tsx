import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        // bg/texte explicites : nécessaires pour le <select> natif en dark mode
        "h-9 w-full cursor-pointer rounded-none border border-edge bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-axis disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
