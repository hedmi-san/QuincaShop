# 05 — UI Design System, Component Library & Page Inventory

## 1. Architectural Monochromatic Design System

The application inherits the high-contrast **Architectural Monochromatic Theme** designed for industrial clarity, clean desktop rendering, and high-legibility terminal operations.

### 1.1 Design Tokens (`variables.css`)

```css
:root {
  /* Color System */
  --color-primary: #171717;
  --color-primary-hover: #262626;
  --color-primary-active: #000000;
  
  --color-bg: #ffffff;
  --color-bg-subtle: #fafafa;
  --color-surface: #f3f3f3;
  --color-surface-hover: #ebebeb;
  
  --color-text-primary: rgba(23, 23, 23, 0.95);
  --color-text-secondary: rgba(124, 124, 124, 0.85);
  --color-text-tertiary: rgba(180, 180, 180, 0.90);
  --color-text-inverse: #ffffff;
  
  --color-border: #ededed;
  --color-border-subtle: #f5f5f5;
  --color-border-dark: #d4d4d4;

  /* Semantic Alerts */
  --color-success: #278f5e;
  --color-success-bg: #e4f5e9;
  --color-warning: #ab6e05;
  --color-warning-bg: #fffcef;
  --color-danger: #cc2929;
  --color-danger-bg: #fff7f7;
  --color-info: #0070cc;
  --color-info-bg: #f7fbfd;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;

  /* Geometry & Spacing */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

---

## 2. Layout Structure

### 2.1 Public Storefront Layout (`PublicLayout.vue`)
- **Top Announcement Bar:** Store physical address, contact telephone, and store operating hours.
- **Main Header:**
  - Company Brand Logo.
  - Search Input with instantaneous debounced autocomplete (`pg_trgm`).
  - Right Controls: Language Switcher (`FR` / `AR`), "Se Connecter" / "Créer un Compte" or "Espace B2B".
- **Category Navigation Ribbon:** Horizontal scrolling pills of primary hardware categories (e.g. *Outillage Électroportatif, Outillage Manuel, Soudure, Manutention, Équipement de Protection*).
- **Footer:** Formal company legal coordinates (RC, NIF, ART), Google Maps location link, download catalog PDF button.

### 2.2 Client Portal Layout (`PortalLayout.vue`)
- **Client Header Bar:**
  - Active Client Account Badge (`CLT-0042 • SARL BTP Outillage`).
  - Financial Quick-Pill: Shows real-time outstanding balance (*Solde: 42,500.00 DZD*) and remaining credit line.
  - Cart Counter with animated badge.
- **Portal Tab Navigation:**
  - `Catalogue & Prix` (B2B shop view with wholesale pricing).
  - `Mon Panier` (Cart & checkout).
  - `Mes Commandes` (Real-time order tracking).
  - `Mon Extrait de Compte` (Statement of account).
  - `Mes Factures` (Official fiscal invoices archive).
- **Pending Account Banner:** If a client logs in while `status === 'PENDING'`, all navigation links except "Mon Profil" and "Support" are disabled, and a sticky warning banner explains:
  > *"Votre compte est en cours de validation par notre service commercial. Vous serez notifié par email dès activation de vos accès tarifaires."*

### 2.3 Back-Office Administrative Layout (`DashboardLayout.vue`)
- **Collapsible Sidebar Navigation:**
  - **Overview:** Dashboard KPIs.
  - **Commercial:** File d'attente clients (with pending badge count), Clients & Soldes, Commandes & Ventes.
  - **Stock & Catalogue:** Catalogue Produits, Niveaux de Stock & Mouvements, Réceptions Fournisseurs.
  - **Finance & Facturation:** Factures Fiscales, Bons de Livraison, Versements & Paiements, Dépenses Générales.
  - **Ressources Humaines (Admin only):** Registre des Employés, Gestion de la Paie.
  - **Rapports & Audit (Admin only):** Compte de Résultat (P&L), Valorisation du Stock, Balance Âgée, Journal d'Audit.
  - **Configuration (Admin only):** Paramètres Société, Utilisateurs Système.
- **Header:** Notification Bell (dropdown showing unread alerts), User profile avatar, Logout button.

---

## 3. Detailed Page Inventory & Wireframe Guides

### 3.1 Public Product Showcase (`/` and `/products/:slug`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Logo]       [Rechercher un produit, référence, marque...]     [Connexion] │
├────────────────────────────────────────────────────────────────────────────┤
│ [Tous] [Perceuses] [Meuleuses] [Postes à Souder] [Clés & Douilles]         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  [PHOTO WE-8021] │  │  [PHOTO WE-9040] │  │  [PHOTO WE-5011] │          │
│  │                  │  │                  │  │                  │          │
│  │ WEHAND           │  │ WEHAND           │  │ WEHAND           │          │
│  │ Meuleuse 115mm   │  │ Marteau Piqueur  │  │ Clé à Choc Sans  │          │
│  │ Réf: WE-8021     │  │ Réf: WE-9040     │  │ Réf: WE-5011     │          │
│  │                  │  │                  │  │                  │          │
│  │ [✓ En Stock]     │  │ [✓ En Stock]     │  │ [✕ Rupture]      │          │
│  │                  │  │                  │  │                  │          │
│  │ [Connectez-vous  │  │ [Connectez-vous  │  │ [Connectez-vous  │          │
│  │  pour voir prix] │  │  pour voir prix] │  │  pour voir prix] │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Zero Price Disclosure:** Note that no prices, no cart buttons, and no exact stock counts appear. Clicking "Connectez-vous pour voir les prix" redirects to `/login?redirect=/products/we-8021`.

### 3.2 B2B Client Ordering & Shopping Cart (`/portal/cart`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ MON PANIER B2B (3 articles sélectionnés)                                   │
├────────────────────────────────────────────────────────────────────────────┤
│ Article                    Prix Unit. HT    Quantité     TVA      Total HT │
│ ────────────────────────────────────────────────────────────────────────── │
│ Meuleuse d'angle 115mm       8,500.00 DZD   [ - 10 + ]   19%    85,000 DZD │
│ Réf: WE-8021 (Boîte de 10)                                                 │
│                                                                            │
│ Clé à Choc 20V Brushless    24,000.00 DZD   [ -  2 + ]   19%    48,000 DZD │
│ Réf: WE-5011                                                               │
├────────────────────────────────────────────────────────────────────────────┤
│ Mode de Retrait / Livraison:                                               │
│ (●) Retrait au Magasin Central (Gratuit)                                   │
│ ( ) Livraison par Transporteur (Adresse client)                            │
│                                                                            │
│ Mode de Règlement Souhaité:                                                │
│ (●) À Crédit (Débité sur compte client - Solde dispo: 500,000 DZD)         │
│ ( ) Espèce au retrait                                                      │
│ ( ) Chèque à la livraison / Virement                                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                        Total Hors Taxes (HT):  133,000 DZD │
│                                        Montant TVA (19%):       25,270 DZD │
│                                        TOTAL À PAYER (TTC):    158,270 DZD │
│                                                                            │
│                                        [ CONFIRMER MA COMMANDE (CMD) ]     │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Visual Order Milestone Tracker (`/portal/orders/:id`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ COMMANDE N° CMD-2026-0042                               [Télécharger Bon]  │
│ Date: 04 Nov 2026 • Mode: Retrait en Magasin • Règlement: À Crédit        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│    (●)──────────────(●)──────────────(●)──────────────( )──────────────( ) │
│  En Attente      Confirmée       En Préparation      Prête          Livrée │
│  04/11 10:15    04/11 11:30       04/11 14:00                              │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ Journal des Statuts:                                                       │
│ • 04/11 14:00 - Commande en cours de préparation en magasin (Rayon B3).   │
│ • 04/11 11:30 - Commande confirmée par service comptable. Stock réservé.   │
│ • 04/11 10:15 - Commande soumise par le client via le portail B2B.        │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Administrative Client Approval Queue (`/admin/clients/pending`)

- Table displaying applicants: `Date d'inscription`, `Société`, `Responsable`, `Wilaya`, `Téléphone`, `Documents Fournis`.
- Clicking a client opens a review drawer:
  - Displays submitted RC, NIF, ART numbers.
  - Thumbnails of uploaded registry scans (click to open high-res PDF or modal preview).
  - Actions:
    - **Valider le Compte:** Dialog asks to specify `Code Client` (suggests `CLT-0045`) and `Plafond de Crédit (DZD)`.
    - **Rejeter la Demande:** Dialog requires entering an explanation sent to the user.

---

## 4. Reusable Component Specifications

All common components reside in `frontend/src/components/common/`:

| Component | Props | Purpose |
| :--- | :--- | :--- |
| `AppButton.vue` | `variant: 'primary' \| 'secondary' \| 'danger' \| 'outline'`, `size: 'sm' \| 'md' \| 'lg'`, `loading: boolean`, `disabled: boolean` | High-contrast action button with loading spinner. |
| `AppInput.vue` | `modelValue`, `label`, `error`, `type`, `placeholder`, `disabled`, `readonly` | Standardized text/number input with validation errors. |
| `AppTable.vue` | `columns: ColumnDef[]`, `items: any[]`, `loading: boolean`, `emptyText: string` | Dense data table with sortable columns and responsive scroll. |
| `AppModal.vue` | `isOpen: boolean`, `title: string`, `maxWidth: 'sm' \| 'md' \| 'lg' \| 'xl'` | Accessible modal dialog with keyboard ESC and focus lock. |
| `AppBadge.vue` | `variant: 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'`, `text: string` | Desaturated status pill. |
| `AppPagination.vue` | `page: number`, `pageSize: number`, `total: number` | Clean numeric page navigator. |
| `ConfirmDialog.vue`| `title: string`, `message: string`, `confirmText: string`, `danger: boolean` | Modal confirmation guard for deletions, voids, and cancellations. |
| `AppProductCombobox.vue`| `v-model:productId`, `excludeZeroStock: boolean` | Searchable product selector with instant thumbnail and reference lookup. |
| `AppClientCombobox.vue` | `v-model:clientId`, `showBalance: boolean` | Searchable client selector with balance indicator. |

---

## 5. Internationalization & Right-to-Left (RTL) Support

The target Algerian commercial market requires native support for **French (`fr`)** (dominant business language) and **Arabic (`ar`)** (legal & commercial language):

- Built with `vue-i18n` (v9+).
- Dynamic document direction toggling:
  ```typescript
  // i18n switcher
  function setLocale(lang: 'fr' | 'ar') {
    i18n.global.locale.value = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }
  ```
- CSS styling utilizes CSS logical properties (`margin-inline-start`, `padding-inline-end`, `border-inline-start`) instead of directional `left`/`right` properties to ensure automatic RTL layout mirroring.

