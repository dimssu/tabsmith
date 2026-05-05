import { useEffect, useMemo, useState } from "react";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { Bell, ExternalLink, Layers, Sparkles, StickyNote } from "@/components/Icon";
import { ReminderQuickSet } from "@/sidepanel/ReminderQuickSet";
import { debounce, favicon, shortHost } from "@/shared/utils";

type Mode = "menu" | "note" | "remind" | "group";

export function App() {
  const [mode, setMode] = useState<Mode>("menu");
  const current = useAsync(() => send({ type: "tabs:current" }), []);
  const url = current.data?.url ?? "";
  const supported = url.startsWith("http");

  return (
    <div className="bg-surface text-ink min-h-[280px]">
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2 border-b border-border">
        <Sparkles width={14} height={14} className="text-accent" />
        <h1 className="text-[13px] font-semibold tracking-tight">Tabsmith</h1>
        <Pill tone="neutral" className="ml-auto">on-device</Pill>
      </div>

      {current.data ? (
        <div className="px-4 py-2.5 flex items-center gap-2.5 border-b border-border">
          <img
            src={favicon(url)}
            alt=""
            className="w-5 h-5 rounded shrink-0 bg-surface-subtle"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium truncate" title={current.data.title}>
              {current.data.title || "Untitled"}
            </div>
            <div className="text-[11px] text-ink-faint truncate flex items-center gap-1">
              {shortHost(url)}
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-faint hover:text-ink"
                >
                  <ExternalLink width={10} height={10} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="px-4 py-3.5">
        {mode === "menu" ? (
          <Menu setMode={setMode} supported={supported} />
        ) : mode === "note" ? (
          <NoteEditor url={url} title={current.data?.title ?? ""} onBack={() => setMode("menu")} />
        ) : mode === "remind" ? (
          <RemindSection url={url} title={current.data?.title ?? ""} onBack={() => setMode("menu")} />
        ) : (
          <GroupSection onBack={() => setMode("menu")} />
        )}
      </div>

      <div className="px-4 pb-3 pt-1 border-t border-border flex items-center justify-between">
        <button
          className="text-[11px] text-ink-faint hover:text-ink"
          onClick={async () => {
            const win = await chrome.windows.getCurrent();
            if (win.id !== undefined) {
              await chrome.sidePanel.open({ windowId: win.id });
              window.close();
            }
          }}
        >
          Open side panel →
        </button>
        <button
          className="text-[11px] text-ink-faint hover:text-ink"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Options
        </button>
      </div>
    </div>
  );
}

function Menu({ setMode, supported }: { setMode: (m: Mode) => void; supported: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <MenuButton
        icon={<StickyNote width={14} height={14} />}
        label="Add note to this tab"
        sub={supported ? "Capture context for next time" : "Open a regular page first"}
        disabled={!supported}
        onClick={() => setMode("note")}
      />
      <MenuButton
        icon={<Bell width={14} height={14} />}
        label="Remind me later"
        sub={supported ? "Reopens or notifies, even if closed" : "Open a regular page first"}
        disabled={!supported}
        onClick={() => setMode("remind")}
      />
      <MenuButton
        icon={<Layers width={14} height={14} />}
        label="What group should this go in?"
        sub="See top group matches"
        onClick={() => setMode("group")}
      />
    </div>
  );
}

function MenuButton({
  icon,
  label,
  sub,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left px-3 py-2.5 rounded-lg border border-border bg-surface-muted/40
        hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors group"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-accent">{icon}</span>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-ink leading-tight">{label}</div>
          <div className="text-[11px] text-ink-faint mt-0.5">{sub}</div>
        </div>
      </div>
    </button>
  );
}

function NoteEditor({ url, title, onBack }: { url: string; title: string; onBack: () => void }) {
  const note = useAsync(() => send({ type: "notes:get", url }), [url]);
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    if (note.loading || loaded) return;
    setBody(note.data?.body ?? "");
    setLoaded(true);
  }, [note, loaded]);

  const save = useMemo(
    () =>
      debounce(async (v: string) => {
        if (!url) return;
        await send({ type: "notes:upsert", url, body: v });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1100);
      }, 350),
    [url],
  );

  return (
    <div className="space-y-2.5">
      <BackRow onBack={onBack} title={title || "Note"} />
      <textarea
        autoFocus
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          save(e.target.value);
        }}
        placeholder="Why this tab? Where did I stop?"
        className="w-full min-h-[120px] px-3 py-2.5 text-[13px] leading-relaxed
          bg-surface-muted/60 border border-border rounded-lg
          placeholder:text-ink-faint resize-y outline-none focus:focus-ring
          scrollbar-thin"
      />
      <div className="flex items-center justify-end h-4">
        {status === "saved" ? <Pill tone="success">saved</Pill> : null}
      </div>
    </div>
  );
}

function RemindSection({ url, title, onBack }: { url: string; title: string; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <BackRow onBack={onBack} title={title || "Remind me"} />
      <ReminderQuickSet url={url} titleHint={title} />
      <p className="text-[11px] text-ink-faint">
        We'll fire a notification at the chosen time. If the tab is gone we'll reopen it.
      </p>
    </div>
  );
}

function GroupSection({ onBack }: { onBack: () => void }) {
  const suggestions = useAsync(async () => {
    const win = await chrome.windows.getCurrent();
    const all =
      win.id !== undefined
        ? await send({ type: "suggestions:list", windowId: win.id })
        : [];
    return all.filter((s) => s.kind === "assign");
  }, []);

  return (
    <div className="space-y-3">
      <BackRow onBack={onBack} title="Best group matches" />
      {suggestions.loading ? (
        <p className="text-[12px] text-ink-faint">Looking…</p>
      ) : suggestions.data && suggestions.data.length > 0 ? (
        <ul className="space-y-1.5">
          {suggestions.data.slice(0, 4).map((s) => (
            <li
              key={s.id}
              className="text-[12px] text-ink-muted px-3 py-2 rounded-md border border-border bg-surface-muted/40 flex items-center justify-between gap-2"
            >
              <span className="truncate">{s.reason}</span>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  await send({ type: "suggestions:accept", id: s.id });
                  suggestions.refresh();
                }}
              >
                Add
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-ink-faint">
          No close match. Try the side panel for new-group ideas.
        </p>
      )}
    </div>
  );
}

function BackRow({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center gap-2 -mt-1">
      <button
        onClick={onBack}
        className="text-[12px] text-ink-muted hover:text-ink"
        aria-label="Back"
      >
        ← Back
      </button>
      <span className="text-[12px] text-ink-faint truncate">{title}</span>
    </div>
  );
}
