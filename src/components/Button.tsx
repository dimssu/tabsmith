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
    "bg-accent text-accent-ink hover:brightness-95 active:brightness-90 " +
    "shadow-[inset_0_-1px_0_rgb(0_0_0/0.08)]",
  secondary:
    "bg-surface-muted text-ink border border-border hover:bg-surface-subtle",
  ghost:
    "bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger:
    "bg-transparent text-danger hover:bg-danger-soft",
};

const SIZE: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded",
  md: "h-9 px-3.5 text-sm gap-2 rounded-md",
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
        "inline-flex items-center justify-center font-medium",
        "transition-[background-color,color,border-color,filter] duration-160 ease-out-quart",
        "focus-visible:focus-ring outline-none",
        "disabled:opacity-40 disabled:pointer-events-none",
        "select-none whitespace-nowrap",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {leadingIcon ? (
        <span className="shrink-0 -ml-0.5 opacity-90">{leadingIcon}</span>
      ) : null}
      {children}
    </button>
  );
}
