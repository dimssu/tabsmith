# Tabsmith — Architecture

Tabsmith is a Manifest V3 Chrome extension that organizes a noisy tab strip into
labeled groups, holds time-based reminders, and attaches per-URL notes. Phase 1
runs entirely on the user's machine: no remote APIs, no telemetry, no
cross-device sync.

## Surfaces

| Surface       | Path                       | Purpose                                                            |
| ------------- | -------------------------- | ------------------------------------------------------------------ |
| Side panel    | `src/sidepanel`            | Primary UI: live suggestions, current-tab note, reminder controls. |
| Popup         | `src/popup`                | Compact quick-actions: add note, set reminder, group lookup.       |
| Options page  | `src/options`              | Preferences, thresholds, data export/import, clear-all.            |
| Background SW | `src/background/index.ts`  | Tab/group lifecycle, alarms, suggestion pipeline.                  |

## Module map

```
src/
  manifest.config.ts      manifest v3 declaration consumed by @crxjs
  types/                  shared TS types and Zod schemas
  storage/                typed repositories over chrome.storage.local
  engine/                 pure grouping engine (tokenize/score/cluster)
  messaging/              typed runtime message contracts
  background/             service worker entry + handlers
  sidepanel/, popup/, options/   React surfaces
  components/, hooks/     shared UI primitives and react hooks
  styles/tokens.css       Tailwind layer + design tokens
```

The `engine/` module is **pure** — it imports nothing from `chrome.*` so it can
run under Vitest without a browser stub. The background worker and UI bind it to
real Chrome APIs.

## Data model

All persistent state lives in `chrome.storage.local`, partitioned by repository:

- `notes:<normalized-url>` → `Note` — Markdown body + timestamps.
- `reminders:<id>` → `Reminder` — fire time, target URL, optional title hint.
- `groupMeta:<group-id>` → `GroupMeta` — domain seed, token signature, color.
- `suggestionHistory` → ring buffer of `Suggestion` records to dampen repeats.
- `prefs` → `Preferences` — thresholds and toggles.

Schemas are defined with Zod (`src/types/schemas.ts`) and validated at the
storage boundary, so a corrupt or older payload is dropped instead of crashing
the worker.

## Suggestion pipeline

1. `tabs.onCreated` / `tabs.onUpdated` debounce-fires `analyzeNewTab(tab)`.
2. The engine extracts a `TabSignature` (eTLD+1 domain, normalized path
   segments, tokenized title minus stopwords).
3. Existing groups carry an aggregated signature in `GroupMeta`. The engine
   scores domain match (0.5), path-segment Jaccard (0.2), title-token Jaccard
   (0.3) and returns ranked candidates.
4. If the top score exceeds the configured `assignThreshold` (default 0.55), the
   background worker writes a passive `Suggestion` to storage and pings the
   side panel via runtime messaging. **Nothing is auto-applied.**
5. A separate idle pass (`chrome.idle` / debounced timer) every 30s feeds the
   full window into a DBSCAN-lite clusterer to propose *new* groups, again as
   passive suggestions.

## Reminders

`createReminder` writes a `Reminder` record and registers a `chrome.alarms`
alarm with the same id. On fire, the worker:

1. Looks up the reminder, finds matching live tabs by normalized URL.
2. If a tab exists, focuses it and surfaces a notification linking to the note.
3. Otherwise opens the URL in a new tab and notifies the user.

Because the service worker can be terminated at any time, reminder state is
read fresh from storage on every alarm event — there is no in-memory queue.

## Messaging

`messaging/contracts.ts` defines a discriminated-union `Message` type plus a
`request<T>(...)` helper. Everything goes through one switch in the background
worker; surfaces never poke `chrome.tabs` directly except for read-only metadata
queries.

## URL normalization

Notes are keyed by URL. To avoid duplicates from tracking parameters and
trailing-slash drift, `engine/url.ts` normalizes URLs by:

- lowercasing scheme + host
- stripping `www.`
- removing common tracking params (`utm_*`, `gclid`, `fbclid`, `_hsenc`, etc.)
- removing the fragment unless the host is on a known SPA-fragment allowlist
- collapsing duplicate slashes and trimming a trailing `/`

## Why the engine is testable

`engine/*` accepts plain `TabLike` records (`{ id, url, title }`) and returns
plain results. The Vitest suite (`src/engine/*.test.ts`) covers:

- token/path normalization edge cases
- Jaccard math and weighted scoring
- DBSCAN-lite cluster membership on synthetic tab sets
- the existing-group ranker with degenerate inputs (no tabs, single tab, etc.)

## Build

`@crxjs/vite-plugin` reads `src/manifest.config.ts`, rewrites HTML/JS entry
paths during `vite build`, and emits an unpacked extension into `dist/`. Load
that folder via `chrome://extensions` → **Load unpacked**.
