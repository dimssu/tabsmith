import { useEffect, useRef, useState } from "react";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Layers } from "@/components/Icon";
import { cn } from "@/shared/utils";

const COLOR_CHOICES = [
  "grey",
  "blue",
  "cyan",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
] as const;

const COLOR_DOT: Record<string, string> = {
  grey: "bg-zinc-400",
  blue: "bg-blue-500",
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
};

interface Props {
  onChanged: () => void;
}

export function GroupOverview({ onChanged }: Props) {
  const groups = useAsync(() => send({ type: "groups:listForCurrentWindow" }), []);
  useBroadcast((msg) => {
    if (msg.type === "suggestions:changed" || msg.type === "groups:changed") {
      onChanged();
      groups.refresh();
    }
  });

  if (groups.loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-surface-muted border border-border" />
        ))}
      </div>
    );
  }

  if (!groups.data || groups.data.length === 0) {
    return (
      <EmptyState
        icon={<Layers width={18} height={18} />}
        title="No groups in this window"
        body="Open Suggestions to let Tabsmith propose a starter set, or group tabs in Chrome — Tabsmith will recognize them automatically."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {groups.data.map((g) => (
        <li key={g.groupId}>
          <GroupRow
            groupId={g.groupId}
            title={g.title}
            color={g.color}
            memberCount={g.memberCount}
            onChanged={() => {
              groups.refresh();
              onChanged();
            }}
          />
        </li>
      ))}
    </ul>
  );
}

interface RowProps {
  groupId: number;
  title: string;
  color: string;
  memberCount: number;
  onChanged: () => void;
}

function GroupRow({ groupId, title, color, memberCount, onChanged }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    const next = draft.trim();
    if (next === title) return;
    await send({ type: "groups:rename", groupId, title: next });
    onChanged();
  };

  const recolor = async (next: string) => {
    setPickerOpen(false);
    if (next === color) return;
    await send({ type: "groups:recolor", groupId, color: next });
    onChanged();
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <button
            aria-label="Change group color"
            onClick={() => setPickerOpen((p) => !p)}
            className={cn(
              "w-3.5 h-3.5 rounded-full transition-transform hover:scale-110",
              "focus-visible:focus-ring outline-none ring-offset-1",
              COLOR_DOT[color] ?? "bg-zinc-400",
            )}
          />
          {pickerOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-5 z-20 rounded-lg border border-border
                bg-surface shadow-md p-1.5 grid grid-cols-5 gap-1 animate-fade-in"
            >
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  role="menuitem"
                  aria-label={c}
                  aria-current={c === color}
                  onClick={() => recolor(c)}
                  className={cn(
                    "w-5 h-5 rounded-full transition-transform hover:scale-110",
                    COLOR_DOT[c],
                    c === color && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  setDraft(title);
                  setEditing(false);
                }
              }}
              placeholder="Group name"
              className="w-full text-[13px] font-medium text-ink bg-transparent
                border-b border-accent outline-none py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-[13px] font-medium text-ink truncate text-left
                hover:text-accent transition-colors block w-full"
              title="Click to rename"
            >
              {title?.trim() || (
                <span className="italic text-ink-faint">Untitled group</span>
              )}
            </button>
          )}
          <div className="text-[11px] text-ink-faint">
            {memberCount} {memberCount === 1 ? "tab" : "tabs"}
          </div>
        </div>
      </div>
    </Card>
  );
}
