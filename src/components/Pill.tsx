import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

type Tone = "neutral" | "accent" | "warning" | "success" | "danger" | "info";

interface Props {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-ink-muted",
  accent: "bg-accent-soft text-accent",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Pill({ tone = "neutral", children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-px",
        "text-[10px] font-medium tracking-wide leading-none tabular-nums",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
