import type { HTMLAttributes } from "react";
import { cn } from "@/shared/utils";

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-muted/60 backdrop-blur-sm",
        "transition-shadow hover:shadow-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
