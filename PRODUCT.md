# Quarto — Product context

**register: product**

## What it is

A Manifest V3 Chrome extension that organizes a noisy tab strip into labeled
groups, holds time-based reminders, and attaches per-URL notes. Phase 1 runs
entirely on the user's machine. The user is always in a task — searching for a
tab, capturing a thought, picking a snooze, deciding whether to accept a
suggested group. The design serves the task.

## Users

- Knowledge workers and developers who routinely run 20–60 tabs and feel the
  cognitive cost.
- People who care that a "smart" tool runs locally and doesn't phone home.
- Users fluent in best-in-class tools (Linear, Raycast, Things, Arc). They
  notice when affordances are subtly off.

The user is sitting at a 13–16" laptop in normal office or home light, juggling
work across many tabs. They glance at Quarto. They expect it to read fast and
behave predictably. Theme follows system by default — the tab strip is usually
light, jarring switches feel wrong.

## Brand

**Quarto** = the bookmaking format: one sheet folded into four leaves. Loose
pages, bound into something you can hold. A considered tool for the noise of
modern browsing. Hand-finished, deliberate, quiet. Not productivity-SaaS.

- Voice: dry, precise, occasionally warm. Never breathless, never cute, never
  emoji-laden.
- Feel: editorial restraint. Warm paper, warm graphite, a single muted accent
  that doesn't shout. Visible craft in the details (typography, spacing
  rhythm, tabular numerals on counts) without ornament.
- Privacy is structural, not a slogan. Reinforced quietly via small "100%
  on-device" stamps and explicit Privacy copy in Options.

## Tone

- "Why did I open this? Where did I stop?" — the questions a Quarto note
  should answer for you.
- "Suggestions are suggestions." — never auto-applies.
- "0 reminders waiting for you" / "1 reminder waiting for you" — say things the
  way a careful person would.

No em dashes anywhere in UI copy.

## Anti-references

These are the reflexes Quarto deliberately avoids:

- **Generic productivity SaaS** (purple/indigo accent, rounded squircle logo,
  motivational empty states). The single most common look-and-feel for tab
  managers; we won't ship that.
- **AI-flavored "smart" framing** (sparkles, gradient headers, breathless
  microcopy). Quarto does small local heuristics, not magic. The UI should
  not pretend otherwise.
- **Eco / green-leaf privacy framing** (the second-order reflex once you avoid
  purple). Privacy here is communicated by quiet structural decisions, not by
  a leaf icon.
- **Crypto / dev-terminal aesthetic** (mono everywhere, neon-on-black). The
  user is a designer or PM, not just a developer.

## Strategic principles

1. **Earned familiarity beats novelty.** Standard tab/popup/options patterns;
   the polish is in spacing, type, micro-state.
2. **Passive surface, explicit user action.** Suggestions never auto-apply.
   Snoozes show the resolved fire time. Acknowledge flows are visible.
3. **State is honest.** Every surface reflects current reality without delay.
   Badge counts include unacknowledged reminders. Footer shows the windowId.
4. **Privacy is structural.** No remote APIs. Storage is local. The only
   network call (favicon lookups) is documented.
5. **Type and rhythm carry the brand.** No mascots, no illustrations, minimal
   ornament. One family, deliberate scale.
