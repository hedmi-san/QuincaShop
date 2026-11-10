# Technology Stack & UI Architecture Audit

**Project:** QuincaShop / SARL Outillage Industriel Algérie  
**Audit Date:** November 2026  
**Contract Reference:** `.agents/rules/ui-contract.md`

---

## 1. Current Frontend Stack

| Layer | Technology | Version | Location / Entrypoint |
|---|---|---|---|
| **Core Framework** | Vue 3 (Composition API, `<script setup>`) | `3.5.13` | `frontend/src/main.ts`, `App.vue` |
| **Build Tooling** | Vite + `vue-tsc` (TypeScript) | Vite `6.0.7`, TS `5.7.2` | `frontend/vite.config.ts` |
| **State Management** | Pinia | `2.3.0` | `frontend/src/stores/auth.store.ts` |
| **Routing** | Vue Router (Web History mode) | `4.5.0` | `frontend/src/router/index.ts` |
| **HTTP Client** | Axios | `1.7.9` | `frontend/src/services/api.ts` |
| **Internationalization** | Vue I18n | `11.4.18` | `frontend/src/i18n/` (`fr.json`, `ar.json`) |
| **CSS Architecture** | Custom CSS Variables + Scoped CSS | - | `frontend/src/assets/styles/variables.css`, `main.css` |
| **Icon System** | None (Unicode Emoji fallback) | - | Inline emoji in templates |
| **UI Primitive Library**| In-house partial wrappers | - | `frontend/src/components/common/` |

---

## 2. What Exists and Can Be Reused

1. **Routing & Role Guard Infrastructure**:
   - `frontend/src/router/index.ts` provides clean route definitions, metadata (`requiresAuth`, `requiresStaff`, `requiresAdmin`, `requiresActiveClient`), and redirection flows.
2. **Authentication & Session Management**:
   - `useAuthStore` in `frontend/src/stores/auth.store.ts` provides tokens, roles (`ADMIN`, `ACCOUNTANT`, `CLIENT`), client profiles, and notification polling.
3. **i18n Foundation**:
   - `frontend/src/i18n/` supports `fr` and `ar` with document `dir="rtl"` / `dir="ltr"` toggling on the `<html>` root.
4. **Token Definitions (`variables.css`)**:
   - A solid foundation of industrial tokens exists (`--color-primary: #12161a`, amber accent, surface backgrounds, typographic scale, status tones). However, it needs standardization to match the contract and eliminate arbitrary px values in components.
5. **Formatters (`frontend/src/utils/formatters.ts`)**:
   - Core currency, date, and phone formatting helper functions are present, though they need alignment to non-breaking spaces and UI contract rules.

---

## 3. What Is Missing or Defective

1. **SVG Icon Library**:
   - Zero SVG icon packages are currently installed.
   - Emoji characters (`📦`, `📑`, `👥`, `💰`, `📉`, `📊`, `🏪`, `🔔`, `📍`, `📞`, `🕒`, `🔍`, `🛠️`, `⚙️`) and Windows flag glyphs (`🇫🇷`, `🇩🇿`) are rendered directly in DOM nodes.
   - **Remedy:** Add `lucide-vue-next` (contract recommendation) for a uniform, crisp SVG icon set.
2. **Complete Primitive Component System (`components/ui/`)**:
   - Missing required primitives specified in Contract Section 4:
     - `Button`, `Input`, `Select`, `Textarea`, `Combobox`, `DatePicker`, `FormField`
     - `StatusPill`, `Badge`, `Card`, `PageHeader`, `FilterBar`, `DataTable`
     - `EmptyState`, `Modal`, `Sheet`, `ConfirmDialog`, `Toast`, `Skeleton`
     - `KeyValueList`, `Money`, `DateTime`, `Phone`, `Icon`
   - Existing components in `components/common/` (`AppButton`, `AppInput`, `AppTable`) are under-featured, lack accessibility attributes, and are bypassed by almost every page in favor of bare unstyled HTML tags.
3. **Single Source of Truth for Statuses (`lib/status`)**:
   - Enum states (`PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED`, `CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`, `ISSUED`, `VOIDED`) are translated ad-hoc in templates or displayed as raw English uppercase strings.
4. **Layout Shells (`AdminShell`, `StoreShell`)**:
   - Current layouts (`DashboardLayout.vue`, `PublicLayout.vue`) lack unified responsive drawer behavior, have excessive ~100px empty top padding on admin screens, and feature inconsistent brand names and hard-coded inline styles.

