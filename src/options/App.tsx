import { useState } from "react";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { Sparkles } from "@/components/Icon";
import type { Preferences, ThemeMode } from "@/types";

export function App() {
  useTheme();
  const prefs = useAsync(() => send({ type: "prefs:get" }), []);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <header className="flex items-center gap-2.5">
          <Sparkles width={18} height={18} className="text-accent" />
          <h1 className="text-[18px] font-semibold tracking-tight">Tabsmith — Options</h1>
          <Pill tone="neutral" className="ml-auto">100% on-device</Pill>
        </header>

        {prefs.loading || !prefs.data ? (
          <p className="text-[13px] text-ink-faint">Loading…</p>
        ) : (
          <PreferencesForm initial={prefs.data} onSaved={prefs.refresh} />
        )}

        <Section title="Appearance">
          <ThemePicker />
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

        <footer className="text-[11px] text-ink-faint pt-2">
          v0.1.0 · MIT licensed
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink-faint font-semibold">
        {title}
      </h2>
      <div className="rounded-xl border border-border bg-surface-muted/40 p-5">{children}</div>
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
