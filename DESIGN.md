---
name: Committee review workspace
description: The workspace has a proposal list and reading column. One accent identifies actions and selection. Status colours identify finding states.
colors:
  ground: "#f3f5f8"
  surface: "#ffffff"
  rail: "#eef1f5"
  rail-hover: "#e4e9ee"
  ink: "#232b31"
  muted: "#5b6770"
  faint: "#8a95a0"
  line: "#d6dde4"
  line-strong: "#b3bfc9"
  accent: "#1769aa"
  accent-ink: "#0f4d80"
  accent-wash: "#e6f0f8"
  accent-line: "#9cc0dd"
  amber: "#8a5400"
  amber-wash: "#fdedc4"
  amber-line: "#e0b04a"
  red: "#a93636"
  red-wash: "#fbecec"
  red-line: "#e0a3a3"
  slate: "#6b7780"
  slate-wash: "#eceff2"
  violet: "#4e3f80"
  violet-wash: "#f1eef8"
  violet-line: "#b6abd6"
  tooltip-bg: "#26313a"
  line-hover: "#92a1ad"
  accent-wash-strong: "#d8e6f2"
  selection: "#cfe1f1"
  red-wash-strong: "#f3dada"
  hue-1: "#1a5fa8"
  hue-1-wash: "#e1edfb"
  hue-2: "#0d6f82"
  hue-2-wash: "#dbf2f6"
  hue-3: "#237336"
  hue-3-wash: "#e0f3e4"
  hue-4: "#5f6d0c"
  hue-4-wash: "#eff4d3"
  hue-5: "#955700"
  hue-5-wash: "#fdefd3"
  hue-6: "#ad3558"
  hue-6-wash: "#fbe5ec"
  hue-7: "#6739ad"
  hue-7-wash: "#ede6fb"
  hue-8: "#374aaf"
  hue-8-wash: "#e6e8fb"
  fmt-lightning: "#a4480a"
  fmt-lightning-wash: "#fdeadb"
typography:
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.018em"
  compare-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  section-heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  abstract:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.06em"
rounded:
  xs: "3px"
  sm: "4px"
  md: "5px"
  lg: "6px"
  xl: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  section: "30px"
  column: "28px 48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "5px 10px"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink}"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "5px 10px"
  button-quiet-hover:
    backgroundColor: "{colors.accent-wash}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "4px 6px"
  button-ghost-hover:
    backgroundColor: "{colors.accent-wash}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  input-search:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "6px 40px 6px 32px"
  chip-topic:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  chip-topic-active:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
  badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.xs}"
    padding: "3px 6px"
  badge-verified:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
  badge-concern:
    backgroundColor: "{colors.red}"
    textColor: "#ffffff"
  badge-proposed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.amber}"
  badge-contested:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.amber}"
  badge-legacy:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate}"
  badge-measured:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  badge-detector:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.violet}"
  badge-dismissed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate}"
  docket-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "10px 14px 11px 20px"
  docket-row-hover:
    backgroundColor: "{colors.rail-hover}"
  docket-row-current:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-ink}"
  source-card:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
  tooltip:
    backgroundColor: "{colors.tooltip-bg}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "8px 11px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "34px 44px 38px"
  top-bar:
    backgroundColor: "{colors.surface}"
    height: "48px"
    padding: "0 20px"
---

> This historical brief records earlier design values. The user guide and `web/style.css` describe current behaviour and tokens.


# Committee workspace design

This brief records the design implemented in `web/style.css`, `web/index.html` and `web/app.js` when it replaced the provisional note. Contrast adjustments gave muted text a measured 5.8:1 ratio on white. The proposal list received a cooler background.

The frontmatter and prose contain different historical values, including seven-size and six-size type scales. Use current CSS for implementation.

## Overview

The workspace places a dense proposal list on the left and a reading column on the right. A cool background surrounds the reading column's white submission panel. A 1px border encloses its title, speakers, topics and abstract. The original design used a 30px title and 18px submission text.

Findings appear below the submission. Each has a state icon, bold label, state badge and a reason in 15px type. A smaller line shows evidence, actions and origin. Expanded evidence shows one record sentence and compact source rows. A person decides which findings to accept.

Blue identifies selection, primary actions and focus. Proposed and contested findings use amber. Verified major findings use subdued red. Legacy and dismissed findings use slate. Detector signals use violet in their own section. The interface has no green overall approval state. Format and topic colours follow the categorical rules below.

Use system sans-serif type with fixed rem sizes and tabular numerals. Separate regions with background colours and 1px rules. Reserve shadows for tooltips and dialogs.

The original design uses these properties:

- Backgrounds use an off-white page, cooler proposal list and white reading panel, separated by 1px rules.
- Actions and selection share one accent. Finding states use their own colours.
- Formats use fixed colours: session blue, workshop green, keynote violet, lightning orange and panel teal.
- Topic names select stable colours from eight hashed background/text pairs. Lists, submission panels and related proposals use the same mapping.
- The original seven-size scale uses 13, 14, 15, 18, 20, 24 and 30px values expressed in rem.
- Compact badges have 1px borders. Only verified badges have filled backgrounds.
- Each finding state has a drawn 16px SVG icon.
- Short animations leave input available. Reduced motion sets durations to zero.

## Colors

The palette combines cool neutrals, one blue action accent and four finding-state colours.

### Primary
| Tokens | Use |
| --- | --- |
| `accent` #1769aa | Links, primary fill, active topic chips, focus rings, caret, checkbox accent and the scope-box topic icon use blue. |
| `accent-ink` #0f4d80 | Quiet and ghost button text, selected proposal titles, related titles and primary hover fills use dark blue. |
| `accent-wash` #e6f0f8, `accent-line` #9cc0dd | Topic chips use these backgrounds and borders. Quiet and ghost buttons use the background on hover. |

### Secondary (status hues)
| Tokens | Use |
| --- | --- |
| `amber` #835900, `amber-wash` #fdf3d7, `amber-line` #dcbd67 | Proposed and contested findings, dotted quotation underlines and evidence warnings use amber. It identifies findings awaiting verification. |
| `red` #a93636, `red-wash` #fbecec, `red-line` #e0a3a3 | Verified major findings use filled red badges and list marks, with solid quotation underlines. Error banners and form errors also use red. |
| `slate` #6b7780, `slate-wash` #eceff2 | Legacy and unverified findings use dashed borders. Dismissed findings use muted text and strikethrough. |
| `violet` #4e3f80, `violet-wash` #f1eef8, `violet-line` #b6abd6 | Detector signals use violet in a separate **Detector signal** subsection. Editorial states exclude this colour. |

### Neutral
| Tokens | Use |
| --- | --- |
| `ground` #f3f5f8 | The page, compare column and source cards use this background. |
| `rail` #eef1f5, `rail-hover` #e4e9ee | The proposal list and search use `rail`. Hovered rows use `rail-hover`. |
| `surface` #ffffff | The top bar, reading column, selected row, inputs and badges use white. |
| `ink` #232b31 | Body text, verified badge fills and verified icons use this colour. |
| `muted` #5b6770 | Secondary text, headings, placeholders and default badge text use this colour. Its measured contrast on white is 5.8:1. |
| `faint` #8a95a0 | Separators such as “·” and the search icon use this colour. Words must use another token. |
| `line` #d6dde4, `line-strong` #b3bfc9 | Rules and borders use `line`. Inputs, badges and `kbd` use the stronger token. |
| `tooltip-bg` #26313a | Tooltips use the only dark background. |

### Apply colours by meaning

Use amber, red, slate and violet on finding badges, list marks, state icons, quotation underlines and their direct errors or warnings. Keep those colours out of layout backgrounds, headings and decoration.

Fill badges and list marks only for verified findings. Use ink for verified findings and red for verified major findings. Give every other state an outline or text-only badge.

The design has no success colour. Describe missing evidence and empty lists with neutral text. An empty finding list gives no assessment of proposal quality.

## Typography

Use the system sans stack everywhere: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. The design has no separate display or monospace face. `kbd` uses the same sans at 13px.

Enable tabular numerals throughout so counts and dates align. Headings use `text-wrap: balance`. Abstracts and row titles use `text-wrap: pretty`.

### Hierarchy
This section records six fixed rem tokens: `--fs-13` 0.8125rem, `--fs-14` 0.875rem, `--fs-15` 0.9375rem, `--fs-17` 1.0625rem, `--fs-20` 1.25rem and `--fs-24` 1.5rem. Keep `clamp()` out of type sizing.

| Role | Values and use |
| --- | --- |
| Title | Selected titles and unlock headings use weight 650, 24px, line height 1.22 and spacing -0.012em. Below 900px, they use 20px. |
| Compare title | The second column heading uses weight 650, 20px, line height 1.25 and spacing -0.01em. |
| Abstract | Reading abstracts use weight 400, 17px, line height 1.6 and maximum width 72ch. Compare abstracts use 15px/1.55. Below 900px, abstracts use 15px. |
| Body | Default text uses weight 400 and 15px/1.5. Proposal, finding and related titles use weight 600. |
| Meta | Metadata, citations, evidence pairs, source cards, buttons, notices and banners use weight 400, 14px and line height 1.45–1.5. |
| Label | Section headings and severity labels use weight 600, 13px, 0.06em spacing and uppercase. |

Proposal subtitles, counts, badges, list marks, tooltips, `kbd` and navigation also use 13px, without uppercase.

### Reuse type tokens

Every text size must use one of the six `--fs-*` tokens. New components must reuse those sizes. Reserve uppercase, letterspaced 13px text for section headings and severity labels. Keep it out of decorative text above titles.

## Layout

The workspace uses a CSS grid beneath a sticky 48px top bar. The proposal list is 368px wide. The reading column fills the remaining width. Opening a comparison changes the grid to `300px / 1fr / 1fr`.

The workspace height is `100dvh - 48px`. Columns scroll independently with `overscroll-behavior: contain`.

| Region | Dimensions |
| --- | --- |
| Reading column | Padding is 28px 48px 96px. Content centres within 72ch. Sections have 30px gaps and rules under 13px uppercase headings. |
| Compare column | Padding is 28px 40px 96px. Content width reaches 64ch. It uses `ground`, a left rule and 22px section gaps. |
| Proposal list | Header padding is 14px 16px 10px 20px. Row padding is 10px 14px 11px 20px with bottom rules. Footer padding is 10px 20px. |
| Text widths | Reasons and citations reach 68ch, notices 60ch and the unlock introduction 52ch. |

Spacing values are 4, 6, 8, 10, 12, 14, 16, 20, 22, 28 and 30px. Use 4–10px within components and 14–30px between blocks.

### Responsive
Below 1180px, the compare column moves under the reading column. The proposal list spans both rows. The capture date and **?** button hide. **Lock** shows only its icon.

Below 900px, the layout becomes one block. The top bar wraps and search fills a row. The proposal list appears above the reading column with a maximum height of 46vh. Column padding becomes 22px 16px 60px. The list footer hides. The bar and banner stop being sticky.

For coarse pointers, add 2px of vertical padding to rows, badges, marks and buttons. Print shows only the reading column. Hide the bar, list, compare column, navigation, actions and tooltips.

## Elevation & Depth

Separate regions with `ground`, `rail`, `surface` and 1px `line` rules. Selection changes a proposal row to white. Only tooltips and dialogs have shadows.

### Shadow Vocabulary
| Component | Shadow |
| --- | --- |
| Dark tooltip | Use `box-shadow: 0 2px 6px rgba(0,0,0,.14), 0 8px 24px rgba(0,0,0,.16)`. |
| Shortcuts dialog | Use `box-shadow: 0 8px 24px rgba(0,0,0,.16)` over a `rgba(35,43,49,.28)` backdrop. |

Cards, rows, badges and columns must remain shadow-free.

## Shapes

Corner radii follow five values:

| Radius | Components |
| --- | --- |
| 3px | Badges and proposal-list marks use this radius. |
| 4px | Chips, `kbd` and skeletons use this radius. |
| 5px | Buttons, inputs, source cards and the scope box use this radius. |
| 6px | Search and tooltips use this radius. |
| 8px | Dialogs use this radius. |

Borders are 1px. Legacy badges and inferred topic chips use dashed borders to identify their states. `kbd` has a 2px bottom border. Quoted abstract spans use 1.5px underlines with a 4px offset. Proposed spans use dotted amber, verified spans solid red and dismissed spans dotted slate.

## Components

### Buttons
Use bordered buttons for **Unlock**, **Lock**, shortcuts and form submission. Use text buttons for **Evidence**, **Dismiss**, **Add note**, **Compare** and **Show in abstract**.

| Property or variant | Values |
| --- | --- |
| Base | Use a 5px radius, 1px border, 5px 10px padding and 14px text. Inline flex uses a 6px gap. |
| Primary | Use accent fill and white text. Hover uses `accent-ink` fill. |
| Quiet | Use white fill, `accent-ink` text and `line-strong` border. Hover uses `accent-wash` fill and `accent-line` border. Active fill is #d8e6f2. |
| Ghost | Use no border, `accent-ink` text and 4px 6px padding. Hover uses `accent-wash`. |
| Citation and scope links | Use no border, accent text and a 3px underline offset. |
| Transitions | Background, border and colour change over 120ms ease-out. |
| Disabled and busy | Disabled opacity is 0.55. Busy opacity is 0.7 with a progress cursor. |

### Chips (topic)
Topic chips use 13px text, 4px 8px padding, a 4px radius, `accent-wash` fill, `accent-line` border and `accent-ink` text. Model-inferred topics use dashed borders and white fill. Active chips use accent fill with white text. Static chips use muted text on `rail` without a pointer cursor.

### Badges (finding state)
Base badges use 13px text at weight 500, 3px 6px padding, a 3px radius and a 1px `line-strong` border. They have white fill, muted text and a help cursor. Tooltips appear on hover and focus.

| State | Appearance |
| --- | --- |
| Verified | Use ink fill and white text. |
| Verified major (`concern`) | Use red fill and white text. |
| Proposed and contested | Use amber borders and text. |
| Legacy / unverified | Use dashed borders and slate text. |
| Measured | Use ink text to identify a measurement without judging quality. |
| Detector | Use `violet-line` borders and violet text. |
| Dismissed | Use slate text with strikethrough. |
| Severity | Use borderless uppercase labels, 0.06em spacing, muted colour and weight 600 for **major**, **minor** and **info**. |

### State icons
`index.html` defines drawn 16px SVG state symbols. Verified uses a checked filled circle in ink, or red for major findings. Proposed uses an amber diamond outline. Contested uses an amber crossed circle. Legacy uses a dashed slate circle; dismissed uses a slashed slate circle. Measured uses a muted gauge. Detector uses violet concentric circles.

Search, close, compare, chevron, previous/next, lock, pin, topic and external-link icons use 1.5–1.6 strokes.

### Docket rows
Each proposal row uses two columns. The left shows a 15px, weight-600 title clamped to two lines above one line of muted 13px speaker names. The right aligns compact marks vertically.

Marks combine an icon and count at 13px with a 3px radius and state colour. Only verified major marks have red fill. **Withdrawn** uses an uppercase 13px outlined tag.

Hovered rows use `rail-hover`. The current row uses white fill and an `accent-ink` title. Inset the focus ring by 2px.

### Finding rows
Each finding starts with an 18px icon box, 15px semibold title, state badge and severity badge. A right-aligned metadata line shows origin and check time. Tooltip triggers have dotted underlines.

Below, show the reason within 68ch, an italic quotation with **Show in abstract**, then text actions. Evidence expands with a 250ms `grid-template-rows: 0fr → 1fr` transition. Its key-value list uses 14px text and muted keys. Source cards use `ground`, a 5px radius, a thin border and a floated date.

Dismissal makes the title and reason muted and the quotation slate.

### Inputs / Fields
Inputs use white fill, a 1px `line-strong` border, 5px radius, 6px 10px padding and an accent caret. Hover changes the border to #92a1ad.

Search uses `rail` fill and border, a 6px radius, a left icon and a right `/` hint. Focus changes its fill to white and border to accent, while the hint fades.

Global focus uses a 2px accent outline with 2px offset. Errors use red borders, 14px red messages and a 280ms shake. Correction forms have 14px semibold labels and textareas at least 66px high. Place buttons in a row and limit forms to 60ch.

### Navigation
The white sticky top bar is 48px high. Its brand uses 15px bold text with a muted 13px **Review workspace** label. It contains 360px search, 13px **Topic** and **View** selectors, the capture date, and quiet **?** and **Lock** buttons.

Reading-column navigation uses muted 13px text, ghost **Previous** and **Next** buttons, and a position counter.

### Tooltip
Tooltips use `tooltip-bg`, white 13px text, 8px 11px padding, a 6px radius and a maximum width of 320px. Place them above the trigger, or below when space is limited. Show them on hover and focus. Hide them immediately on leave or click. Connect them through `aria-describedby`.

### Compare column
**Compare** or `c` opens a second reading column in place. Its content moves from 24px right and fades in over 350ms. Closing waits 350ms before removing the column. Reduced motion removes it immediately.

### Motion
Motion leaves input available. `style.css` defines timings. The standard easing is `cubic-bezier(.22, 1, .36, 1)`.

| Motion | Timing and behaviour |
| --- | --- |
| Proposal entrance | Reading content fades in from 4px below over 120ms ease-out. There is no exit phase, so `j` and `k` remain immediate. |
| Evidence accordion | Rows and chevron animate over 250ms with standard easing. |
| Compare column | Entry and exit use 350ms with standard easing. |
| Tooltip | Entry has a 40ms delay and 80ms ease-out animation. Exit is immediate. |
| Hover | Button, row and chip colours change over 120ms ease-out. |
| Quotation highlight | **Show in abstract** applies amber or red fill over 300ms ease-out and holds it for 1600ms. |
| Dialog | Entry uses 150ms ease-out with `@starting-style`. |
| Error shake | The animation takes 280ms. |
| Skeleton | The pulse loops every 1000ms. |

Reduced motion sets transition and animation durations to zero. It closes comparison immediately and skips the proposal entrance.

## Requirements for later changes

Keep detector results in a separate violet-outlined subsection. Proposed, legacy and model-inferred items must remain visibly unconfirmed. Leave their backgrounds unfilled and avoid solid underlines or ink text.

Reuse the six `--fs-*` sizes and 3, 4, 5, 6 and 8px radii. Mark tooltip triggers with dotted underlines or help cursors. Show tooltips on keyboard focus.

Keep interaction motion under 350ms and leave input available. The timing table separately records a 350ms comparison transition. Disable motion under `prefers-reduced-motion`. Describe missing evidence neutrally, including whether a check date exists.

Keep the abstract as the main content. Exclude metric cards, large promotional sections, charts and empty panels. Evaluation views must hide ranks and scores. Use drawn SVG state symbols without display faces, icon fonts or emoji glyphs.
