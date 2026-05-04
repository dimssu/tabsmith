# Tabsmith — Manual test plan

The grouping engine is covered by Vitest (`npm run test`). The plan below is
the manual sweep to run before each release. Allow ~15 minutes end-to-end.

## Setup

1. `npm run build`
2. Load `dist/` as an unpacked extension at `chrome://extensions`.
3. Open the Tabsmith side panel from the action icon.
4. (Optional) Open the options page and set `Idle re-analyze interval` to 30s
   so you don't have to wait long for periodic analysis to fire.

## Suggestions

### Stress test — 50 tabs across mixed domains

1. Open ~50 tabs across at least 5 domains (e.g. github.com x10, news
   aggregator x10, stackoverflow.com x10, MDN x10, mixed x10).
2. Open the side panel; click **Analyze** in the header.
3. **Expected:** within ~10s, you see at least one **New group** suggestion
   per domain that crosses the `minClusterSize` threshold. The badge on the
   action icon shows the pending count.

### Add-to-group on a 21st tab

1. Accept one of the suggestions to create a real group (e.g. "Github").
2. Open a fresh github.com URL (a 21st tab).
3. **Expected:** within ~2s an **Add to group** suggestion appears. Click
   **Add to group** — the tab joins the group with no further prompts.

### Dismiss persistence

1. Dismiss any suggestion.
2. Click **Analyze** again.
3. **Expected:** the same suggestion does **not** reappear for 24h. Restarting
   the browser does not reset this — dismissal is persisted in
   `chrome.storage.local`.

## Reminders

### Fire while tab is open

1. From the popup, choose **Remind me later → 1h** (then go change the
   reminder to fire ~30s later by editing `src/sidepanel/ReminderQuickSet.tsx`
   for testing, or wait).
2. Verify reminder shows in the side panel **Reminders** tab.
3. **Expected:** at fire time, a system notification appears with the tab
   title. Clicking it focuses the source tab.

### Fire after tab is closed

1. Set a 1-minute reminder on a tab.
2. Close the tab.
3. **Expected:** at fire time, Tabsmith opens a new tab on the same URL and
   shows the notification.

### Survive browser restart

1. Set a reminder for a few minutes from now.
2. Quit and relaunch Chrome before it fires.
3. **Expected:** the reminder still fires at the right time. (Backed by
   `chrome.alarms`, which persists across restarts.)

## Notes

### Note persistence across URL variants

1. Open `https://example.com/foo?utm_source=email&id=42`.
2. From the side panel, write a note ("hello").
3. Open `https://www.example.com/foo?id=42` in a new tab.
4. **Expected:** the note from step 2 is shown — URL normalization collapses
   the `www`, drops `utm_*`, and ignores order of the kept query params.

### Autosave

1. Type into the note textarea.
2. **Expected:** within ~350ms of stopping, a **saved** pill appears at the
   bottom right.

### Pin

1. Pin a note (top-right pin button).
2. Reload the side panel.
3. **Expected:** the pin state persists.

## Side panel reactivity

1. With the side panel open, set a reminder from the popup on a different
   tab.
2. **Expected:** the **Reminders** tab in the side panel updates without
   needing a manual refresh (driven by the broadcast channel).

## Options

1. Adjust the **Add-to-existing-group threshold** to 0.95.
2. Open a tab that previously triggered an assign suggestion.
3. **Expected:** no suggestion this time (threshold not met).
4. Reset to defaults; the suggestion comes back on the next tab open.

### Export / Import / Clear

1. Click **Export JSON**, save the file.
2. Click **Clear all data**, confirm.
3. **Expected:** notes, reminders, and prefs are gone; suggestions cleared.
4. Click **Import JSON**, choose the file you just saved.
5. **Expected:** notes and *future* reminders are restored. (Past-due
   reminders are skipped on import.)

## Accessibility

- Tab through the side panel header and TabBar — focus rings should be
  visible (look for the accent-colored ring; defined in `tokens.css`).
- Switch macOS to dark mode — the UI should re-theme without a reload
  (driven by `prefers-color-scheme`).
- Hit Esc in the popup; Chrome closes it cleanly (no trapped focus).

## Build hygiene

- `npm run typecheck` — no errors.
- `npm run test` — 43+ passing tests.
- `npm run build` — main bundle should stay under 100KB gzipped. Spike
  warnings: bundles imports of `@/sidepanel/*` from popup or options will
  inflate it; keep the import graph clean.
