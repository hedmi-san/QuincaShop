# Single-Store Mini ERP & B2B Shop — Foundation Pack

Copy this whole folder into the new repo as `/docs` (or keep it at the repo root). It is the single source of truth to start the project.

| # | File | Content |
| :-- | :--- | :--- |
| 01 | [01-product-spec.md](01-product-spec.md) | Business model, roles, flows, open questions |
| 02 | [02-system-design.md](02-system-design.md) | Architecture, modules, key flows, state machines, conventions, deployment |
| 03 | [03-database.md](03-database.md) + [schema.sql](schema.sql) | Data model, rules, numbering, ledger invariants, indexes, seed |
| 04 | [04-api-contract.md](04-api-contract.md) | Endpoint contract, auth, price-masking rules, error format |
| 05 | [05-ui-design.md](05-ui-design.md) | Design tokens, layouts, page inventory, wireframes, components, i18n/RTL |
| 06 | [06-pdf-and-print.md](06-pdf-and-print.md) | Documents (facture, BL, statement…), print CSS, server PDF generation |
| 07 | [07-security-rbac.md](07-security-rbac.md) | RBAC matrix, threat model, checklist |
| 08 | [08-reuse-guide.md](08-reuse-guide.md) | File-by-file: what to copy / adapt / drop from the old repo |
| 09 | [09-roadmap-and-setup.md](09-roadmap-and-setup.md) | Bootstrap steps, env vars, scripts, roadmap, definition of done, agent rules |
| — | [starter-assets/](starter-assets) | Files copied verbatim from the old repo (theme CSS, number-to-words, formatters, api client, auth middleware, response helper, logo) |

## Bootstrap in 5 steps
1. Create repo; copy this folder to `/docs`; copy `starter-assets/` files per [08-reuse-guide.md](08-reuse-guide.md).
2. `psql -f docs/schema.sql` on a fresh PostgreSQL 15+ DB.
3. Scaffold `backend/` and `frontend/` per [09-roadmap-and-setup.md](09-roadmap-and-setup.md).
4. Resolve the open questions at the end of [01-product-spec.md](01-product-spec.md) (the defaults in these docs are marked **[ASSUMPTION]**).
5. Follow the roadmap phase by phase.

> **Note on 01-product-spec.md:** it is the first draft. Docs 02–09 are more detailed and take precedence where they differ.

