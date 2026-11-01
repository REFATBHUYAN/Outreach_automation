# Design system

The rules this console is built from. If a value is not here, it does not belong
in a `className`.

## Why this exists

Before it did, the app had **94 arbitrary font sizes** (`text-[10px]` ×64,
`text-[11px]` ×27, `text-[9px]` ×2, `text-[13px]` ×1) — 14% of all type was off
any scale. One label role had **five spellings**. Page headings had **four**. The
base `h1` rule set `font-weight: 700` and every single `<h1>` overrode it with
`font-semibold`, so the rule did nothing.

None of that is a taste problem. It is what happens when a scale has holes:
people reach for an arbitrary value because the right one does not exist.

## Type

One ladder. Every size below is a real step with a real job. There is nothing
between them, deliberately — 10px and 11px one pixel apart was not a scale, it
was noise, and it collapsed into one step.

| Class       | Size | Line | Role                                                                |
| ----------- | ---- | ---- | ------------------------------------------------------------------- |
| `text-2xs`  | 11px | 16px | Eyebrows, badges, dense table meta. The floor.                      |
| `text-xs`   | 12px | 18px | Secondary body, captions, help text.                                |
| `text-sm`   | 13px | 20px | **Default body.** Set on `<body>`; most text needs no class at all. |
| `text-base` | 14px | 22px | Emphasised body, form inputs.                                       |
| `text-lg`   | 16px | 24px | Section and card titles (`<SectionTitle>`).                         |
| `text-xl`   | 22px | 28px | Page title, one per route (`<PageTitle>`).                          |
| `text-2xl`  | 28px | 32px | Hero numerals — KPI values, big counters.                           |
| `text-3xl`  | 36px | 40px | Reserved. Nothing uses it yet.                                      |

Nothing smaller than `text-2xs`. 10px at weight 400 on a near-black surface is
below comfortable reading, and this console is used all day.

### Weight

Three, and each means one thing:

- `font-normal` (400) — body. The default; do not write it.
- `font-medium` (500) — the one value in a row that matters.
- `font-bold` (700) — titles and eyebrows.

`font-semibold` and `font-black` are not part of the system. Weight carries
hierarchy in dense data the way size cannot, which is why this differs from a
marketing surface that can hold everything at 400.

### Tracking

- `tracking-display` (−0.022em) — applied automatically to `h1`–`h6`. Gathers
  display type so it reads as one shape rather than spaced letters.
- `tracking-eyebrow` (0.12em) — the only tracking value for UPPERCASE labels.
  Positive tracking is what makes a mono caps label read as a label.

### Faces

- **Public Sans** — everything.
- **Montserrat** (`font-heading`) — `h1`–`h6` only, applied by the base rule.
- **Geist Mono** (`font-mono`) — identifiers, figures, and eyebrows. Anything
  you would copy and paste, plus anything you would compare down a column.

## Components before classes

These exist so a role has one spelling. Reach for them first.

| Component        | Replaces                                                                     |
| ---------------- | ---------------------------------------------------------------------------- |
| `<PageTitle>`    | `<h1 className="font-heading text-xl font-semibold">` and its three variants |
| `<SectionTitle>` | ad-hoc `<h2>` styling                                                        |
| `<Eyebrow>`      | `text-2xs font-bold uppercase tracking-*` in five spellings                  |
| `eyebrowClass`   | the same style where the element must not be a `<p>` — a `<dt>`, `<th>`, `<span>` |
| `<PageHeader>`   | the title + description + actions row every route hand-rolls                 |
| `<EmptyState>`   | five different phrasings of "nothing here"                                   |
| `<DataTable>`    | five bare `rows.map()` tables                                                |

## Colour

Semantic tokens only. Never a raw hex, never `text-green-500`.

`background` · `foreground` · `card` · `popover` · `muted` · `muted-foreground` ·
`border` · `input` · `ring` · `primary` · `secondary` · `accent` · `destructive` ·
`success` · `warning` · `chart-1..5` · `chart-grid` · `chart-axis`

Each is defined for both themes in `globals.css`. A hardcoded colour is a bug in
one of the two — which is exactly how the usage charts ended up invisible in
light mode.

The brand palette (`brand-blue`, `brand-purple`, `brand-orange`, `brand-magenta`,
`brand-teal`) is for identity moments and chart series, not for state. State is
`success` / `warning` / `destructive`.

## Shape

| Token          | Use                                         |
| -------------- | ------------------------------------------- |
| `rounded-md`   | Inputs, menu items, small controls.         |
| `rounded-lg`   | Panels, alerts, nested surfaces.            |
| `rounded-xl`   | Cards and tables — the outermost container. |
| `rounded-full` | Avatars, dots, pills, icon buttons.         |

Elevation is a hairline `border-border`, not a shadow. Shadows belong to two
things only:

- Surfaces that float above the page — dialog, popover, toast, sheet.
- Controls with a physically raised part — a switch thumb, an active segmented
  tab. `shadow-sm`, nothing heavier.

A card, a panel, a table or an alert never has one.

## Spacing

4px base. Use the scale (`gap-1` … `gap-8`, `p-*`, `px-*`).

- `gap-5` between sections of a page.
- `gap-4` between cards in a grid.
- `p-4` / `p-5` card interiors.
- `gap-1.5` / `gap-2` inside a control.

## Motion

- `duration-100` — hover, focus, colour.
- `duration-150` — dropdown, tooltip, toast.
- `duration-200` — dialog, sheet, drawer.

These are Tailwind's own steps, deliberately. An earlier draft of this document
specified 120 / 180 / 240ms, which are not utilities — every use would have had
to be written `duration-[120ms]`, which is the exact escape-hatch habit the type
section exists to remove. A scale you have to escape from is not a scale.

`prefers-reduced-motion` is honoured globally in `globals.css`. Anything
animating forever must be inside that guard.

## What we took from the xAI reference, and what we did not

**Took:** one spelling per role. A documented ladder with no holes. Mono
uppercase eyebrows with positive tracking. Negative tracking on display sizes.
Hairline borders instead of shadows. Restraint in the number of weights.

**Did not:** dark-only (a light theme already exists and a bank's console is used
in daylight); pill-everything (row actions in a data table cannot all be pills);
96px display type (there is no marketing surface here); weight 400 for everything
(dense tabular data needs weight contrast to scan, which a hero headline does
not).

The reference is a research lab's marketing site. This is a console people work
in for eight hours. The discipline transfers; the dimensions do not.

## Named utilities

There are **zero** arbitrary values in the codebase. Everything that has a step on
the scale uses it; everything that cannot — a viewport proportion, a runtime
`calc()`, a grid template — has a name instead, defined in `globals.css`.

An anonymous `max-h-[90vh]` is a magic number four files disagree about. A named
`max-h-dialog` is a decision made once.

### Overlay and dialog

| Utility | Value | Use |
|---|---|---|
| `max-h-dialog` | `90vh` | Any scrolling dialog body. |
| `max-w-dialog` | `calc(100% - 2rem)` | Dialog width on small screens. |
| `top-overlay` | `12vh` | Command palette offset from the top. |
| `max-h-overlay` | `70vh` | Command palette total height. |
| `max-h-overlay-list` | `52vh` | Its scrolling result list. |

### Toast stack

| Utility | Use |
|---|---|
| `w-toast` | `min(24rem, 100vw - 2rem)` — never wider than the screen. |
| `z-toast-stack` | Stacking order derived from `--toast-index`. |
| `translate-toast-stack` | Offset of each card behind the front one. |
| `scale-toast-stack` | The 4%-per-card shrink that makes the stack read as depth. |

### Anchored popovers

| Utility | Use |
|---|---|
| `min-w-anchor` | Match the trigger's width exactly. |
| `w-anchor-inset` | Trigger width less an 8px gutter each side. |

### Layout templates

| Utility | Columns / rows |
|---|---|
| `grid-main-aside` | `1fr minmax(0, 18rem)` — content with a right rail. |
| `grid-aside-main` | `minmax(0, 18rem) 1fr` — master/detail. |
| `grid-rail-main` | `minmax(0, 14rem) 1fr` — narrow rail. |
| `grid-cost-row` | `1fr 120px 1fr` — the metering cost row. |
| `grid-icon-content` | `auto 1fr` — an icon beside text. |
| `grid-content-action` | `1fr auto` — text with a trailing action. |
| `grid-stack-fill` | `auto 1fr` |
| `grid-stack-pair` | `auto auto` |
| `grid-stack-pair-fill` | `auto auto 1fr` |

### Other

| Utility | Use |
|---|---|
| `h-tab` | `calc(100% - 1px)` — a tab inset by its own border. |
| `transition-width` | Width is not in Tailwind's transition sets; the collapsing rail needs it. |

## A note on what was found doing this

`components/ui/button.tsx` carried `rounded-[min(var(--radius-md),10px)]` and
`rounded-[min(var(--radius-md),12px)]` in four places. `--radius-md` is
`0.625rem × 0.8 = 8px`, so both expressions always evaluated to exactly 8px —
`rounded-md`. The clamp had never clamped anything. It survived two passes of
this audit by being assumed to be load-bearing upstream code. Checking the
arithmetic took one line.
