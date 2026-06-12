import type { SVGProps } from "react";
import { cn } from "@/shared/utils";

interface MarkProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * The Quarto mark. A sheet folded into four leaves — the literal quarto
 * format — drawn as a 2×2 grid of rounded panels. Three leaves are paper
 * (ink-faint); the fourth is the clay accent, set slightly proud of the
 * grid like a turned page. Drawn on a 32×32 grid so geometry pixel-snaps
 * at 16, 24, 32 px.
 *
 * Use `currentColor` for the paper leaves and baseline; the accent fill
 * comes from CSS so theme changes propagate.
 */
export function LogoMark({ size = 24, className, ...rest }: MarkProps) {
  return (
    <svg
      role="img"
      aria-label="Quarto"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("text-ink", className)}
      {...rest}
    >
      {/* three paper leaves */}
      <rect x="6" y="5" width="9" height="9" rx="2" fill="currentColor" opacity="0.18" />
      <rect x="17" y="5" width="9" height="9" rx="2" fill="currentColor" opacity="0.18" />
      <rect x="6" y="16" width="9" height="9" rx="2" fill="currentColor" opacity="0.18" />

      {/* fourth leaf — clay accent, a hair larger like a turned page */}
      <rect x="17" y="16" width="10" height="10" rx="2.5" fill="rgb(var(--accent))" />

      {/* work-surface hairline */}
      <line
        x1="5"
        y1="29.5"
        x2="27"
        y2="29.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * "quarto" set in the base sans, 600 weight, tracking -0.012em, finished
 * with a clay accent disc as a full stop — the typographic end of a line.
 */
export function Wordmark({ size = "md", className }: WordmarkProps) {
  const sizeCls =
    size === "sm"
      ? "text-sm"
      : size === "lg"
        ? "text-xl"
        : "text-base";
  const dotSize = size === "sm" ? 4 : size === "lg" ? 6 : 5;
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-semibold text-ink",
        "tracking-[-0.012em] leading-none select-none",
        sizeCls,
        className,
      )}
      aria-label="Quarto"
    >
      <span>quarto</span>
      <span
        aria-hidden
        className="ml-[0.14em] inline-block rounded-full bg-accent"
        style={{
          width: dotSize,
          height: dotSize,
        }}
      />
    </span>
  );
}

interface LockupProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Mark + wordmark side by side, baseline-aligned. Use in the options
 * header and the popup header where there's room for the full identity.
 */
export function Lockup({ size = "md", className }: LockupProps) {
  const markSize = size === "sm" ? 18 : size === "lg" ? 28 : 22;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      <Wordmark size={size} />
    </span>
  );
}
