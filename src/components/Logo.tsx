import type { SVGProps } from "react";
import { cn } from "@/shared/utils";

interface MarkProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * The Tabsmith mark. Two stacked rounded "tabs" forming a T-shape with a
 * hairline base bar suggesting a work surface. The back tab is the page
 * (ink-faint); the front tab is the clay accent. Drawn on a 32×32 grid so
 * geometry pixel-snaps at 16, 24, 32 px.
 *
 * Use `currentColor` for the back tab and base bar; the accent fill comes
 * from CSS so theme changes propagate.
 */
export function LogoMark({ size = 24, className, ...rest }: MarkProps) {
  return (
    <svg
      role="img"
      aria-label="Tabsmith"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("text-ink", className)}
      {...rest}
    >
      {/* back tab — paper / ink-faint */}
      <path
        d="M9 5h14a2 2 0 0 1 2 2v3H7V7a2 2 0 0 1 2-2z"
        fill="currentColor"
        opacity="0.18"
      />
      <rect x="7" y="9" width="18" height="11" rx="2" fill="currentColor" opacity="0.18" />

      {/* front tab — clay accent */}
      <path
        d="M11 11h10a2 2 0 0 1 2 2v2H9v-2a2 2 0 0 1 2-2z"
        fill="rgb(var(--accent))"
      />
      <rect
        x="9"
        y="14"
        width="14"
        height="9"
        rx="2"
        fill="rgb(var(--accent))"
      />

      {/* work-surface hairline */}
      <line
        x1="5"
        y1="26.5"
        x2="27"
        y2="26.5"
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
 * "tabsmith" set in the base sans, 600 weight, tracking -0.012em. The dot
 * on the second "i" is replaced with the clay accent disc.
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
      aria-label="Tabsmith"
    >
      <span>tabsm</span>
      <span className="relative inline-block">
        i
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-accent"
          style={{
            width: dotSize,
            height: dotSize,
            top: `-0.55em`,
          }}
        />
      </span>
      <span>th</span>
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
