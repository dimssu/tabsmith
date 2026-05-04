import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 active:bg-accent/95 shadow-sm",
  secondary:
    "bg-surface-muted text-ink hover:bg-surface-subtle border border-border",
  ghost:
    "bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger:
    "bg-transparent text-red-500 hover:bg-red-500/10",
};

const SIZE: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  leadingIcon,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors",
        "focus-visible:focus-ring disabled:opacity-50 disabled:pointer-events-none",
        "select-none whitespace-nowrap",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <span className="shrink-0 -ml-0.5">{leadingIcon}</span> : null}
      {children}
    </button>
  );
}
