# 06 — PDF Generation, Print Architecture & Fiscal Layouts

## 1. Commercial Documents Overview & Legal Requirements

Algerian fiscal and commercial regulations require strict document layouts for wholesale trade. The system generates five standardized commercial documents:

| Document Code | Name | Legal Purpose | Format |
| :--- | :--- | :--- | :--- |
| `FAC` | **Facture Fiscale** | Official certified tax invoice. Required for commercial accounting and tax deductions. | A4 Portrait |
| `BL` | **Bon de Livraison** | Delivery voucher accompanying physical shipment. Signed by driver and client. | A4 Portrait |
| `PRO` | **Facture Proforma** | Quotation / proforma invoice issued to clients prior to order confirmation. | A4 Portrait |
| `EXT` | **Extrait de Compte** | Formal customer banking-style ledger statement showing debits, credits, and balance. | A4 Portrait |
| `REC` | **Bon de Caisse / Reçu** | Compact sale receipt for cash counter transactions or store pickup hand-over. | 80mm Thermal / A5 |

---

## 2. Facture Fiscale Anatomy (A4 Specification)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [LOGO]  SARL OUTILLAGE INDUSTRIEL ALGÉRIE                       Date: 04/11/2026 │
│         Zone Industrielle Oued Smar, Lot 14, Alger          Facture N°: FAC-2026-0042 │
│         Tél: +213 21 50 00 00 • Email: contact@store.dz                     │
│         RC: 16/00-1234567B19 • NIF: 001916001234567 • NIS: 123456789012345 │
│         ART: 16120000000 • Capital: 10,000,000 DZD • BNA Rib: 001 00...     │
├─────────────────────────────────────────────────────────────────────────────┤
│ CLIENT:                                                                     │
│ SARL BTP OUTILLAGE ET MATÉRIAUX                      Réf Client: CLT-0042   │
│ Zone Industrielle Dar El Beida, Alger                Tél: 0550 12 34 56     │
│ RC: 16/00-9876543B20 • NIF: 002016009876543 • NIS: 987654321012345        │
│ ART: 16129999999 • Activité: Travaux de Bâtiment et Vente d'Outillage       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Mode de Transport: Camionnette   N° Camion: 01234-116-16   Chauffeur: M. Haddad │
│ Mode de Règlement: Espèce (Soumis au droit de timbre fiscal)                │
├─────┬──────────┬─────────────────────────────┬────┬─────┬───────────┬───────┤
│ N°  │ Réf      │ Désignation                 │ U/M│ Qté │ P.U. HT   │ TVA   │ Montant HT│
├─────┼──────────┼─────────────────────────────┼────┼─────┼───────────┼───────┼───────────┤
│ 01  │ WE-8021  │ Meuleuse d'angle 115mm      │ U  │  10 │  8,500.00 │ 19.0% │ 85,000.00 │
│ 02  │ WE-5011  │ Clé à Choc 20V Brushless    │ U  │   2 │ 24,000.00 │ 19.0% │ 48,000.00 │
├─────┴──────────┴─────────────────────────────┴────┴─────┴───────────┴───────┼───────────┤
│ Arrêté la présente facture à la somme de:                                   │ Total HT: │ 133,000.00│
│ Cent cinquante-neuf mille six cent DZD.                                     │ TVA (19%):│  25,270.00│
│                                                                             │ Timbre:   │   1,330.00│
│                                                                             │ TOTAL TTC:│ 159,600.00│
├──────────────────────────────────────────────┬──────────────────────────────┴───────────┤
│ Visa & Cachet du Client:                     │ Cachet & Signature de l'Émetteur:        │
│                                              │                                          │
└──────────────────────────────────────────────┴──────────────────────────────────────────┘
```

### 2.1 Algerian Timbre Fiscal Formula
The *Droit de Timbre* applies strictly to invoices settled by cash (`ESPECE`). It does not apply to non-cash settlements (Cheque, Bank Wire, Credit):
$$\text{Timbre} = \begin{cases} 0.00 & \text{if payment mode } \ne \text{ESPECE} \\ \min(\max(\text{round}(\text{Total TTC} \times 0.01), 5.00), 10\,000.00) & \text{if payment mode } = \text{ESPECE} \end{cases}$$

### 2.2 French Number-to-Words Conversion
Algerian commercial law requires invoices to spell out the total TTC in French prose.
- Example: `159600.00` → `"cent cinquante-neuf mille six cent dinars algériens"`
- Example with centimes: `12500.50` → `"douze mille cinq cents dinars algériens et 50 centimes"`
The tested utility `frontend/src/utils/numberToWords.ts` (included in `starter-assets/`) implements the full French grammatical rules (handling hyphenation, `vingts`, `cents`, and decimal centimes).

---

## 3. Dual-Generation Architecture: Browser Print + Server PDF

The application supports both client-side printing and server-side PDF generation:

```
                            ┌──────────────────────────────────────────┐
                            │            Document Template             │
                            │       (FactureDocument.vue / HTML)       │
                            └────────────────────┬─────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
       [ In-Browser Fast Print ]                                   [ Server-Side Headless PDF ]
       - Trigger: window.print()                                   - Trigger: GET /api/portal/me/factures/:id/pdf
       - Engine: Browser native print                              - Engine: Puppeteer / Headless Chromium
       - Latency: Instant (0ms server cost)                        - Output: Binary PDF stream / attachment
       - Use: Cashier printing at store counter                    - Use: Email attachment, client portal download
```

---

## 4. Production Print Stylesheet (`print.css`)

The following CSS rules ensure flawless pagination, margin control, and isolation from web chrome during printing:

```css
@media print {
  @page {
    size: A4 portrait;
    margin: 8mm 10mm;
  }

  html, body {
    height: auto !important;
    min-height: auto !important;
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 1. Modal Isolation: Hide entire application except the active print document */
  body:has(.modal-backdrop) #app {
    display: none !important;
  }

  .modal-backdrop {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
    display: block !important;
  }

  .modal-content {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
  }

  /* 2. Hide all non-printable UI chrome */
  header,
  footer:not(.document-footer),
  .sidebar,
  .top-header,
  .no-print,
  button,
  .pagination,
  .alert-banner {
    display: none !important;
  }

  /* 3. Document Layout Containers */
  .printable-document {
    width: 100% !important;
    max-width: 210mm !important;
    margin: 0 auto !important;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    font-size: 11px !important;
    line-height: 1.35 !important;
    color: #000000 !important;
  }

  /* 4. Table Pagination & Header Repeating */
  .printable-table {
    width: 100% !important;
    border-collapse: collapse !important;
    page-break-inside: auto !important;
  }

  .printable-table thead {
    display: table-header-group !important; /* Repeats table headers across page breaks */
  }

  .printable-table tr {
    page-break-inside: avoid !important;
    page-break-after: auto !important;
  }

  .printable-table th,
  .printable-table td {
    border: 1px solid #737373 !important;
    padding: 4px 6px !important;
  }

  /* 5. Keep Totals and Signatures intact */
  .document-summary,
  .document-signatures {
    page-break-inside: avoid !important;
  }
}
```

---

## 5. Server-Side Headless Chromium Service (`pdf.service.ts`)

For backend PDF streaming:

```typescript
import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '8mm',
        right: '10mm',
        bottom: '8mm',
        left: '10mm'
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
```

