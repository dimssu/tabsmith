# Quarto — Design system

A compact reference for the visual language. The Tailwind config wires these
tokens; CSS variables in `src/styles/tokens.css` define the theme.

## Theme

Theme follows the OS by default. Users can override to Light or Dark in Options.

The "physical scene": a knowledge worker glances at the side panel docked
beside a typical web page. The tab strip and most pages are light. Quarto is
quiet enough to live alongside either light or dark contexts without yanking
attention.

## Color strategy: Restrained

Warm-tinted neutrals carry the surface. A single muted **clay** accent does
work for primary action, selection, and brand recognition only. Never
decorative. State colors (success / warning / danger / info) use the same
warm-tinted families.

Color is specified in OKLCH for perceptual consistency, written to CSS as
`R G B` channels so Tailwind's alpha syntax keeps working.

### Light tokens

| Token              | OKLCH                              | Use                                 |
| ------------------ | ---------------------------------- | ----------------------------------- |
| `--surface`        | `oklch(0.985 0.005 60)`            | page / panel background             |
| `--surface-muted`  | `oklch(0.965 0.006 60)`            | sub-panel, card                      |
| `--surface-subtle` | `oklch(0.94 0.008 60)`             | hover, secondary card                |
| `--ink`            | `oklch(0.21 0.012 60)`             | primary text                         |
| `--ink-muted`      | `oklch(0.46 0.012 60)`             | secondary text                       |
| `--ink-faint`      | `oklch(0.62 0.012 60)`             | tertiary, footnotes                  |
| `--accent`         | `oklch(0.56 0.13 38)`              | clay; primary action, focus, selection |
| `--accent-soft`    | `oklch(0.94 0.04 38)`              | accent-tinted pill background        |
| `--border`         | `oklch(0.9 0.008 60)`              | hairline borders                     |
| `--danger`         | `oklch(0.58 0.18 27)`              | error, missed reminders              |
| `--success`        | `oklch(0.62 0.13 150)`             | saved, acknowledged                  |
| `--warning`        | `oklch(0.74 0.14 76)`              | snooze, recurring                    |

### Dark tokens

| Token              | OKLCH                              | Use                                 |
| ------------------ | ---------------------------------- | ----------------------------------- |
| `--surface`        | `oklch(0.18 0.008 60)`             | page / panel background             |
| `--surface-muted`  | `oklch(0.22 0.009 60)`             | sub-panel, card                      |
| `--surface-subtle` | `oklch(0.27 0.01 60)`              | hover, secondary card                |
| `--ink`            | `oklch(0.96 0.005 60)`             | primary text                         |
| `--ink-muted`      | `oklch(0.74 0.008 60)`             | secondary text                       |
| `--ink-faint`      | `oklch(0.55 0.008 60)`             | tertiary, footnotes                  |
| `--accent`         | `oklch(0.72 0.12 40)`              | clay (lighter in dark for legibility) |
| `--accent-soft`    | `oklch(0.31 0.06 38)`              | accent-tinted pill background        |
| `--border`         | `oklch(0.31 0.008 60)`             | hairline borders                     |
| `--danger`         | `oklch(0.72 0.15 27)`              | error, missed reminders              |
| `--success`        | `oklch(0.73 0.12 150)`             | saved, acknowledged                  |
| `--warning`        | `oklch(0.82 0.14 76)`              | snooze, recurring                    |

Never `#000` or `#fff`. Every neutral is warm-tinted (hue ≈ 60).

## Typography

One family: system stack with Inter as the cross-platform target if the user
has it. Tabular numerals on every count.

```
font-family: 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont,
  'Segoe UI', system-ui, sans-serif;
font-feature-settings: 'cv11', 'ss01', 'ss03', 'tnum' 1;
```

### Type scale (fixed rem, ratio 1.18)

| Step | Size (rem)  | px (16-base) | Weight  | Use                                  |
| ---- | ----------- | ------------ | ------- | ------------------------------------ |
| xs   | 0.6875      | 11           | 500/600 | meta, footnotes                      |
| sm   | 0.75        | 12           | 500/600 | secondary labels, pills               |
| base | 0.8125      | 13           | 400/500 | body, card titles                    |
| md   | 0.875       | 14           | 500/600 | tab labels, list titles              |
| lg   | 1           | 16           | 600     | section headings                     |
| xl   | 1.125       | 18           | 600     | options page heading                 |

Line-height: 1.5 for prose, 1.35 for tight UI labels. Letter-spacing: -0.005em
on >14px, default elsewhere.

## Spacing rhythm (4-base)

`4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40`. No 5, no 11, no odd one-offs.

Section vertical rhythm: title row 12, content 16, gap-between-sections 24.

## Layout

- The side panel has a fixed top region (header, tab bar) and a scrollable
  body. Tab bar is sticky under the header.
- Cards are not the default container. Many sections render flat — title row,
  divider, list — without a card wrap. Nested cards never.
- Density: side panel runs compact (12–14px body); options page can breathe
  (14–16px). Same family, different rhythm.

## Components

Every interactive component has: default, hover, focus-visible, active,
disabled, loading, error. Focus uses `outline: 2px solid var(--accent) /
outline-offset: 2px` so it survives any background.

### Buttons
- Primary: accent fill, white text, 8px radius, 32px tall, 13px label.
- Secondary: surface-muted, ink text, hairline border.
- Ghost: transparent, ink-muted text.
- Danger: ink-on-surface label, `--danger` foreground.

### Pills
- 10px label, 1.5px vertical padding, 9999px radius. Tinted backgrounds, never
  outlined. One per row, used sparingly.

### Lists
- Hairline dividers between rows. No card wrap unless the list is logically
  bounded (e.g. the Missed Reminders callout).

## Iconography

- 24×24 viewBox, 1.75 stroke, rounded line caps, rounded joins. One style
  everywhere.
- Sized via SVG width/height (default 14px in tight UI, 16px in headers, 20px
  in feature rows). Don't scale via CSS — pixel-snap stroke at the source.

## Logo / mark

The mark is a stacked-tabs glyph: two slightly offset rounded-rect "tabs"
forming a T shape, with a hairline base bar suggesting a work surface. Drawn
on a 32×32 grid, 1.5px effective stroke at 32px.

Wordmark: "Quarto" in the base sans, weight 600, tracking -0.012em. The dot
on the "i" is replaced with the clay accent disc at small sizes.

Both available as a single React component (`<Logo />`) with `size` and
`variant` props (`mark` | `wordmark` | `lockup`).

## Motion

- All transitions 160–220ms `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-out-quart).
- Allowed properties: `opacity`, `transform`, `background-color`, `color`,
  `border-color`. Never `width`, `height`, `padding`, `margin`, `top`, `left`.
- Reduced motion: every animation is skipped (no fade, no slide). Honor the
  user's preference.

## Things we don't do

- Side-stripe colored borders on cards or alerts.
- Gradient text or gradient buttons.
- Glassmorphism / decorative backdrop blur.
- Hero-metric template (big number + small label + accent).
- Identical card grids.
- Modals as first thought (no modals at all in Quarto Phase 1).
- Display fonts in UI.
- Decorative motion.
