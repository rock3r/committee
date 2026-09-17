---
name: Committee review workspace
description: A reviewer's docket and reading desk. One accent; status hues only on finding state.
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

> Historical design brief. The current implementation has evolved; use the user guide and `web/style.css` for current behaviour and visual tokens.


# Design System: Committee review workspace

Mode: Operate. This file records the built world in `web/style.css`, `web/index.html` and `web/app.js`. It replaces the earlier provisional note. Values were re-tuned for contrast during the build (muted text now reaches 5.8:1 on white; the rail was cooled). The token values above are the source of truth.

## Overview

**Creative North Star: "The Docket and the Reading Desk"**

The workspace is a committee tool, not a dashboard. It has one dense, scannable index on the left and one reading column on the right. The reading column is a desk in the cool ground tone. The submission (title, speakers, topics, abstract) sits on it as one white sheet with a hairline edge, set at 30/18 px. Findings are notes on the desk below the sheet: a state icon in a narrow gutter, a bold label with its state badge, the reason at 15 px, and one small line with evidence, actions and provenance. Expanded evidence is one record sentence plus compact source rows. Judgment stays with the human reviewer.

The world is restrained. There is one accent blue for selection, primary actions and focus. Colour that carries meaning appears only on finding state: amber for proposed or contested, subdued red for verified major findings, slate for legacy or dismissed, violet for detector signals in their own section. There is no green "all clear". The type is the system sans at a fixed rem scale with tabular numerals. Depth comes from tonal layering and hairline rules, not shadows.

**Key Characteristics:**
- Three tones of ground (off-white page, cooler rail, white reading surface) separated by 1px hairlines.
- One accent for actions and selection. Status hues on finding state. Categorical colour for glanceable session facts: a fixed hue per format (session blue, workshop green, keynote violet, lightning orange, panel teal) and a stable hashed hue (eight wash/text pairs) per topic name, used in the docket, on the sheet and in related lists.
- Fixed seven-step type scale: 13 / 14 / 15 / 18 / 20 / 24 / 30 px in rem.
- Compact 1px-bordered badges that fill only when verified.
- Drawn 16px SVG state icons, one per finding state.
- Short, non-blocking motion; reduced motion zeroes everything.

## Colors

A cool neutral family with one blue accent and four status hues that only appear on finding state.

### Primary
- **Accent blue** (`accent`, #1769aa): links, primary button fill, active topic chip, focus ring, caret, checkbox accent, the topic icon in the scope box.
- **Accent ink** (`accent-ink`, #0f4d80): text colour of quiet and ghost buttons, the selected docket row title, related-proposal titles, primary hover fill.
- **Accent wash / line** (`accent-wash` #e6f0f8, `accent-line` #9cc0dd): topic chip ground and border; hover ground of quiet and ghost buttons.

### Secondary (status hues)
- **Amber** (`amber` #835900, `amber-wash` #fdf3d7, `amber-line` #dcbd67): proposed and contested findings, the dotted underline on cited spans, evidence warnings. Amber means "not yet verified".
- **Red** (`red` #a93636, `red-wash` #fbecec, `red-line` #e0a3a3): verified major findings (filled badge, filled docket mark, solid underline on the cited span), the error banner, form errors. Red never means "danger" in the marketing sense; it means "verified and major".
- **Slate** (`slate` #6b7780, `slate-wash` #eceff2): legacy / unverified findings (dashed border) and dismissed findings (struck through, muted).
- **Violet** (`violet` #4e3f80, `violet-wash` #f1eef8, `violet-line` #b6abd6): detector signals only. They live in their own "Detector signal" subsection under the findings, so the hue never mixes with editorial states.

### Neutral
- **Ground** (`ground`, #f3f5f8): page background and the compare column; also the source card ground inside a finding.
- **Rail** (`rail`, #eef1f5) and **rail hover** (`rail-hover`, #e4e9ee): docket rail and search field ground; row hover.
- **Surface** (`surface`, #ffffff): top bar, reading column, selected docket row, inputs, badges.
- **Ink** (`ink`, #232b31): body text, filled verified badge, verified state icon.
- **Muted** (`muted`, #5b6770): secondary text, section headings, placeholder text, default badge text. Measured at 5.8:1 on white.
- **Faint** (`faint`, #8a95a0): separators ("·"), the search icon. Never used for words.
- **Line** (`line`, #d6dde4) and **line strong** (`line-strong`, #b3bfc9): hairline rules and borders; the stronger value on inputs, badges and the `kbd` key.
- **Tooltip ground** (`tooltip-bg`, #26313a): the only dark surface.

### Named Rules
**The Finding-State Rule.** Amber, red, slate and violet appear only on finding state: badges, docket marks, state icons, cited-span underlines, and their direct error or warning text. They never colour layout, headings, or decoration.

**The Fill-Only-When-Verified Rule.** A badge or docket mark is filled only when the finding is verified: ink fill for verified, red fill for verified major. Every other state is an outlined or text-only badge, so an unverified finding can never look confirmed.

**The No Green Rule.** There is no success hue. Missing evidence and empty finding lists are neutral text ("No open findings. Not an endorsement.").

## Typography

**Display Font:** none. The system sans is used everywhere.
**Body Font:** system sans stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`)
**Label/Mono Font:** none. `kbd` uses the same sans at 13px.

**Character:** native and quiet. Tabular numerals are on for the whole document so counts and dates line up. Headings use `text-wrap: balance`; the abstract and row titles use `text-wrap: pretty`.

### Hierarchy
The scale is six fixed rem steps (`--fs-13` 0.8125rem, `--fs-14` 0.875rem, `--fs-15` 0.9375rem, `--fs-17` 1.0625rem, `--fs-20` 1.25rem, `--fs-24` 1.5rem). No `clamp()`.

- **Title** (650, 24px, 1.22, -0.012em): the selected proposal title and the unlock heading. Drops to 20px under 900px.
- **Compare title** (650, 20px, 1.25, -0.01em): the second column's heading.
- **Abstract** (400, 17px, 1.6): the abstract body in the reading column, max 72ch. In the compare column it is 15px / 1.55; under 900px it is 15px.
- **Body** (400, 15px, 1.5): default page text, docket row titles (600), finding titles (600), related titles (600).
- **Meta** (400, 14px, 1.45 to 1.5): meta lines, citations, evidence key-value pairs, source cards, buttons, notices, the banner.
- **Label** (600, 13px, 0.06em, uppercase): section headings ("Findings", "Detector signal"), severity badges ("major", "minor", "info"). Also 13px without uppercase: docket subtitles, counts, badges, docket marks, tooltips, `kbd`, the navigation strip.

### Named Rules
**The Six-Step Rule.** Every text size is one of the six `--fs-*` tokens. New surfaces do not introduce a seventh size.

**The Uppercase-Is-Structure Rule.** Uppercase 13px letterspaced text is used for structural section headings and severity labels only. It is not a decorative kicker above titles.

## Layout

The workspace is a CSS grid under a 48px sticky top bar: docket rail 368px, reading column fluid. When a comparison is open the grid becomes 300px / 1fr / 1fr. The workspace fills `100dvh - 48px`; each column scrolls on its own with `overscroll-behavior: contain`.

- **Reading column:** padding 28px 48px 96px, inner content max 72ch, centred. Sections are separated by 30px and a hairline under a 13px uppercase heading.
- **Compare column:** padding 28px 40px 96px, max 64ch, ground colour, hairline on its left. Sections are 22px apart.
- **Docket rail:** head padding 14px 16px 10px 20px; rows padding 10px 14px 11px 20px with a hairline below; footer padding 10px 20px.
- **Spacing rhythm:** 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 22 / 28 / 30 px. Inside components use 4 to 10; between blocks use 14 to 30.
- **Reading measure:** finding reasons and citations are limited to 68ch, notices to 60ch, the unlock intro to 52ch.

### Responsive
- **Under 1180px:** the compare column moves below the reading column (two rows, docket spans both). The capture date and the "?" button are hidden; Lock becomes icon-only.
- **Under 900px:** the grid becomes a single block. The top bar wraps, search takes a full row, the docket sits above the reading column at a maximum 46vh, column padding drops to 22px 16px 60px, the docket footer hides, and the bar and banner stop being sticky.
- **Coarse pointer:** rows, badges, marks and buttons gain 2px more vertical padding.
- **Print:** bar, docket, compare, navigation, actions and tooltips are hidden; only the reading column prints.

## Elevation & Depth

The system is flat. Depth comes from three tonal grounds (ground, rail, surface) and 1px hairlines in `line`. The selected docket row is "lifted" only by becoming white on the rail. Shadows exist in exactly two places, both floating layers.

### Shadow Vocabulary
- **Tooltip** (`box-shadow: 0 2px 6px rgba(0,0,0,.14), 0 8px 24px rgba(0,0,0,.16)`): the dark tooltip.
- **Dialog** (`box-shadow: 0 8px 24px rgba(0,0,0,.16)`): the shortcuts dialog, over a `rgba(35,43,49,.28)` backdrop.

### Named Rules
**The Floating-Only Rule.** Shadows appear only on layers that float above the page (tooltip, dialog). Cards, rows, badges and columns never carry a shadow.

## Shapes

Corners are small and consistent. Badges and docket marks 3px; chips, `kbd` and skeletons 4px; buttons, inputs, source cards and the scope box 5px; the search field and tooltip 6px; the dialog 8px. Borders are 1px. State is expressed through border style, not radius: legacy badges and inferred topic chips use a dashed border; `kbd` uses a 2px bottom border to read as a key. Cited spans in the abstract carry a 1.5px underline offset 4px (dotted amber for proposed, solid red for verified, dotted slate for dismissed).

## Components

### Buttons
Two vocabularies, both deliberate. Bordered buttons are for workspace-level actions (Unlock, Lock, shortcuts, form submits). Text buttons are for actions inside content (Evidence, Dismiss, Add note, Compare, Show in abstract).
- **Shape:** 5px radius, 1px border, padding 5px 10px, 14px text, inline flex with a 6px gap.
- **Primary:** accent fill, white text. Hover darkens to accent ink.
- **Quiet:** white fill, accent-ink text, line-strong border. Hover: accent wash fill, accent-line border. Active: #d8e6f2.
- **Ghost:** no border, accent-ink text, padding 4px 6px. Hover: accent wash.
- **Inline link buttons** (in citations and the scope box): no border, accent text, underline offset 3px.
- **Transitions:** background, border and colour in 120ms ease-out. Disabled: opacity 0.55. Busy: opacity 0.7 with a progress cursor.

### Chips (topic)
- **Style:** 13px, padding 4px 8px, 4px radius, accent wash fill, accent-line border, accent-ink text.
- **Inferred:** dashed border on a white fill (model-inferred topic, not a submitted tag).
- **Active:** accent fill, white text. **Static:** muted text on the rail ground, no pointer.

### Badges (finding state)
- **Base:** 13px, weight 500, padding 3px 6px, 3px radius, 1px line-strong border, white fill, muted text, help cursor, tooltip on hover or focus.
- **Verified:** ink fill, white text. **Verified major** (`concern`): red fill, white text.
- **Proposed** and **Contested:** amber border and text. **Legacy / unverified:** dashed border, slate text. **Measured:** ink text (a fact, not a judgment). **Detector:** violet-line border, violet text. **Dismissed:** slate text, line-through.
- **Severity:** borderless, uppercase, 0.06em, muted, weight 600 ("major", "minor", "info").

### State icons
16px drawn SVG symbols in `index.html`, coloured by the same states: verified is a filled circle with a check (ink; red for verified major), proposed an outlined diamond (amber), contested a circle with a cross (amber), legacy a dashed circle (slate), dismissed a circle with a slash (slate), measured a gauge (muted), detector concentric circles (violet). Chrome icons (search, close, compare, chevron, prev/next, lock, pin, topic, external) use the same 1.5 to 1.6 stroke.

### Docket rows
- **Layout:** two-column grid: title (15px, 600, two-line clamp) over speakers (13px, muted, one line) on the left; a right-aligned stack of compact marks on the right.
- **Marks:** icon plus count at 13px, 3px radius, coloured per state; only verified major fills red. "Withdrawn" is an uppercase 13px outlined tag.
- **States:** hover rail-hover; current row white with accent-ink title; focus ring inset by 2px.

### Finding rows
State icon (18px box), 15px semibold title, state badge, severity badge, then a right-aligned meta line (provenance, "checked …", dotted underline for tooltip triggers). Below: reason (68ch), citation in italic quotes with a "Show in abstract" link button, then text actions. The evidence accordion uses a `grid-template-rows: 0fr → 1fr` transition (250ms) with a key-value list (14px, muted keys) and source cards (ground fill, 5px radius, hairline border, floated date). Dismissed findings turn title and reason muted and the citation slate.

### Inputs / Fields
- **Style:** white fill, 1px line-strong border, 5px radius, padding 6px 10px, accent caret. Hover border #92a1ad.
- **Search:** rail fill and border, 6px radius, icon at left, `/` key hint at right; on focus the fill turns white, the border accent and the hint fades.
- **Focus (global):** 2px accent outline, 2px offset.
- **Error:** red border, red 14px message, 280ms shake.
- **Correction form:** 14px semibold label, textarea min 66px, buttons in a row, max 60ch.

### Navigation
The top bar is a 48px white sticky strip with brand (15px bold plus 13px muted "Review workspace"), the 360px search, "Topic" and "View" select fields at 13px, the capture date, and the "?" and Lock quiet buttons. The navigation strip in the reading column is 13px muted text with ghost Previous / Next buttons and a position counter.

### Tooltip
Dark (`tooltip-bg`) with white 13px text, padding 8px 11px, 6px radius, max 320px, placed above the trigger (below when there is no room). Shown on hover and on focus; hidden instantly on leave or click. Also used as `aria-describedby`.

### Compare column
A second reading column opened in place by "Compare" (or `c`). The inner block slides in from 24px right with a fade over 350ms; closing waits 350ms before removing the column (immediately under reduced motion).

### Motion
Motion is short and never blocks input. All timings are in `style.css`; the standard ease is `cubic-bezier(.22, 1, .36, 1)`.
- **Enter cue** (120ms ease-out): on proposal change the reading content fades in from 4px below. There is no exit phase, so `j` / `k` never wait.
- **Accordion** (250ms, standard ease): evidence rows and the chevron flip.
- **Compare slide** (350ms, standard ease): compare column enter and exit.
- **Tooltip** (40ms delay + 80ms ease-out in; instant out).
- **Hover** (120ms ease-out): button, row and chip colour changes.
- **Span flash** (300ms ease-out, held 1600ms): amber or red wash on a cited span after "Show in abstract".
- **Dialog** (150ms ease-out with `@starting-style`), **shake** (280ms), **skeleton pulse** (1000ms loop).
- **Reduced motion:** all transition durations and animations are set to zero; the compare close is immediate; the enter cue is skipped.

## Do's and Don'ts

### Do:
- **Do** keep colour that carries meaning on finding state only (the Finding-State Rule).
- **Do** fill a badge only for verified (ink) and verified major (red); outline every other state.
- **Do** keep detector results in their own subsection with the violet outline, separated from editorial findings.
- **Do** use one of the six `--fs-*` sizes and the 3 / 4 / 5 / 6 / 8 px radius steps.
- **Do** mark every tooltip trigger with a dotted underline or a help cursor, and show the tooltip on keyboard focus too.
- **Do** keep motion under 350ms and non-blocking, and zero it under `prefers-reduced-motion`.
- **Do** state missing evidence in neutral words ("Not recorded.", "check date not recorded").

### Don't:
- **Don't** add a green or success hue. There is no "all clear" state.
- **Don't** let proposed, legacy or model-inferred items look confirmed: no fills, no solid underlines, no ink text for them.
- **Don't** add shadows to rows, cards, badges or columns; only floating layers (tooltip, dialog) carry a shadow.
- **Don't** add metric cards, hero blocks, charts or empty panels; the abstract is the page.
- **Don't** show ranks or scores in evaluation views.
- **Don't** introduce a display face, an icon font or emoji glyphs; state icons are drawn SVG symbols.
