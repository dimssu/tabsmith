import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

interface Props {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/**
 * Empty states teach the interface. No card wrap, no border — the page is
 * the container. A small leading mark in muted ink anchors the headline,
 * helper text reads as prose underneath.
 */
export function EmptyState({ icon, title, body, hint, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-start text-left gap-3 px-1 py-8 max-w-prose",
        className,
      )}
    >
      {icon ? (
        <div className="text-ink-faint opacity-80 transition-colors duration-160">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <h3 className="text-md font-semibold text-ink leading-tight">{title}</h3>
        {body ? (
          <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
        ) : null}
      </div>
      {hint ? <div className="text-xs text-ink-faint mt-1">{hint}</div> : null}
    </div>
  );
}
