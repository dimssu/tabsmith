# Tabsmith

> Smart, private tab grouping, reminders, and contextual notes — fully on-device.

Tabsmith is a Manifest V3 Chrome extension that brings order to a noisy tab
strip. It quietly clusters related tabs, suggests where new ones belong, holds
time-based reminders that fire even after you've closed a tab, and keeps a
short note per URL so the context you built up doesn't evaporate the next time
you come back.

**Suggestions are suggestions.** Nothing is ever auto-applied without an
explicit click. The extension never sends your tabs, notes, or reminders
anywhere — see the [Privacy](#privacy) section.

---

## Features

- **Smart group suggestions** — domain bucketing plus a token-similarity merge
  pass surfaces "5 tabs from github.com — group them?" without thrashing your
  workflow.
- **Add-to-existing-group hints** — open a new tab and Tabsmith scores it
  against your live tab groups. If it's a confident match, you get a one-click
  prompt in the side panel.
- **Tab reminders** — pick `1h` / `3h` / Tomorrow / Next week. The reminder
  fires even if you closed the tab; on click, Tabsmith reopens it.
- **Per-URL notes** — short Markdown-friendly notes keyed by a normalized URL
  (utm params, www, trailing slash all stripped). Pinning keeps a note at
  the top of the list.
- **Side panel, popup, options** — three surfaces that share one clean,
  keyboard-friendly design system. Light/dark follows the system preference.

## Install (unpacked)

```bash
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and pick the `dist/` folder.
4. Pin Tabsmith from the puzzle-piece icon, then click it to open the side panel.

Requires Chrome 116 or newer (for `chrome.sidePanel`).

## Usage

- **Side panel** — primary surface. Four tabs:
  - **Suggestions** — accept or dismiss group ideas. Dismissed suggestions are
    suppressed for 24 hours so you're not nagged.
  - **Note** — current tab's note + quick reminder presets.
  - **Groups** — every group in the current window with its color and count.
  - **Reminders** — everything you've scheduled, sorted by fire time.
- **Popup** — quick capture: add a note, set a reminder, or ask "what group
  should this go in?" without opening the side panel.
- **Options** — tune confidence thresholds, toggle notifications, export /
  import / clear data.

## Architecture

A short tour of the codebase:

```
src/
  manifest.config.ts      MV3 manifest (consumed by @crxjs/vite-plugin)
  types/                  Zod schemas + TS types (single source of truth)
  storage/                typed repositories over chrome.storage.local
  engine/                 pure scoring + clustering, no chrome.* deps
  messaging/              discriminated-union Message + Response<M>
  background/             service worker entry, handlers, badge, reminders
  sidepanel/  popup/  options/   React surfaces
  components/  hooks/     shared UI primitives and React hooks
```

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for the design rationale, the
suggestion pipeline diagram, and notes on URL normalization. Manual test
recipes live in [TESTING.md](./TESTING.md).

## Privacy

Tabsmith is built so that nothing about your tabs can leak. Concretely:

- **No remote APIs.** All clustering and scoring happens locally in the
  service worker. There is no model server, no analytics endpoint, no
  telemetry.
- **No content scripts on your pages.** The extension only reads the metadata
  Chrome already exposes through the `tabs` and `tabGroups` APIs (URL,
  title, group id, color).
- **No cross-device sync.** Storage is `chrome.storage.local`, not `sync`.
- **One outbound network request, optional.** Website icons are fetched from
  `https://www.google.com/s2/favicons`. They're decorative; you can block
  that domain in your browser without breaking any other functionality.
- **Export / import / clear.** From the Options page you can export all
  state to JSON, re-import it, or wipe everything in one click.

## Development

```bash
npm run dev         # Vite dev mode (HMR for popup/options/side panel)
npm run test        # Vitest, headless
npm run typecheck   # tsc --noEmit
npm run build       # production bundle into dist/
```

The grouping engine (`src/engine/`) is pure — it has no dependency on
`chrome.*` and is fully unit-tested under Vitest. That keeps the suggestion
logic easy to iterate on without juggling browser state.

## Roadmap

Phase 1 (this release) is intentionally small and local. Phase 2 ideas:

- **On-device semantic embeddings.** Drop a small ONNX model behind the same
  `engine/suggest.ts` interface so suggestions handle paraphrase ("rust
  ownership" ↔ "borrow checker") without any network round-trip.
- **Cross-window grouping.** Today suggestions stay within a window — extend
  the rank step to consider groups across windows.
- **Snooze-style reminders.** Built-in "snooze 1 hour" on the notification.
- **Keyboard-only flow.** Command palette in the side panel for power users.

## License

MIT — see [LICENSE](./LICENSE).
