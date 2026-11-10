# Antigravity UI kit: how to use it

## Install (2 minutes)
1. Unzip into the ROOT of your project so you get `.agents/rules/` and `.agents/workflows/`.
2. Do not add `.agents/` to `.gitignore` (Antigravity must be able to index it). To keep it private use `.git/info/exclude`.
3. In Antigravity open Customizations. Rules: `ui-contract` must be "Always On". Workflows: you should see /ui-audit, /ui-foundation, /ui-fix-page, /ui-verify, /ui-lesson.
4. If your version reads the singular `.agent/` folder, put the same two folders there. Each file must stay under 12,000 characters.
5. Allow the agent to use the browser (it needs to open localhost and take screenshots) and use Planning mode so it produces plans and screenshot artifacts.

## Run order (you only review, you do not write per-page instructions)
1. **Audit** - paste:
   > Read .agents/rules/ui-contract.md fully. Run /ui-audit on the whole app (storefront and /admin). Do not change source code yet. Show me the top root causes, the page list and your proposed order. Verify these seed findings too: native unstyled buttons/inputs on /admin/orders, /admin/factures (and its modal) and the client ledger; emoji used as icons (sidebar, pills, buttons, product placeholders); emoji flags shown as "FR"/"DZ"; mojibake "Soudage & D�coupe Plasma"; tables that wrap ids and amounts ("CMD-2026-/0014", "11 007,50 / DA") and a clipped Actions column on /admin/factures; raw enums PENDING/ACTIVE; "certified" in a French sentence; "DZD" vs "DA"; storefront cards showing purchase price/margin (is it role-gated server-side?); giant product image placeholders; empty footer bottom bar; three different brand names; ~100px empty top padding on admin pages; a zero balance shown in red; ledger running balance that may not reconcile with the KPI cards; duplicate test client rows.
2. **Foundation** - `/ui-foundation`. Review the gallery screenshots once: this is the look every page gets. Ask for changes to tokens/components, not to pages.
3. **Pages** - `/ui-fix-page next 3` (repeat). You review a before/after contact sheet per batch.
4. **Anything wrong?** Do not describe a page fix. Send the screenshot with `/ui-lesson <what is wrong>`: the agent fixes the root cause everywhere and adds a rule so it cannot return.
5. **Before release** - `/ui-verify all`.

## What you keep control of
- The approval of the audit backlog, the foundation gallery, and each batch contact sheet.
- `docs/ui/OUT_OF_SCOPE.md`: data, permission and logic problems the agent found but was told not to touch.
