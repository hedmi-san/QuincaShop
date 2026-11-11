---
description: Build design tokens, shared primitives, app shells and a living gallery once, so every page can be fixed by migrating to them.
---

# /ui-foundation

Prerequisite: `docs/ui/AUDIT.md` and `BACKLOG.md` approved. Follow the UI contract. Branch `ui/foundation`.

1. **Design plan first (short, in an artifact).** Propose 4-6 named colours (from the logo), type roles and scale, a layout concept for the admin shell and the store shell (ASCII wireframes), and 3 principles. Check it against "is this the generic default I would produce for any B2B app?" and revise before building. Sober industrial B2B, not decorative.
2. **Tokens.** Create the single token source (CSS variables + Tailwind theme if used): colour roles with tints, spacing, radius, control heights, type scale, 2 shadow levels, z-index scale. Wire fonts through the existing mechanism. Remove conflicting global resets only if safe.
3. **Utilities.**
   - `lib/format`: `formatMoney` ("11 007,50 DA", non-breaking space), `formatDate`, `formatPhone`, `formatNumber`.
   - `lib/status`: one `statusMap` covering every enum in the codebase (grep schema/types) -> i18n label key + tone.
   - Language switch without emoji flags.
4. **Primitives** in `components/ui/` (contract section 4): Button, Input, Select, Textarea, Combobox, DatePicker, FormField, StatusPill, Badge, Card, PageHeader, FilterBar, DataTable (responsive card mode, sticky header, pagination, empty/loading/error), EmptyState, Modal, Sheet, ConfirmDialog, Toast, Skeleton, KeyValueList, Money, DateTime, Phone, Icon (Lucide). Typed props, keyboard/aria, every state, no hard-coded colours.
5. **Shells.**
   - `AdminShell`: sidebar with SVG icons grouped by section, top bar, drawer on mobile, breadcrumb slot.
   - `StoreShell`: header, category bar that scrolls or collapses on mobile, footer with a fixed grid and a real bottom bar.
   - One brand-name constant used everywhere.
6. **Gallery route `/dev/ui`** (excluded from production builds): every primitive in every state; a DataTable with long ids, long names, Arabic names, zero/negative amounts and 0/1/200 rows; a form; a dialog; an empty state; all in LTR and RTL. Screenshot at 390, 768, 1440 to `docs/ui/shots/foundation/`.
7. **Document.** `docs/ui/DESIGN_SYSTEM.md`: tokens, component catalogue with usage snippets, do/don't, how to add a component.
8. **Verify.** Run `/ui-verify /dev/ui`; fix until PASS.
9. **Stop for human approval, once.** Show the gallery screenshots ("this is the look every page will get"). Apply feedback by changing tokens/primitives, then re-run `/ui-verify /dev/ui`. After approval, tick Phase A in the backlog.
