import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

interface Props {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, body, hint, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-3 px-6 py-10 rounded-xl",
        "bg-surface-muted/40 border border-dashed border-border/60",
        className,
      )}
    >
      {icon ? (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-subtle text-ink-muted">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {body ? <p className="text-[12px] text-ink-muted leading-relaxed max-w-[28ch]">{body}</p> : null}
      </div>
      {hint ? <div className="text-[11px] text-ink-faint">{hint}</div> : null}
    </div>
  );
}
