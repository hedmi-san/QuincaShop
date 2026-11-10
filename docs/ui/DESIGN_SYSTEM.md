# QuincaShop Design System & UI Primitive Catalogue

**Specification Version:** 1.0.0 (Foundation)  
**Contract Baseline:** `.agents/rules/ui-contract.md`  
**Living Gallery:** `/dev/ui`

---

## 1. Design Tokens

All tokens are defined in `frontend/src/assets/styles/variables.css`. Hex literals, pixel font sizes outside tokens, or arbitrary shadows outside tokens are strictly blacklisted.

### 1.1 Named Palette
- `--color-ink`: `#0f172a` (Primary technical text, high contrast)
- `--color-surface`: `#ffffff` (Card, input, dialog surface)
- `--color-subtle`: `#f8fafc` (Muted canvas background, alternating table rows)
- `--color-line`: `#e2e8f0` (Machined border seams)
- `--color-brand`: `#12161a` (Admin sidebar, dark navigation bar)
- `--color-accent`: `#d97706` (Safety cadmium amber accent from physical logo)

### 1.2 Semantic Tones (Contrast >= 4.5:1)
- **Success:** `--color-success-text` (`#166534`) on `--color-success-tint` (`#f0fdf4`) with border `--color-success-border` (`#bbf7d0`)
- **Warning:** `--color-warning-text` (`#92400e`) on `--color-warning-tint` (`#fffbeb`) with border `--color-warning-border` (`#fde68a`)
- **Danger:** `--color-danger-text` (`#991b1b`) on `--color-danger-tint` (`#fef2f2`) with border `--color-danger-border` (`#fecaca`)
- **Info:** `--color-info-text` (`#075985`) on `--color-info-tint` (`#f0f9ff`) with border `--color-info-border` (`#bae6fd`)

### 1.3 Control Radii & Heights
- Controls (Buttons, Inputs, Selects): `var(--radius-control)` = `8px`
- Cards: `var(--radius-card)` = `12px`
- Modals & Dialogs: `var(--radius-dialog)` = `16px`
- Status Pills & Chips: `var(--radius-pill)` = `999px`
- Control Heights:
  - Dense (tables, compact bars): `36px` (`--height-control-dense`)
  - Default (standard forms): `40px` (`--height-control-default`)
  - Touch (mobile targets): `44px` (`--height-control-touch`)

---

## 2. Component Catalogue & Usage

### 2.1 `<Icon>`
Wraps `lucide-vue-next` with standard size and `currentColor`.
```vue
<Icon name="package" :size="18" />
<Icon name="loader-2" :size="18" spin />
```

### 2.2 `<Button>`
Industrial action button with variants (`primary`, `secondary`, `ghost`, `danger`) and loading state.
```vue
<Button variant="primary" icon="plus" @click="handleCreate">
  Nouvelle Facture
</Button>

<Button variant="ghost" size="dense" icon="printer" icon-only aria-label="Imprimer" />
```

### 2.3 `<Input>`, `<Select>`, `<Textarea>`, `<FormField>`
Styled form controls with consistent label, error, and helper presentation.
```vue
<FormField label="Numéro NIF" required :error="errors.nif" helper="15 chiffres obligatoires">
  <Input v-model="form.nif" placeholder="0016..." prefix-icon="file-text" clearable />
</FormField>

<FormField label="Statut">
  <Select v-model="form.status" :options="statusOptions" />
</FormField>
```

### 2.4 `<StatusPill>`
Maps every enum string to localized French/Arabic text and semantic tone.
```vue
<StatusPill status="ACTIVE" />
<StatusPill status="PENDING" />
<StatusPill status="VOIDED" />
```

### 2.5 `<Money>`, `<DateTime>`, `<Phone>`
Precision financial and timestamp formatters enforcing contract rules (non-breaking spaces, tabular numbers, `dir="ltr"`).
```vue
<Money :amount="11007.50" />                      <!-- "11 007,50 DA" -->
<Money :amount="0" />                             <!-- "0,00 DA" (neutral, never red) -->
<Money :amount="-83598" highlight-negative />     <!-- "-83 598,00 DA" (red alert) -->
<DateTime :value="invoice.created_at" include-time />
<Phone :value="client.phone" link />
```

### 2.6 `<DataTable>`
Responsive table with sticky header, nowrap IDs/amounts, mobile card mode (`<= 768px`), and loading/empty states.
```vue
<DataTable
  :columns="columns"
  :data="factures"
  :current-page="page"
  :total-pages="totalPages"
  @page-change="onPageChange"
>
  <template #cell-actions="{ row }">
    <Button variant="ghost" size="dense" icon="eye" icon-only aria-label="Voir" />
  </template>
</DataTable>
```

### 2.7 `<Modal>` & `<ConfirmDialog>`
Accessible dialogs with focus trap, Esc/backdrop dismissal, and mobile sheet transformation (`<= 640px`).
```vue
<ConfirmDialog
  :open="showCancelConfirm"
  title="Annulation de Facture"
  message="Êtes-vous certain de vouloir annuler cette facture ? Un avoir sera automatiquement généré."
  entity-name="FAC-2026-0004"
  require-reason
  is-destructive
  @confirm="handleConfirmCancel"
  @cancel="showCancelConfirm = false"
/>
```

---

## 3. Do's and Don'ts

| Do | Don't |
|---|---|
| Use `<Button>`, `<Input>`, `<Select>` primitives | Use bare unstyled `<button>`, `<input>`, `<select>` tags |
| Use `<StatusPill :status="code">` | Render raw strings like `<span>{{ client.status }}</span>` |
| Use `<Money :amount="val">` or `formatMoney(val)` | Concatenate numbers with strings `val + ' DZD'` |
| Use `dir="ltr"` on phone numbers and codes | Let phone numbers break or reverse in RTL |
| Use sentence case ("Enregistrer la facture") | Use ALL-CAPS uppercase headers or "→" on buttons |
| Render 0,00 DA in neutral text | Color 0,00 DA in bright red |

---

## 4. How to Add a New Primitive
1. Create `src/components/ui/NewPrimitive.vue`.
2. Adhere to tokens in `variables.css` (no hex codes, no fixed pixel sizes).
3. Export from `src/components/ui/index.ts`.
4. Add a sample card demonstrating all states in `src/views/dev/UiGalleryView.vue`.
5. Run `/ui-verify /dev/ui` to guarantee 0 regressions across all 6 viewports.

