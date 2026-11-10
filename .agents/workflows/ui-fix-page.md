---
description: Fix one page (or the next backlog item) end to end by migrating it to the shared primitives, verifying with screenshots and logging the result. Usage /ui-fix-page /admin/orders (no argument = next backlog item).
---

# /ui-fix-page

Follow the UI contract. Phase A (foundation) must be done. If a primitive you need is missing or wrong, fix it in `components/ui/` (shared), never work around it in the page.

1. **Pick.** The route given, or the first unchecked page in `docs/ui/BACKLOG.md`. Branch `ui/<slug>`.
2. **Baseline.** Screenshot at 390, 768, 1440 to `docs/ui/shots/before/`. Re-read the audit findings for this route.
3. **Plan (short artifact).** Which primitives replace what; layout changes; states to cover; anything touching logic/data (do NOT do it, add it to OUT_OF_SCOPE.md).
4. **Migrate.**
   - Replace native controls, ad-hoc buttons, emoji and inline styles with primitives; delete page CSS the primitives cover.
   - Header: PageHeader (compact, breadcrumb when nested). Filters: FilterBar. Lists: DataTable (one contextual primary action + menu per row; ids/amounts/dates nowrap; numbers right-aligned; mobile cards). Details: KeyValueList + cards. Forms/dialogs: FormField, sticky footer, entity pickers instead of raw ids.
   - Statuses via StatusPill/statusMap; money/date/phone via `lib/format`; all strings via i18n (FR now; AR/EN keys added or flagged); user content in `<bdi dir="auto">`.
   - Storefront pages: compact product cards with price in the first screen of the card, clear price/availability hierarchy, category bar usable on mobile.
5. **States.** Make each reachable: loading, empty, error, long text, 0/1/many rows, validation errors, Arabic content. Use seed or temporary mock data (never commit mock data).
6. **Verify.** Run `/ui-verify <route>`. Fix every FAIL and rerun (max 3 loops). If still failing, stop and explain exactly what blocks it.
7. **Log.** Append to `docs/ui/LOG.md`: route, before/after screenshot paths, issues fixed, primitives used/added, follow-ups. Tick the page in the backlog.
8. **Commit** `ui(<route>): <summary>`.
9. **Batch mode.** For "all" or "next N", repeat for at most 3 pages per run, then stop and show a before/after contact sheet. If you changed a shared primitive, re-screenshot the pages already migrated and flag any regression before continuing.
