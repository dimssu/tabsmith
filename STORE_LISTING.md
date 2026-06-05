# Chrome Web Store listing — Tabsmith

Copy-paste source for the Developer Dashboard. Fill each field from the matching
section below.

---

## Name
Tabsmith

## Summary (max 132 chars)
Smart, private tab grouping, reminders, and contextual notes. Fully on-device, no telemetry, nothing leaves your machine.

## Category
Productivity / Workflow & Planning

## Language
English (US)

---

## Detailed description

Tabsmith brings order to a noisy tab strip without sending anything about your
browsing anywhere. It clusters related tabs, suggests where new ones belong,
holds time-based reminders that fire even after a tab is closed, and keeps a
short note per URL so the context you built up does not evaporate next time.

Suggestions are suggestions. Nothing is ever auto-applied without an explicit
click.

WHAT IT DOES

- Smart group suggestions. Domain bucketing plus a token-similarity pass
  surfaces ideas like "5 tabs from github.com, group them?" without thrashing
  your workflow.
- Add-to-existing-group hints. Open a new tab and Tabsmith scores it against
  your live groups. A confident match becomes a one-click prompt.
- Tab reminders. Pick 1h, 3h, Tomorrow, or Next week. The reminder fires even
  if you closed the tab, and reopens it on click.
- Per-URL notes. Short Markdown-friendly notes keyed by a normalized URL.
  Pin the ones you want to keep at the top.
- Three surfaces. Side panel, popup, and options share one clean,
  keyboard-friendly design system. Light and dark follow your system setting.

PRIVACY BY DESIGN

- No remote APIs. All clustering and scoring runs locally in the service worker.
  No model server, no analytics, no telemetry.
- No content scripts on your pages. Tabsmith only reads the tab metadata Chrome
  already exposes (URL, title, group id, color).
- No cross-device sync. Storage stays in chrome.storage.local.
- One optional outbound request. Website icons are fetched from Google's public
  favicon service. They are decorative; block that domain and nothing else
  breaks.
- Export, import, or clear all your data from the Options page at any time.

Requires Chrome 116 or newer.

---

## Permission justifications
(Paste each into the matching field on the Privacy tab.)

- tabs / tabGroups: Read tab URLs, titles, and group membership to cluster
  related tabs and suggest groups. This is the core function.
- alarms: Schedule tab reminders so they fire at the chosen time even if the
  browser was idle.
- notifications: Show a reminder when it fires so you can reopen the tab.
- storage: Save notes, reminders, and settings locally on the device.
- sidePanel: Render the primary Tabsmith surface in Chrome's side panel.
- scripting: Reopen the correct tab when a reminder is acted on.
- sessions: Restore the right tab/window context for reminders and groups.
- host permissions (<all_urls>): Required so tab and group reading works on any
  site the user has open. Tabsmith reads only Chrome-exposed metadata; it does
  not inject scripts into or read the content of web pages.

## Single purpose (required field)
Tabsmith organizes a user's open tabs: grouping related tabs, attaching notes
to URLs, and scheduling reminders. Everything runs on the device.

## Data usage disclosures (check on the Privacy tab)
- Does the extension collect or use user data? It does not collect, transmit,
  or sell any user data to the developer or third parties. The only outbound
  request is to Google's public favicon endpoint to display site icons; no
  notes, reminders, or browsing history are sent.
- Not sold to third parties: yes (true).
- Not used for unrelated purposes: yes (true).
- Not used for creditworthiness / lending: yes (true).

---

## Assets checklist
- [ ] Store icon 128x128 PNG
- [ ] Screenshots: 3 to 5 at 1280x800 (or 640x400)
- [ ] Small promo tile 440x280 (optional, recommended)
- [ ] Privacy policy URL (see PRIVACY_POLICY.md, host it publicly)
