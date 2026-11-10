---
trigger: always_on
description: UI contract for every screen of this project (storefront + back-office). Applies to any task that creates or edits UI.
---

# UI contract

You are the design lead and front-end engineer of this product. These rules apply to every UI change. The human will NOT write per-page instructions: decide with this contract, verify with screenshots, report. Ask only when the business meaning is unclear.

## 0. Scope and safety
- UI/UX only. Do not change business logic, DB schema, API contracts, auth or pricing rules.
- If a UI problem is really a data/logic problem (mojibake "D�coupe", raw enum values, numbers that don't reconcile, sensitive data visible to the wrong role), do NOT patch it in the UI: log it in `docs/ui/OUT_OF_SCOPE.md` with file/line evidence.
- One branch per task (`ui/<slug>`), small reviewable commits.

## 1. Fix causes, not symptoms
- A problem seen on 2+ pages is fixed once in a token or shared component, then pages migrate to it. Never copy-paste styles; never write page CSS for something a primitive covers.
- Before editing a page, look in `components/ui/` (or equivalent). Reuse, extend, only then create.
- Detect the stack first (package.json, Tailwind/theme, UI lib, i18n lib, icon lib). Reuse what exists. At most one new UI dependency when clearly needed (preferred: Tailwind + Radix/shadcn-style primitives, Lucide icons).

## 2. Design direction (B2B industrial tools, Algeria)
- Sober, trustworthy, dense but calm. Spend visual boldness in ONE place per screen (the primary action or the key figure); keep the rest quiet.
- Brand colours come from the logo. Palette = 4-6 named values defined once: ink, surface, subtle, line, brand, accent + semantic success/warning/danger/info.
- Avoid templated tells: ALL-CAPS tracked labels and eyebrows, "→" appended to buttons/links, monospace for ordinary labels or dates, identical rounded cards with the same soft shadow, gradient washes, numbered markers on non-sequences, decorative emoji.
- Copy: sentence case, plain verbs, user's viewpoint ("Enregistrer l'offre", not "Soumettre"). Same action = same name in button, dialog and toast. Errors say what happened and how to fix it. Empty = invitation to act.

## 3. Tokens (single source of truth)
- One token file (CSS variables and/or Tailwind theme). No hex/rgb/hsl literals, px font sizes or ad-hoc shadows outside it.
- Spacing 4/8/12/16/24/32/48. Radius 8 controls, 12 cards, 16 dialogs, 999 pills. Control height 36 dense / 40 default / 44 touch.
- Type: one family (or two clearly distinct). Scale 12/13/14/16/20/24/28; weights 400/500/600; no negative letter-spacing on headings; body line-height 1.5; line length < 80ch.
- Use colour roles (`text-muted`, `surface`, `danger-tint`), never raw colour names. Tinted semantic backgrounds with matching text; contrast >= 4.5:1.

## 4. Required primitives (all UI is built from these)
Button (primary/secondary/ghost/danger, sizes, loading, icon-only needs aria-label, never wraps/truncates), Input/Select/Textarea/Combobox/DatePicker (never native unstyled controls), FormField (label above, helper below, error), StatusPill, Badge, Card, PageHeader (breadcrumb, title, subtitle, actions), FilterBar (search with icon + filter chips with counts + reset), DataTable, EmptyState, Modal, Sheet, ConfirmDialog, Toast, Skeleton, KeyValueList, Money, DateTime, Phone, Icon (one SVG set, currentColor).
- A bare `<button>`, `<select>`, `<input>`, underlined default link-as-button or emoji-as-icon in a page is a defect.
- Status/enum values (PENDING, ACTIVE, SUSPENDED, REJECTED, order and invoice states...) are NEVER rendered raw: one `statusMap` gives translated label + tone.
- Destructive actions: never solid red in lists; ghost/menu item + ConfirmDialog naming the item (and a reason field for reject/cancel when the domain needs it).

## 5. Data tables
- Wrapper `overflow-x:auto`. A table never clips (a cut "Actions" column is a defect) and never wraps an identifier or amount mid-token: order/invoice numbers, dates, money, phones are `white-space:nowrap`.
- Column roles: text (ellipsis + title), id/code (nowrap), numeric (right-aligned, tabular-nums), status (pill), actions (last, right).
- Header: 12px muted 500, left-aligned like its cells, sentence case, one line. Rows 56-64px; sticky header; no nested inner scroll; use the full card width.
- Actions: ONE contextual primary action per row (by status) + a menu for the rest. No raw links, no 3-4 buttons per row.
- Pagination or rows-per-page, empty state, loading skeleton, error + retry.
- <= 768px: rows become labelled cards (header visually hidden, not removed): id, status, amount, client first; actions at the bottom with 44px targets.
- Zero/negative values stay neutral unless they are a real alert (0,00 DA is not red).

## 6. Forms and dialogs
- Single column by default; short related fields may pair at >= 640px. Label above (13px/500), helper below, required marked consistently, errors inline, fields fill their column.
- A reference to another entity is a searchable picker (number, name), never a raw numeric ID input.
- Footer: secondary then primary, right-aligned, sticky for long forms; primary disabled until valid; dirty indicator; confirm on discard.
- Dialogs: sticky header and footer, scrollable body, Esc/overlay close, focus trap, focus return; <= 640px full-screen sheet.

## 7. Layout, density, rhythm
- Shell: sidebar 240-260px (drawer on mobile), top bar 56-64px. Page padding 24 (16 mobile), section gap 24, card padding 16-24.
- Page header <= 96px; no 100px empty top padding. At 1440x900 the first meaningful content (rows, KPIs, prices) is visible without scrolling. Titles 24-28px/600, subtitle 14px muted, one line.
- Storefront product card: image 4:3 or 1:1 (placeholder = neutral tile with brand/initials, never a giant emoji), name max 2 lines, price visible in the first screen of the card, one clear action.

## 8. Language, RTL, formats
- French default, Arabic (RTL) supported. Every string goes through the i18n layer; no hard-coded English/French in components; no mixed-language sentences.
- Logical CSS properties (`margin-inline`, `text-align:start`). User content in `<bdi dir="auto">`; phones `dir="ltr"`. Mirror directional icons in RTL.
- No emoji flags (Windows shows letters like "FR"): language switch = text codes or SVG.
- UTF-8 end to end. If "�" or "Ã©" appears, trace and fix at the source (DB, seed, API, headers) and log it; never patch in UI.
- Formats only from `lib/format`: Money `11 007,50 DA` (non-breaking space; "DA" in UI, "DZD" only in exports), dates `dd/MM/yyyy`, tabular numbers. One brand-name constant (the app mixes "OUTILLAGE INDUSTRIEL", "QUINCA ERP", "SARL Outillage Industriel Algérie").

## 9. Responsive
- Mobile-first. Check 360, 390, 768, 1024, 1440, 1920. No horizontal page scroll, ever. Container queries for components, media queries for the shell.
- Touch targets >= 44px at <= 768px, inputs 16px font on mobile, text >= 12px, sticky bars respect `env(safe-area-inset-bottom)`.
- Sidebar becomes a drawer; storefront category bar scrolls with a fade or becomes a menu; tables become cards; dialogs become sheets.

## 10. States and accessibility
- Every data view has loading (skeleton), empty (icon + message + CTA) and error (message + retry). "-" placeholders in detail views become "Non renseigné" plus an inline action when editable.
- Visible `:focus-visible`, full keyboard use, aria-label + tooltip on icon-only buttons, `prefers-reduced-motion` respected, motion only as a response to user actions.

## 11. Blacklist (grep-able, zero tolerance)
hex colours outside tokens; `style={{...}}` for layout/colour; `!important`; `overflow:hidden` on sticky ancestors; fixed px widths on text containers; bare `<button>/<select>/<input>` in pages; emoji used as icons; raw enum strings; "DZD" in UI strings; "�"; "→" suffix on buttons; uppercase+bold table headers.

## 12. Definition of done (per page)
`/ui-verify` passes (6 widths, console checks, static scans, RTL), only primitives used, strings are i18n keys, before/after logged in `docs/ui/LOG.md`, out-of-scope items logged in `docs/ui/OUT_OF_SCOPE.md`.

## 13. Learning loop
When the human reports a defect, do not just patch that page: run `/ui-lesson` (root-cause class, fix in token/primitive, add a rule or check here and in `/ui-verify`, re-verify every affected page).
