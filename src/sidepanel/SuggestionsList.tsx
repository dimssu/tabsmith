import { useCallback } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { Check, Refresh, Sparkles, X } from "@/components/Icon";
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
      <div className="space-y-2 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[72px] rounded-xl bg-surface-muted border border-border"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles width={18} height={18} />}
        title="No suggestions yet"
        body="Open a few related tabs and Tabsmith will quietly cluster them. Nothing is auto-applied — every group needs your one-click confirm."
        hint={
          <button
            onClick={onAnalyze}
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <Refresh width={11} height={11} />
            Analyze now
          </button>
        }
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {data.map((s) => (
        <li key={s.id} className="animate-slide-up">
          <Card className="p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Pill tone={s.kind === "create" ? "accent" : "neutral"}>
                    {s.kind === "create" ? "New group" : "Add to group"}
                  </Pill>
                  <span className="text-[10px] tabular-nums text-ink-faint">
                    {Math.round(s.confidence * 100)}% match
                  </span>
                </div>
                <p className="text-[13px] text-ink leading-snug">{s.reason}</p>
                {s.proposedTitle ? (
                  <p className="mt-1.5 text-[11px] text-ink-muted">
                    <span className="text-ink-faint">label: </span>
                    <span className="font-medium text-ink">{s.proposedTitle}</span>
                    <span className="text-ink-faint"> · {s.tabIds.length} tabs</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismiss(s.id)}
                leadingIcon={<X width={12} height={12} />}
              >
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => accept(s.id)}
                leadingIcon={<Check width={12} height={12} />}
              >
                {s.kind === "create" ? "Create group" : "Add to group"}
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
