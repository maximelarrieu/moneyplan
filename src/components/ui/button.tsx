import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "default" | "sm" | "icon";

/*
 * Boutons volontairement discrets : un seul bouton « primary » (encre pleine)
 * par écran, tout le reste en hairline ou fantôme. Pas d'aplats de couleur vive.
 */
const variants: Record<Variant, string> = {
  primary: "bg-ink text-page hover:opacity-85 active:opacity-70",
  outline:
    "border border-edge bg-transparent text-ink hover:border-axis hover:bg-ink/4 active:bg-ink/8",
  ghost: "text-ink-2 hover:bg-ink/6 hover:text-ink active:bg-ink/10",
  danger: "text-neg hover:bg-neg/8 active:bg-neg/15",
};

const sizes: Record<Size, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "size-8",
};

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "outline",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-none font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
