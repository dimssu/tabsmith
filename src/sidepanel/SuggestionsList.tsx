import { useCallback } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { Check, Layers, Refresh, X } from "@/components/Icon";
import { send } from "@/messaging/client";
import type { Suggestion } from "@/types";

interface Props {
  data: Suggestion[];
  loading: boolean;
  onRefresh: () => void;
  onAnalyze: () => void;
}

export function SuggestionsList({ data, loading, onRefresh, onAnalyze }: Props) {
  const accept = useCallback(
    async (id: string) => {
      await send({ type: "suggestions:accept", id });
      onRefresh();
    },
    [onRefresh],
  );

  const dismiss = useCallback(
    async (id: string) => {
      await send({ type: "suggestions:dismiss", id });
      onRefresh();
    },
    [onRefresh],
  );

  if (loading && data.length === 0) {
    return (
      <ul className="space-y-3 animate-pulse">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-[68px] rounded-md bg-surface-muted border border-border"
          />
        ))}
      </ul>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Layers width={20} height={20} />}
        title="No suggestions"
        body="Open a few related tabs and Tabsmith will quietly cluster them. Nothing is auto-applied; every group needs your one-click confirm."
        hint={
          <button
            onClick={onAnalyze}
            className="inline-flex items-center gap-1.5 text-accent hover:underline"
          >
            <Refresh width={11} height={11} />
            Analyze now
          </button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {data.map((s) => (
        <li key={s.id} className="py-3.5 first:pt-2 animate-slide-up">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Pill tone={s.kind === "create" ? "accent" : "neutral"}>
                {s.kind === "create" ? "New group" : "Add to group"}
              </Pill>
              <span className="text-2xs tabular-nums text-ink-faint">
                {Math.round(s.confidence * 100)}% match
              </span>
            </div>
          </div>
          <p className="text-sm text-ink leading-snug">{s.reason}</p>
          {s.proposedTitle ? (
            <p className="mt-1 text-xs text-ink-muted">
              <span className="text-ink-faint">Label </span>
              <span className="font-semibold text-ink">{s.proposedTitle}</span>
              <span className="text-ink-faint">
                {" · "}
                {s.tabIds.length} {s.tabIds.length === 1 ? "tab" : "tabs"}
              </span>
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismiss(s.id)}
              leadingIcon={<X width={11} height={11} />}
            >
              Dismiss
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => accept(s.id)}
              leadingIcon={<Check width={11} height={11} />}
            >
              {s.kind === "create" ? "Create group" : "Add to group"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
