import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

interface Props {
  tone?: "neutral" | "accent" | "warning" | "success";
  children: ReactNode;
  className?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-surface-subtle text-ink-muted",
  accent: "bg-accent-soft text-accent",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function Pill({ tone = "neutral", children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[2px]",
        "text-[10px] font-medium uppercase tracking-[0.04em] leading-none",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
