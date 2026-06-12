# Quarto Privacy Policy

Last updated: June 5, 2026

Quarto is a Chrome extension that groups tabs, stores per-URL notes, and
schedules reminders. It is built so that information about your browsing stays
on your device.

## What Quarto stores

All of the following is stored locally using `chrome.storage.local` and never
leaves your computer:

- Notes you write, keyed by a normalized URL.
- Reminders you schedule, including the target URL and fire time.
- Your settings, such as confidence thresholds and notification preferences.

Quarto does not use `chrome.storage.sync`, so this data is not synced across
devices.

## What Quarto reads

To suggest groups and attach notes, Quarto reads tab metadata that Chrome
already exposes through the standard `tabs` and `tabGroups` APIs: tab URLs,
titles, group membership, and group color. Quarto does not inject content
scripts into web pages and does not read the contents of any page you visit.

## What Quarto sends

Quarto has no backend, no analytics, and no telemetry. It makes no requests
to any server operated by the developer.

The only outbound network request is to Google's public favicon service
(`https://www.google.com/s2/favicons`) to display the small icon next to a site.
This request includes the site's domain so the correct icon can be returned. It
is purely decorative; if you block that domain in your browser, every other
feature of Quarto continues to work. No notes, reminders, or browsing history
are included in this request.

## Data sharing and sale

Quarto does not collect, transmit, sell, or share your data with the developer
or any third party. There is no account, no login, and no tracking.

## Your control

From the Options page you can export all your Quarto data to JSON, re-import
it, or permanently delete everything with one click. Removing the extension also
removes all locally stored data.

## Contact

Questions about this policy can be directed to: aryansi1126@gmail.com

## Changes

If this policy changes, the "Last updated" date above will be revised.
