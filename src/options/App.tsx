import { useEffect, useState } from "react";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { Lockup } from "@/components/Logo";
import { Plus, Trash } from "@/components/Icon";
import { DEFAULT_SNOOZE_PRESETS, formatMinutes } from "@/shared/snooze";
import type { Preferences, SnoozePreset, ThemeMode } from "@/types";

export function App() {
  useTheme();
  const prefs = useAsync(() => send({ type: "prefs:get" }), []);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <header className="flex items-end justify-between gap-3 border-b border-border pb-5">
          <div className="flex flex-col gap-2">
            <Lockup size="lg" />
            <p className="text-sm text-ink-muted">
              Privacy-first tab grouping, reminders, and contextual notes.
            </p>
          </div>
          <Pill tone="success" className="mb-1">
            <span
              aria-hidden
              className="inline-block w-1 h-1 rounded-full bg-success mr-0.5"
            />
            on-device
          </Pill>
        </header>

        <FeatureGuide />

        {prefs.loading || !prefs.data ? (
          <p className="text-[13px] text-ink-faint">Loading…</p>
        ) : (
          <PreferencesForm initial={prefs.data} onSaved={prefs.refresh} />
        )}

        <Section title="Appearance">
          <ThemePicker />
        </Section>

        <Section title="Reminder snooze">
          <SnoozePresetsEditor />
        </Section>

        <Section title="Notifications">
          <NotificationsToggle />
        </Section>

        <Section title="Notes">
          <ReadModeToggle />
        </Section>

        <Section title="Data">
          <DataControls />
        </Section>

        <Section title="Privacy">
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Tabsmith never sends your tabs, notes, reminders, or preferences anywhere.
            All processing — clustering, similarity scoring, suggestion ranking —
            runs locally inside the extension's service worker. There is no
            telemetry, no analytics, no remote model. The only network requests
            this extension can make are to <code>www.google.com/s2/favicons</code> to
            display website icons; you can block that in your browser if you prefer.
          </p>
        </Section>

        <footer className="text-2xs text-ink-faint pt-2 flex items-center gap-2 tabular-nums">
          <span>v0.1.0</span>
          <span aria-hidden>·</span>
          <span>MIT licensed</span>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xs uppercase tracking-[0.12em] text-ink-faint font-semibold">
        {title}
      </h2>
      <div className="rounded-md border border-border bg-surface-muted p-5">
        {children}
      </div>
    </section>
  );
}

interface FeatureGroup {
  title: string;
  intro?: string;
  bullets: Array<{ what: string; how?: string }>;
}

const FEATURE_GUIDE: FeatureGroup[] = [
  {
    title: "Smart group suggestions",
    intro:
      "Tabsmith quietly clusters related tabs and proposes groups in the side panel. Nothing is auto-applied — every group needs one click.",
    bullets: [
      {
        what: "“New group” suggestions cluster open tabs by domain + title similarity.",
        how: "Side panel → Suggestions tab. Click Create group to apply, or Dismiss to suppress for 24h.",
      },
      {
        what: "“Add to group” suggestions fire when you open a new tab that looks related to an existing group.",
        how: "They appear within ~2s of the new tab loading. The badge on the action icon shows the pending count.",
      },
      {
        what: "All suggestions are scoped to the window you’re in — multi-window users get independent suggestion lists per window.",
      },
      {
        what: "Click Analyze in the side panel header to re-scan immediately instead of waiting for the 30s periodic pass.",
      },
    ],
  },
  {
    title: "Per-URL notes",
    intro:
      "Leave a short note on any page — why you opened it, where you stopped, what's next. It comes back the moment you revisit.",
    bullets: [
      {
        what: "Notes autosave ~350ms after you stop typing. A “saved” pill confirms.",
        how: "Side panel → Note tab, or click the Tabsmith action icon → Add note.",
      },
      {
        what: "Markdown is supported (headings, **bold**, *italic*, `code`, [links](url), lists, > blockquotes, horizontal rules).",
        how: "Toggle Preview / Edit in the bottom-right of the editor. Read mode is the default; change that in Notes settings below.",
      },
      {
        what: "Pin a note to keep it surfaced in any future Notes list.",
        how: "Pin icon at the top-right of the note editor.",
      },
      {
        what: "URLs are normalized before keying notes — www, trailing slashes, utm_*/gclid/fbclid params are stripped — so the same logical page only ever has one note.",
      },
    ],
  },
  {
    title: "Tab reminders",
    intro:
      "Time-based reminders that work even after you close the tab. On fire, Tabsmith reopens it or focuses the existing one.",
    bullets: [
      {
        what: "Quick presets: 1h, 3h, Tomorrow, Next week.",
        how: "Side panel → Note tab → reminder section, or popup → Remind me later.",
      },
      {
        what: "Recurring reminders: Once / Daily / Weekly / Monthly.",
        how: "Select the recurrence radio below the time presets before clicking a preset.",
      },
      {
        what: "Snooze from the notification itself: Snooze 1h or Tomorrow buttons.",
        how: "Both buttons appear on every reminder notification — no need to open Tabsmith to snooze.",
      },
      {
        what: "Reminders survive browser restart — Chrome's alarms API persists them.",
      },
      {
        what: "Want to see exactly what happens on fire? Use the 10-second test reminder.",
        how: "Side panel → Note tab → reminder section → 'Try a 10-second test reminder'. A real reminder is scheduled for the current tab and fires after the countdown, with snooze buttons that genuinely work.",
      },
      {
        what: "See the full list, sorted by fire time, with a click-through to delete each.",
        how: "Side panel → Reminders tab.",
      },
    ],
  },
  {
    title: "Command palette",
    intro:
      "One keystroke to find anything Tabsmith knows about.",
    bullets: [
      {
        what: "Open the palette with ⌘K (mac) or Ctrl+K (Windows/Linux).",
        how: "Works inside the side panel; also bound globally so the shortcut works from any page (opens the side panel first).",
      },
      {
        what: "Searches across open tabs (current window first), notes, reminders, and recently-closed tabs.",
      },
      {
        what: "Arrow keys to navigate, Enter to open or restore, Esc to close.",
      },
      {
        what: "Closed-tab hits are restored via Chrome's sessions API where possible, so the entire history comes back.",
      },
    ],
  },
  {
    title: "Group management",
    intro:
      "Rename and recolor any group in the current window without leaving Tabsmith.",
    bullets: [
      {
        what: "Click a group's color dot to open the swatch picker.",
        how: "Side panel → Groups tab. The change applies immediately and syncs to every open side panel.",
      },
      {
        what: "Click a group's title to rename it inline. Enter commits, Esc reverts.",
      },
    ],
  },
  {
    title: "Popup quick-actions",
    intro:
      "Click the Tabsmith icon in the toolbar for fast, single-tab actions without opening the side panel.",
    bullets: [
      { what: "Add note to this tab — autosaving Markdown editor in a compact view." },
      { what: "Remind me later — same presets and recurrence options as the side panel." },
      { what: "What group should this go in? — top “add to group” matches for the active tab." },
    ],
  },
  {
    title: "Customization",
    intro: "Tune Tabsmith to your style. All preferences below persist locally.",
    bullets: [
      {
        what: "Theme: System / Light / Dark.",
        how: "Set in Appearance section below.",
      },
      {
        what: "Suggestion thresholds: control how confident Tabsmith must be before surfacing a group idea.",
        how: "Set in Suggestions section below. Higher = fewer but more confident suggestions.",
      },
      {
        what: "Notification preferences: turn reminder pings on or off.",
        how: "Notifications section below.",
      },
      {
        what: "Default note view: read or edit mode when revisiting a tab.",
        how: "Notes section below.",
      },
      {
        what: "Export, import, or clear all data as JSON — useful for moving between profiles.",
        how: "Data section below.",
      },
    ],
  },
];

function FeatureGuide() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink-faint font-semibold">
          How Tabsmith works
        </h2>
        <div className="flex items-center gap-2 text-[11px] text-ink-faint">
          <button
            className="hover:text-ink"
            onClick={() => setOpenIdx(openIdx === -1 ? 0 : -1)}
          >
            {openIdx === -1 ? "Expand all sections" : "Collapse all"}
          </button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface-muted overflow-hidden">
        {FEATURE_GUIDE.map((group, i) => {
          const expanded = openIdx === -1 ? true : openIdx === i;
          return (
            <div
              key={group.title}
              className={`border-border ${i > 0 ? "border-t" : ""}`}
            >
              <button
                onClick={() => setOpenIdx(expanded ? null : i)}
                aria-expanded={expanded}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left
                  hover:bg-surface-muted/60 transition-colors focus-visible:focus-ring outline-none"
              >
                <span className="text-[13.5px] font-semibold text-ink">{group.title}</span>
                <span
                  className={`text-ink-faint text-[11px] transition-transform ${expanded ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  ▶
                </span>
              </button>

              {expanded ? (
                <div className="px-5 pb-4 pt-1 space-y-2.5 animate-fade-in">
                  {group.intro ? (
                    <p className="text-[12.5px] text-ink-muted leading-relaxed">
                      {group.intro}
                    </p>
                  ) : null}
                  <ul className="space-y-1.5">
                    {group.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="text-[12.5px] text-ink leading-relaxed flex gap-2"
                      >
                        <span className="text-accent shrink-0 mt-[3px]" aria-hidden>
                          •
                        </span>
                        <span>
                          {b.what}
                          {b.how ? (
                            <span className="block text-[11.5px] text-ink-muted mt-0.5">
                              <span className="text-ink-faint">How:</span> {b.how}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PreferencesForm({
  initial,
  onSaved,
}: {
  initial: Preferences;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Preferences>(initial);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const update = async (patch: Partial<Preferences>) => {
    setDraft({ ...draft, ...patch });
    await send({ type: "prefs:update", patch });
    setSavedAt(Date.now());
    onSaved();
  };

  return (
    <Section title="Suggestions">
      <div className="space-y-5">
        <SliderRow
          label="Add-to-existing-group threshold"
          help="Higher = fewer, more confident suggestions. Lower = more, noisier."
          value={draft.assignThreshold}
          onChange={(v) => update({ assignThreshold: v })}
        />
        <SliderRow
          label="New-group threshold"
          help="Tighter clustering means each suggested group is more cohesive."
          value={draft.createThreshold}
          onChange={(v) => update({ createThreshold: v })}
        />
        <NumberRow
          label="Minimum tabs to suggest a new group"
          value={draft.minClusterSize}
          min={2}
          max={10}
          onChange={(v) => update({ minClusterSize: v })}
        />
        <NumberRow
          label="Idle re-analyze interval (seconds)"
          value={draft.idleAnalyzeSeconds}
          min={10}
          max={600}
          onChange={(v) => update({ idleAnalyzeSeconds: v })}
        />

        <div className="flex justify-between items-center text-[11px]">
          <span className="text-ink-faint">
            {savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : ""}
          </span>
          <button
            className="text-ink-muted hover:text-ink"
            onClick={async () => {
              const next = await send({ type: "prefs:update", patch: {
                assignThreshold: 0.55,
                createThreshold: 0.45,
                minClusterSize: 3,
                idleAnalyzeSeconds: 30,
              } });
              setDraft(next);
              setSavedAt(Date.now());
              onSaved();
            }}
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </Section>
  );
}

function SliderRow({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[12px] tabular-nums text-ink-muted">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-accent"
      />
      {help ? <p className="text-[11px] text-ink-faint mt-1">{help}</p> : null}
    </label>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Math.max(min, Math.min(max, Number(e.target.value) || min));
          onChange(v);
        }}
        className="w-20 px-2 py-1 rounded-md bg-surface border border-border text-[13px] tabular-nums text-right outline-none focus:focus-ring"
      />
    </label>
  );
}

function ThemePicker() {
  const prefs = useAsync(() => send({ type: "prefs:get" }), []);
  const options: { value: ThemeMode; label: string; sub: string }[] = [
    { value: "system", label: "System", sub: "Follow OS appearance" },
    { value: "light", label: "Light", sub: "Always light" },
    { value: "dark", label: "Dark", sub: "Always dark" },
  ];
  if (!prefs.data) return null;
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-ink-faint">
        Tabsmith follows your system theme by default. Override here if you want
        a fixed look across the side panel, popup, and options page.
      </p>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = prefs.data?.themeMode === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={async () => {
                await send({ type: "prefs:update", patch: { themeMode: opt.value } });
                prefs.refresh();
              }}
              className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                active
                  ? "bg-accent-soft border-accent/40 text-accent"
                  : "bg-surface border-border text-ink hover:bg-surface-muted"
              }`}
            >
              <div className="text-[13px] font-medium">{opt.label}</div>
              <div className="text-[11px] text-ink-faint mt-0.5">{opt.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SnoozePresetsEditor() {
  const prefs = useAsync(() => send({ type: "prefs:get" }), []);
  const [draft, setDraft] = useState<SnoozePreset[]>([]);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [newLabel, setNewLabel] = useState("");
  const [newMinutes, setNewMinutes] = useState<number | "">("");

  useEffect(() => {
    if (prefs.data?.snoozePresets) setDraft(prefs.data.snoozePresets);
  }, [prefs.data?.snoozePresets]);

  const persist = async (next: SnoozePreset[]) => {
    setDraft(next);
    await send({ type: "prefs:update", patch: { snoozePresets: next } });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= draft.length) return;
    const next = draft.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    persist(next);
  };

  const remove = (idx: number) => {
    if (draft.length <= 1) return; // schema enforces min 1
    persist(draft.filter((_, i) => i !== idx));
  };

  const add = () => {
    if (!newLabel.trim() || !newMinutes || Number(newMinutes) <= 0) return;
    if (draft.length >= 8) return;
    const next = [...draft, { label: newLabel.trim(), minutes: Number(newMinutes) }];
    persist(next);
    setNewLabel("");
    setNewMinutes("");
  };

  if (!prefs.data) return null;

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink-faint leading-relaxed">
        These appear in the snooze dropdown across the side panel, the in-page
        banner, and the popup. The <strong>top two</strong> are also used as
        the action buttons on the OS notification — drag the order to put your
        favorites there.
      </p>

      <ul className="space-y-1.5">
        {draft.map((p, i) => (
          <li
            key={`${p.label}-${i}`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface"
          >
            <span
              className="text-[10px] tabular-nums text-ink-faint w-6 shrink-0 text-center"
              title="Position in the snooze list"
            >
              {i + 1}
            </span>
            <input
              value={p.label}
              onChange={(e) => {
                const next = draft.slice();
                next[i] = { ...next[i], label: e.target.value };
                setDraft(next);
              }}
              onBlur={() => persist(draft)}
              className="flex-1 bg-transparent text-[13px] text-ink outline-none
                border-b border-transparent focus:border-accent/40 py-0.5"
              maxLength={24}
            />
            <input
              type="number"
              value={p.minutes}
              min={0.1}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!isFinite(v) || v <= 0) return;
                const next = draft.slice();
                next[i] = { ...next[i], minutes: v };
                setDraft(next);
              }}
              onBlur={() => persist(draft)}
              className="w-20 px-2 py-1 text-[12.5px] text-right tabular-nums rounded
                border border-border bg-surface outline-none focus:focus-ring"
            />
            <span className="text-[11px] text-ink-faint w-14">
              {formatMinutes(p.minutes)}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="p-1 text-ink-faint hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === draft.length - 1}
                aria-label="Move down"
                className="p-1 text-ink-faint hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => remove(i)}
                disabled={draft.length <= 1}
                aria-label="Delete preset"
                className="p-1 text-ink-faint hover:text-red-500 disabled:opacity-30"
              >
                <Trash width={12} height={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 pt-1">
        <input
          placeholder="Label (e.g. 'After lunch')"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          maxLength={24}
          className="flex-1 px-2.5 py-1.5 text-[12.5px] rounded-md border border-border
            bg-surface placeholder:text-ink-faint outline-none focus:focus-ring"
        />
        <input
          type="number"
          placeholder="min"
          value={newMinutes}
          onChange={(e) => setNewMinutes(e.target.value === "" ? "" : Number(e.target.value))}
          min={0.1}
          className="w-24 px-2.5 py-1.5 text-[12.5px] text-right tabular-nums rounded-md
            border border-border bg-surface placeholder:text-ink-faint outline-none focus:focus-ring"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={add}
          disabled={!newLabel.trim() || !newMinutes || draft.length >= 8}
          leadingIcon={<Plus width={12} height={12} />}
        >
          Add
        </Button>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        {status === "saved" ? <Pill tone="success">Saved</Pill> : <span />}
        <button
          className="text-ink-muted hover:text-ink"
          onClick={() => persist(DEFAULT_SNOOZE_PRESETS)}
        >
          Reset to defaults
        </button>
      </div>

      {prefs.data.lastSnoozeMinutes !== undefined ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-muted/40 px-3 py-2 text-[11.5px] text-ink-muted">
          Your last custom snooze was{" "}
          <strong className="text-ink">
            {formatMinutes(prefs.data.lastSnoozeMinutes)}
          </strong>
          . It pre-fills the Custom field on every surface.
          <button
            className="ml-2 text-ink-faint hover:text-ink underline"
            onClick={async () => {
              // structured-clone preserves `undefined` over chrome.runtime,
              // and PreferencesRepo.update spreads the patch — so this
              // clears the saved value cleanly.
              await send({
                type: "prefs:update",
                patch: { lastSnoozeMinutes: undefined },
              });
              prefs.refresh();
            }}
          >
            forget it
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NotificationsToggle() {
  const prefs = useAsync(() => send({ type: "prefs:get" }), []);
  if (!prefs.data) return null;
  return (
    <label className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] text-ink font-medium">Reminder notifications</div>
        <p className="text-[11px] text-ink-faint mt-0.5">
          Required permission. When off, reminders still log but won't notify.
        </p>
      </div>
      <input
        type="checkbox"
        checked={prefs.data.notificationsEnabled}
        onChange={async (e) => {
          await send({ type: "prefs:update", patch: { notificationsEnabled: e.target.checked } });
          prefs.refresh();
        }}
        className="w-4 h-4 accent-accent"
      />
    </label>
  );
}

function ReadModeToggle() {
  const prefs = useAsync(() => send({ type: "prefs:get" }), []);
  if (!prefs.data) return null;
  return (
    <label className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] text-ink font-medium">Open notes in read mode</div>
        <p className="text-[11px] text-ink-faint mt-0.5">
          When on, revisiting a tab shows its note as formatted Markdown by
          default. Switch back to edit mode any time from the inline toggle.
        </p>
      </div>
      <input
        type="checkbox"
        checked={prefs.data.noteReadModeDefault}
        onChange={async (e) => {
          await send({
            type: "prefs:update",
            patch: { noteReadModeDefault: e.target.checked },
          });
          prefs.refresh();
        }}
        className="w-4 h-4 accent-accent"
      />
    </label>
  );
}

function DataControls() {
  const [status, setStatus] = useState<string | null>(null);

  const onExport = async () => {
    const payload = await send({ type: "data:export" });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabsmith-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported");
    setTimeout(() => setStatus(null), 1500);
  };

  const onImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        const result = await send({ type: "data:import", payload: json });
        setStatus(`Imported ${result.imported} record${result.imported === 1 ? "" : "s"}`);
      } catch (err) {
        setStatus(`Import failed: ${(err as Error).message}`);
      }
      setTimeout(() => setStatus(null), 2500);
    };
    input.click();
  };

  const onClear = async () => {
    const ok = window.confirm("Clear all Tabsmith data? Notes, reminders, and preferences will be erased. This cannot be undone.");
    if (!ok) return;
    await send({ type: "data:clearAll" });
    setStatus("Cleared");
    setTimeout(() => setStatus(null), 1500);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onExport}>Export JSON</Button>
        <Button variant="secondary" size="sm" onClick={onImport}>Import JSON</Button>
        <Button variant="danger" size="sm" onClick={onClear}>Clear all data</Button>
      </div>
      {status ? <Pill tone="success">{status}</Pill> : null}
    </div>
  );
}
