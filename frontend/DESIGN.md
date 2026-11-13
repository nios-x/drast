---
name: DrastDB Playground
description: A black, hairline-quiet browser console where every editor line is one DrastDB request.
colors:
  ink-black: "#000000"
  panel-black: "#0a0a0a"
  raised-1: "#111111"
  raised-2: "#1a1a1a"
  hairline: "#222222"
  hairline-strong: "#2e2e2e"
  hairline-hover: "#454545"
  paper-white: "#ededed"
  smoke: "#a1a1a1"
  ash: "#8a8a8a"
  signal-blue: "#3291ff"
  pass-green: "#4fca82"
  fault-red: "#ff6166"
  wait-amber: "#f5a623"
  syntax-keyword: "#ff7aa8"
  syntax-string: "#6fd08c"
  syntax-number: "#52a8ff"
  syntax-punct: "#8f8f8f"
  syntax-comment: "#808080"
typography:
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  code:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "22px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "#cccccc"
  button-secondary:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.raised-2}"
  button-ghost:
    textColor: "{colors.smoke}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "28px"
  input:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "36px"
  status-pill:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.pill}"
    height: "32px"
  panel:
    backgroundColor: "{colors.panel-black}"
    rounded: "{rounded.lg}"
---

# Design System: DrastDB Playground

## Overview

**Creative North Star: "The Black Console"**

A developer's console in the black, hairline-thin idiom of modern deploy dashboards. The page is pure black; working surfaces are near-black panels separated by 1px lines, never by shadow or color. The interface stays silent so the database's answers (rows, row counts, error text) are the brightest things on screen.

Color is a signal, not decoration. Green and red appear only when a query has passed or failed, blue only for focus and selection, and the pink/green/blue syntax palette only inside code. The one signature device is the editor gutter: each line gets a dot after it runs, because each line is one request.

Density is that of a work tool: 14px UI text, 13px code, 22px code lines, compact 32px controls.

**Key Characteristics:**
- Pure black ground with near-black panels and 1px hairlines
- White primary buttons with black text; everything else is outlined or ghost
- Geist for the interface, Geist Mono for code, data and measurements
- Green, red, amber and blue reserved for state
- Flat at rest; only floating menus carry a shadow

## Colors

A monochrome stack of blacks and grays with four state colors and a code-only syntax palette.

### Primary
- **Paper White** (paper-white): primary button fill, active tab underline, the brightest text. The only "accent" the system has; its rarity is what makes Run stand out.

### Neutral
- **Ink Black** (ink-black): page ground, inputs, secondary button fill, result-table body.
- **Panel Black** (panel-black): editor and output panels, menus, table footers.
- **Raised 1 / Raised 2** (raised-1, raised-2): hover rows, table header band, hover state of secondary and ghost buttons, tab counts.
- **Hairline / Strong / Hover** (hairline, hairline-strong, hairline-hover): dividers and panel edges; control outlines; outline on hover and on the focused editor panel.
- **Smoke** (smoke): secondary text, column headers, ghost button text.
- **Ash** (ash): tertiary text: captions, timings, line numbers, placeholders. Holds at least 4.5:1 on Ink Black.

### State
- **Pass Green** (pass-green): succeeded query icon, gutter dot, history dot, connected status.
- **Fault Red** (fault-red): failed query icon and message, gutter dot, offline status, destructive actions.
- **Signal Blue** (signal-blue): focus rings and text selection only.
- **Wait Amber** (wait-amber): the connecting state of the status dot only.

### Named Rules
**The State-Only Color Rule.** Green, red, amber and blue mean query or connection state. Never use them for decoration, emphasis or branding.

**The One White Button Rule.** Each region has at most one Paper White button: its primary action (Run, Set, Reconnect).

## Typography

**Interface Font:** Geist (Geist Variable, self-hosted via @fontsource-variable/geist)
**Code Font:** Geist Mono (Geist Mono Variable, self-hosted via @fontsource-variable/geist-mono)

**Character:** One neutral grotesk carries all UI text; its mono sibling carries anything a database produced or will consume. Weight changes (400 → 500 → 600) do the work that size changes would do on a marketing page.

### Hierarchy
- **Title** (600, 16px, -0.015em): empty-state headings.
- **Label** (600, 14px, -0.01em): panel titles (Query, Output) and the product name.
- **Body** (400, 14px, 1.5): default UI text and buttons (buttons use 500).
- **Caption** (400, 12–13px): summaries, captions, timings, history metadata.
- **Code** (400, 13px, 22px line): editor, results, column chips, query echoes, key/value values. Ligatures off, tabular numerals in data.

### Named Rules
**The Mono Means Data Rule.** Monospace is only for code, data and measurements (queries, cell values, timings, URLs, kbd hints), never for decoration.

## Layout

A full-height app shell: a 56px top bar, then a two-column workspace with a 320px sidebar and a fluid main column. The main column stacks the editor panel, a 12px draggable divider and the output panel, inside 12px padding. The editor height is user-resizable (minimum 140px) and remembered.

Spacing works on a 4px grid with 8, 12 and 16px as the working steps: 12px panel padding and gutters, 16px horizontal padding inside panels, 52px panel bars.

Below 960px the shell becomes one scrolling column: main area first (editor fixed at 280px, output at least 300px), sidebar below, the divider and keyboard hints hidden. Below 560px the panel bars wrap, the host and Docs link leave the top bar, and menus become fixed sheets 12px from the screen edges.

## Elevation & Depth

Flat by default. Depth comes from tonal steps (Ink Black → Panel Black → Raised) and 1px hairlines. The only shadow is on floating layers: menus, the connection popover and toasts (`0 16px 40px -12px rgba(0,0,0,.9), 0 4px 12px -6px rgba(0,0,0,.7)`).

### Named Rules
**The Hairline Rule.** Separate regions with a 1px line in Hairline or Hairline Strong. Never use a resting shadow, a colored border or a thicker stripe.

## Shapes

Gently rounded rectangles: 6px for controls (buttons, inputs, list rows), 8px for result tables, menus and notes, 12px for panels and menus. The connection status and tab counters are full pills. The empty state uses a square frame with four small crosshair marks at its corners, the one ornamental device in the system.

## Components

### Buttons
- **Shape:** gently rounded (6px); 36px default, 32px small, 28px extra-small.
- **Primary:** Paper White fill, black text, weight 500. Hover darkens to #cccccc.
- **Secondary:** Ink Black fill with a Hairline Strong outline. Hover raises to Raised 2 with the hover outline.
- **Ghost:** no fill, Smoke text. Hover raises to Raised 2 with Paper White text. The danger variant uses Fault Red text and a faint red wash on hover.
- **Icon:** 32px square, ghost behaviour.
- **States:** focus shows a 2px Signal Blue outline offset 2px; disabled drops to 45% opacity; pressing nudges the button down 0.5px. Keyboard hints sit inside the button in 11px mono Ash.

### Inputs / Fields
- **Style:** Ink Black fill, Hairline Strong outline, 6px radius, 36px tall, 13px text (mono for keys, values and URLs).
- **Focus:** 2px Signal Blue outline offset 1px. Hover strengthens the outline.
- **Error:** a 12.5px Fault Red line under the field, announced with role="alert".

### Navigation
- **Top bar:** logo, product name, a thin slash, then "Playground" in Smoke. On the right, the status pill (dot, state word, host in mono) opens the connection popover.
- **Sidebar tabs:** text tabs in Smoke; the selected tab turns Paper White with a 2px white underline sitting on the divider. Counts appear as small pills.

### Panels
- **Corner Style:** 12px.
- **Background:** Panel Black with a Hairline edge; the editor panel's edge strengthens while it has focus.
- **Panel bar:** 52px, label title, Ash subtitle, actions aligned right.

### Result Table
- Ink Black body inside an 8px Hairline frame. Sticky Raised 1 header in Smoke weight 500. Rows 36px with Hairline separators and a Panel Black hover. An Ash row-number column comes first, and the last column takes the spare width so the others fit their content. Empty values show a quiet "empty" label. The footer shows the row and column counts and Copy TSV.

### Editor Gutter (signature)
- A 60px column of line numbers in Ash, with Paper White on the lines that Run would execute (also tinted in the code layer). After a run, each executed line gets a 7px dot: Pass Green or Fault Red, pulsing white while it runs. The dot disappears when its line is edited.

## Do's and Don'ts

### Do:
- **Do** keep the page ground Ink Black (#000) and panels Panel Black (#0a0a0a).
- **Do** use Paper White fill only for the single primary action in a region.
- **Do** show real database output verbatim: the exact error text, row counts and timings.
- **Do** separate regions with 1px Hairline lines.
- **Do** keep motion to state changes, at 150–250ms with `cubic-bezier(0.16, 1, 0.3, 1)`, and respect reduced motion.

### Don't:
- **Don't** use green, red, amber or blue for anything but state (The State-Only Color Rule).
- **Don't** add resting shadows, glows or halos around status dots.
- **Don't** use monospace for headings or labels that aren't code or data.
- **Don't** put a grid or line-field texture behind content; the corner crosshair frame is the only ornament.
- **Don't** add eyebrow labels above headings.
