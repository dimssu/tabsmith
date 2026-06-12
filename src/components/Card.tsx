import type { HTMLAttributes } from "react";
import { cn } from "@/shared/utils";

/**
 * Used sparingly — only when content is genuinely a bounded unit. Most
 * lists in Quarto should render flat with hairline dividers, not as
 * card grids. Decorative backdrop-blur was removed in the rebrand.
 */
export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-muted",
        "transition-colors duration-180 ease-out-quart",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
