import ExcelJS from 'exceljs';
import { query } from '../db/index.js';

export class ReportError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'REPORT_ERROR') {
    super(message);
    this.name = 'ReportError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// =====================================================================
// 1. Executive Dashboard KPIs
// =====================================================================

export async function getDashboardKpis() {
  // 1.1 Today's Revenue & Orders Count
  const todayRes = await query(`
    SELECT
      COALESCE(SUM(total_ttc), 0)::float AS revenue_ttc,
      COALESCE(SUM(subtotal_ht), 0)::float AS revenue_ht,
      COUNT(*)::int AS orders_count
    FROM orders
    WHERE status IN ('DELIVERED', 'COMPLETED')
      AND DATE(created_at) = CURRENT_DATE
  `);
  const today = todayRes.rows[0];

  // 1.2 Month-to-Date Revenue & Orders Count
  const mtdRes = await query(`
    SELECT
      COALESCE(SUM(total_ttc), 0)::float AS revenue_ttc,
      COALESCE(SUM(subtotal_ht), 0)::float AS revenue_ht,
      COUNT(*)::int AS orders_count
    FROM orders
    WHERE status IN ('DELIVERED', 'COMPLETED')
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  `);
  const mtd = mtdRes.rows[0];

  // 1.3 Month-to-Date Payments Received (Versements encaissés)
  const paymentsRes = await query(`
    SELECT COALESCE(SUM(amount), 0)::float AS payments_received
    FROM client_payments
    WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
  `);
  const mtdPayments = paymentsRes.rows[0].payments_received;

  // 1.4 Pending Client Approvals Count
  const pendingClientsRes = await query(`
    SELECT COUNT(*)::int AS pending_count
    FROM clients
    WHERE status = 'PENDING'
  `);
  const pendingClientsCount = pendingClientsRes.rows[0].pending_count;

  // 1.5 Low Stock Alerts Count
  const lowStockRes = await query(`
    SELECT COUNT(*)::int AS low_stock_count
    FROM stock s
    JOIN products p ON p.id = s.product_id
    WHERE p.active = true
      AND (s.physical_quantity - s.reserved_quantity) <= p.min_stock_alert
  `);
  const lowStockCount = lowStockRes.rows[0].low_stock_count;

  // 1.6 Total Outstanding Client Receivables (Total Créances clients)
  const receivablesRes = await query(`
    SELECT
      COALESCE(SUM(current_balance), 0)::float AS total_receivables,
      COUNT(*)::int AS debtor_clients_count
    FROM clients
    WHERE current_balance > 0
  `);
  const totalReceivables = receivablesRes.rows[0].total_receivables;
  const debtorClientsCount = receivablesRes.rows[0].debtor_clients_count;

  // 1.7 Total Inventory Cost Asset Value
  const stockValRes = await query(`
    SELECT COALESCE(SUM(s.physical_quantity * p.purchase_price), 0)::float AS total_inventory_cost
    FROM stock s
    JOIN products p ON p.id = s.product_id
    WHERE p.active = true
  `);
  const totalInventoryCost = stockValRes.rows[0].total_inventory_cost;

  // 1.8 Recent Orders Activity (Last 5 orders)
  const recentOrdersRes = await query(`
    SELECT
      o.id,
      o.order_number,
      o.total_ttc,
      o.status,
      o.created_at,
      c.name AS client_name,
      c.code AS client_code
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    ORDER BY o.created_at DESC
    LIMIT 5
  `);

  return {
    today: {
      revenueTtc: round2(today.revenue_ttc),
      revenueHt: round2(today.revenue_ht),
      ordersCount: today.orders_count,
    },
    monthToDate: {
      revenueTtc: round2(mtd.revenue_ttc),
      revenueHt: round2(mtd.revenue_ht),
      ordersCount: mtd.orders_count,
      paymentsReceived: round2(mtdPayments),
    },
    alerts: {
      pendingClientsCount,
      lowStockCount,
      debtorClientsCount,
    },
    balances: {
      totalReceivables: round2(totalReceivables),
      totalInventoryCost: round2(totalInventoryCost),
    },
    recentOrders: recentOrdersRes.rows,
  };
}

// =====================================================================
// 2. Consolidated Income Statement (P&L / Compte de Résultat)
// =====================================================================

export async function getIncomeStatement(fromStr?: string, toStr?: string) {
  const currentYear = new Date().getFullYear();
  const fromDate = fromStr || `${currentYear}-01-01`;
  const toDate = toStr || `${currentYear}-12-31`;

  // 2.1 Sales Revenue & Tax Breakdown (from delivered/completed orders)
  const salesRes = await query(
    `SELECT
       COALESCE(SUM(subtotal_ht), 0)::float AS total_ht,
       COALESCE(SUM(total_tva), 0)::float AS total_tva,
       COALESCE(SUM(total_ttc), 0)::float AS total_ttc,
       COUNT(*)::int AS orders_count
     FROM orders
     WHERE status IN ('DELIVERED', 'COMPLETED')
       AND DATE(created_at) BETWEEN $1 AND $2`,
    [fromDate, toDate]
  );
  const sales = salesRes.rows[0];

  const timbreRes = await query(
    `SELECT COALESCE(SUM(timbre), 0)::float AS total_timbre
     FROM factures
     WHERE status = 'ISSUED' AND DATE(created_at) BETWEEN $1 AND $2`,
    [fromDate, toDate]
  );
  const totalTimbre = timbreRes.rows[0].total_timbre;

  // 2.2 Credit Notes (Avoirs / Annulations)
  const creditNotesRes = await query(
    `SELECT
       COALESCE(SUM(credit), 0)::float AS total_credit_notes,
       COUNT(*)::int AS credit_notes_count
     FROM client_transactions
     WHERE type = 'CREDIT_NOTE'
       AND DATE(transaction_date) BETWEEN $1 AND $2`,
    [fromDate, toDate]
  );
  const creditNotes = creditNotesRes.rows[0];

  const grossRevenueHT = round2(sales.total_ht);
  const creditNotesTotal = round2(creditNotes.total_credit_notes);
  const netRevenueHT = round2(Math.max(0, grossRevenueHT - creditNotesTotal));
  const revenueTTC = round2(sales.total_ttc);

  // 2.3 Cost of Goods Sold (COGS / Coût d'achat des marchandises vendues)
  const cogsRes = await query(
    `SELECT
       COALESCE(SUM(oi.quantity * p.purchase_price), 0)::float AS cogs
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.status IN ('DELIVERED', 'COMPLETED')
       AND DATE(o.created_at) BETWEEN $1 AND $2`,
    [fromDate, toDate]
  );
  const cogs = round2(cogsRes.rows[0].cogs);

  // 2.4 Gross Commercial Margin
  const grossMargin = round2(netRevenueHT - cogs);
  const grossMarginRate = netRevenueHT > 0 ? round2((grossMargin / netRevenueHT) * 100) : 0;

  // 2.5 Operating Expenses Breakdown (Frais Généraux)
  const expensesRes = await query(
    `SELECT
       category,
       COALESCE(SUM(amount), 0)::float AS category_total,
       COUNT(*)::int AS count
     FROM expenses
     WHERE expense_date BETWEEN $1 AND $2
     GROUP BY category
     ORDER BY category_total DESC`,
    [fromDate, toDate]
  );

  let totalOperatingExpenses = 0;
  const expenseCategories = expensesRes.rows.map((row) => {
    const amount = round2(Number(row.category_total));
    totalOperatingExpenses += amount;
    return {
      category: row.category,
      amount,
      count: row.count,
    };
  });
  totalOperatingExpenses = round2(totalOperatingExpenses);

  // 2.6 Total Payroll (Masse Salariale)
  const payrollRes = await query(
    `SELECT
       COALESCE(SUM(base_salary), 0)::float AS total_base,
       COALESCE(SUM(bonus1), 0)::float AS total_bonus1,
       COALESCE(SUM(bonus2), 0)::float AS total_bonus2,
       COALESCE(SUM(deductions), 0)::float AS total_deductions,
       COALESCE(SUM(total), 0)::float AS total_net,
       COUNT(*)::int AS payslips_count
     FROM salaries
     WHERE period BETWEEN $1 AND $2`,
    [fromDate, toDate]
  );
  const payroll = payrollRes.rows[0];
  const totalPayroll = round2(payroll.total_net);

  // 2.7 Net Operating Profit (Résultat Net d'Exploitation)
  const netProfit = round2(grossMargin - totalOperatingExpenses - totalPayroll);
  const netMarginRate = netRevenueHT > 0 ? round2((netProfit / netRevenueHT) * 100) : 0;

  return {
    period: {
      from: fromDate,
      to: toDate,
    },
    revenue: {
      grossRevenueHT,
      creditNotes: creditNotesTotal,
      netRevenueHT,
      tvaCollected: round2(sales.total_tva),
      timbreFiscal: round2(totalTimbre),
      revenueTTC,
      ordersCount: sales.orders_count,
    },
    cogs: {
      total: cogs,
    },
    grossMargin: {
      amount: grossMargin,
      percentage: grossMarginRate,
    },
    overheadExpenses: {
      total: totalOperatingExpenses,
      categories: expenseCategories,
    },
    payroll: {
      total: totalPayroll,
      baseSalaries: round2(payroll.total_base),
      bonuses: round2(payroll.total_bonus1 + payroll.total_bonus2),
      bonus1Eid: round2(payroll.total_bonus1),
      bonus2Performance: round2(payroll.total_bonus2),
      deductions: round2(payroll.total_deductions),
      payslipsCount: payroll.payslips_count,
    },
    netProfit: {
      amount: netProfit,
      percentage: netMarginRate,
      status: netProfit >= 0 ? 'PROFIT' : 'LOSS',
    },
  };
}

// =====================================================================
// 3. Stock Asset Valuation Report
// =====================================================================

export async function getStockValuation() {
  const sql = `
    SELECT
      p.id,
      p.reference,
      p.name,
      p.brand,
      p.unit,
      p.purchase_price,
      p.sale_price,
      p.min_stock_alert,
      c.name AS category_name,
      COALESCE(s.physical_quantity, 0) AS physical_quantity,
      COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
      COALESCE(s.physical_quantity - s.reserved_quantity, 0) AS available_quantity
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN stock s ON s.product_id = p.id
    WHERE p.active = true
    ORDER BY c.name ASC, p.name ASC
  `;
  const res = await query(sql);

  let totalSkus = 0;
  let totalPhysicalUnits = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;
  let lowStockCount = 0;

  const categoryMap: Record<string, { skus: number; units: number; costValue: number; retailValue: number }> = {};

  const items = res.rows.map((row) => {
    totalSkus++;
    const qty = Number(row.physical_quantity);
    const purchasePrice = Number(row.purchase_price);
    const salePrice = Number(row.sale_price);

    const costVal = round2(qty * purchasePrice);
    const retailVal = round2(qty * salePrice);
    const itemMargin = round2(retailVal - costVal);
    const isLowStock = Number(row.available_quantity) <= Number(row.min_stock_alert);

    totalPhysicalUnits += qty;
    totalCostValue += costVal;
    totalRetailValue += retailVal;
    if (isLowStock) lowStockCount++;

    const cat = row.category_name || 'Non classé';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { skus: 0, units: 0, costValue: 0, retailValue: 0 };
    }
    categoryMap[cat].skus++;
    categoryMap[cat].units += qty;
    categoryMap[cat].costValue = round2(categoryMap[cat].costValue + costVal);
    categoryMap[cat].retailValue = round2(categoryMap[cat].retailValue + retailVal);

    return {
      id: row.id,
      reference: row.reference,
      name: row.name,
      brand: row.brand,
      unit: row.unit,
      category: cat,
      purchasePrice,
      salePrice,
      physicalQuantity: qty,
      reservedQuantity: Number(row.reserved_quantity),
      availableQuantity: Number(row.available_quantity),
      minStockAlert: Number(row.min_stock_alert),
      costValue: costVal,
      retailValue: retailVal,
      unrealizedMargin: itemMargin,
      isLowStock,
    };
  });

  totalCostValue = round2(totalCostValue);
  totalRetailValue = round2(totalRetailValue);
  const totalPotentialMargin = round2(totalRetailValue - totalCostValue);

  const categories = Object.keys(categoryMap).map((catName) => ({
    name: catName,
    ...categoryMap[catName],
  }));

  return {
    summary: {
      totalSkus,
      totalPhysicalUnits,
      totalCostValue,
      totalRetailValue,
      totalPotentialMargin,
      potentialMarginRate: totalRetailValue > 0 ? round2((totalPotentialMargin / totalRetailValue) * 100) : 0,
      lowStockCount,
    },
    categories,
    items,
  };
}

// =====================================================================
// 4. Aging Receivables Report (Balance Âgée)
// =====================================================================

export async function getAgingReceivables() {
  // Query all clients with an outstanding debit balance
  const clientRes = await query(`
    SELECT
      c.id,
      c.code,
      c.name,
      c.phone,
      c.wilaya,
      c.credit_limit,
      c.current_balance,
      c.status
    FROM clients c
    WHERE c.current_balance > 0
    ORDER BY c.current_balance DESC
  `);

  let totalDebt = 0;
  let totalCreditLimit = 0;
  let total0to30 = 0;
  let total31to60 = 0;
  let total61to90 = 0;
  let total90Plus = 0;

  const clientsWithAging = await Promise.all(
    clientRes.rows.map(async (client) => {
      const balance = Number(client.current_balance);
      const limit = Number(client.credit_limit);
      totalDebt += balance;
      totalCreditLimit += limit;

      // Fetch client's debit transactions to age the debt
      const txRes = await query(
        `SELECT
           transaction_date,
           debit,
           (CURRENT_DATE - DATE(transaction_date))::int AS days_old
         FROM client_transactions
         WHERE client_id = $1 AND debit > 0
         ORDER BY transaction_date DESC`,
        [client.id]
      );

      // FIFO Debt Bucket Allocation:
      // Allocate the current outstanding balance across recent debit events
      let remaining = balance;
      let b0to30 = 0;
      let b31to60 = 0;
      let b61to90 = 0;
      let b90Plus = 0;

      for (const tx of txRes.rows) {
        if (remaining <= 0) break;
        const debitAmt = Number(tx.debit);
        const allocated = Math.min(remaining, debitAmt);
        const days = tx.days_old;

        if (days <= 30) {
          b0to30 += allocated;
        } else if (days <= 60) {
          b31to60 += allocated;
        } else if (days <= 90) {
          b61to90 += allocated;
        } else {
          b90Plus += allocated;
        }

        remaining -= allocated;
      }

      // If there's any remaining balance not covered by individual debit records, assign to 90+
      if (remaining > 0) {
        b90Plus += remaining;
      }

      b0to30 = round2(b0to30);
      b31to60 = round2(b31to60);
      b61to90 = round2(b61to90);
      b90Plus = round2(b90Plus);

      total0to30 += b0to30;
      total31to60 += b31to60;
      total61to90 += b61to90;
      total90Plus += b90Plus;

      const utilization = limit > 0 ? round2((balance / limit) * 100) : 100;
      const riskLevel = b90Plus > 0 ? 'HIGH' : (b61to90 > 0 ? 'MEDIUM' : 'NORMAL');

      return {
        id: client.id,
        code: client.code,
        name: client.name,
        phone: client.phone,
        wilaya: client.wilaya,
        creditLimit: limit,
        currentBalance: balance,
        availableCredit: round2(Math.max(0, limit - balance)),
        utilizationRate: utilization,
        riskLevel,
        aging: {
          current0to30: b0to30,
          days31to60: b31to60,
          days61to90: b61to90,
          over90Days: b90Plus,
        },
      };
    })
  );

  totalDebt = round2(totalDebt);
  totalCreditLimit = round2(totalCreditLimit);

  return {
    summary: {
      totalDebt,
      totalCreditLimit,
      globalUtilizationRate: totalCreditLimit > 0 ? round2((totalDebt / totalCreditLimit) * 100) : 0,
      debtorCount: clientsWithAging.length,
      buckets: {
        current0to30: round2(total0to30),
        days31to60: round2(total31to60),
        days61to90: round2(total61to90),
        over90Days: round2(total90Plus),
      },
    },
    clients: clientsWithAging,
  };
}

// =====================================================================
// 5. Excel Spreadsheet (.xlsx) Generator
// =====================================================================

export async function generateExcelReport(reportType: 'income-statement' | 'stock-valuation' | 'receivables', params?: any): Promise<{ buffer: Buffer; filename: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quinca ERP';
  workbook.created = new Date();

  const primaryHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate dark
  };
  const primaryHeaderFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 11,
  };

  if (reportType === 'income-statement') {
    const data = await getIncomeStatement(params?.from, params?.to);
    const sheet = workbook.addWorksheet('Compte de Résultat');

    // Title Block
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'QUINCAILLERIE CENTRALE EL-EULMA • COMPTE DE RÉSULTAT (P&L)';
    sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF0F172A' } };

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = `Période du ${data.period.from} au ${data.period.to} • Édité le ${new Date().toLocaleDateString('fr-DZ')}`;
    sheet.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF64748B' } };

    sheet.addRow([]);

    // Headers
    const headerRow = sheet.addRow(['RUBRIQUE FINANCIÈRE', 'MONTANT (DZD)', 'TAUX / RATIO', 'COMMENTAIRES']);
    headerRow.eachCell((cell) => {
      cell.fill = primaryHeaderFill;
      cell.font = primaryHeaderFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const rows = [
      ['CHIFFRE D\'AFFAIRES BRUT (HT)', data.revenue.grossRevenueHT, '100.00 %', `${data.revenue.ordersCount} commandes facturées`],
      ['Moins : Avoirs & Annulations', -data.revenue.creditNotes, '', 'Notes de crédit / avoirs émis'],
      ['CHIFFRE D\'AFFAIRES NET (HT)', data.revenue.netRevenueHT, '100.00 %', 'Base de marge commerciale'],
      ['COÛT D\'ACHAT DES MARCHANDISES (COGS)', -data.cogs.total, `${data.revenue.netRevenueHT > 0 ? ((data.cogs.total / data.revenue.netRevenueHT) * 100).toFixed(1) : 0} %`, 'Prix d\'achat fournisseur des articles vendus'],
      ['MARGE BRUTE COMMERCIALE', data.grossMargin.amount, `${data.grossMargin.percentage} %`, 'Marge sur vente de marchandises'],
      ['FRAIS GÉNÉRAUX D\'EXPLOITATION', -data.overheadExpenses.total, '', `${data.overheadExpenses.categories.length} catégories de charges`],
    ];

    for (const cat of data.overheadExpenses.categories) {
      rows.push([`  • Dont ${cat.category}`, -cat.amount, '', `${cat.count} opération(s)`]);
    }

    rows.push(
      ['MASSE SALARIALE & CHARGES PERSONNEL', -data.payroll.total, '', `${data.payroll.payslipsCount} bulletin(s) de paie`],
      ['  • Dont Salaires de base', -data.payroll.baseSalaries, '', 'Salaires contractuels'],
      ['  • Dont Primes de l\'Aïd & Fêtes', -data.payroll.bonus1Eid, '', 'Bonus exceptionnels Aïd'],
      ['  • Dont Primes de Rendement', -data.payroll.bonus2Performance, '', 'Primes de productivité'],
      ['  • Moins : Retenues & Avances', data.payroll.deductions, '', 'Avances déduites'],
      ['RÉSULTAT NET D\'EXPLOITATION', data.netProfit.amount, `${data.netProfit.percentage} %`, data.netProfit.status === 'PROFIT' ? 'Bénéfice Net Réalisé' : 'Déficit d\'Exploitation']
    );

    for (const r of rows) {
      const added = sheet.addRow(r);
      added.getCell(2).numFmt = '#,##0.00 "DZD"';
    }

    // Auto-fit widths
    sheet.columns = [
      { width: 45 },
      { width: 22 },
      { width: 16 },
      { width: 45 },
    ];

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filename: `Compte_Resultat_PL_${data.period.from}_${data.period.to}.xlsx` };
  }

  if (reportType === 'stock-valuation') {
    const data = await getStockValuation();
    const sheet = workbook.addWorksheet('Valorisation Stock');

    // Title Block
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'QUINCAILLERIE CENTRALE EL-EULMA • VALORISATION DES ACTIFS EN STOCK';
    sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF0F172A' } };

    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = `Total Unités Physiques : ${data.summary.totalPhysicalUnits} • Valeur Coût d'Achat : ${data.summary.totalCostValue.toLocaleString('fr-DZ')} DZD • Édité le ${new Date().toLocaleDateString('fr-DZ')}`;
    sheet.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF64748B' } };

    sheet.addRow([]);

    const headerRow = sheet.addRow([
      'RÉFÉRENCE',
      'DÉSIGNATION ARTICLE',
      'RAYON / CATÉGORIE',
      'QUANTITÉ PHYSIQUE',
      'PRIX ACHAT (DZD)',
      'PRIX VENTE (DZD)',
      'VALORISATION AU COÛT (DZD)',
    ]);
    headerRow.eachCell((cell) => {
      cell.fill = primaryHeaderFill;
      cell.font = primaryHeaderFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    for (const it of data.items) {
      const row = sheet.addRow([
        it.reference,
        it.name,
        it.category,
        it.physicalQuantity,
        it.purchasePrice,
        it.salePrice,
        it.costValue,
      ]);
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(7).numFmt = '#,##0.00 "DZD"';
    }

    // Totals row
    const totalsRow = sheet.addRow([
      'TOTAL GÉNÉRAL',
      '',
      '',
      data.summary.totalPhysicalUnits,
      '',
      '',
      data.summary.totalCostValue,
    ]);
    totalsRow.font = { bold: true };
    totalsRow.getCell(4).numFmt = '#,##0';
    totalsRow.getCell(7).numFmt = '#,##0.00 "DZD"';

    sheet.columns = [
      { width: 18 },
      { width: 42 },
      { width: 22 },
      { width: 20 },
      { width: 18 },
      { width: 18 },
      { width: 26 },
    ];

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filename: `Valorisation_Stock_${new Date().toISOString().substring(0, 10)}.xlsx` };
  }

  if (reportType === 'receivables') {
    const data = await getAgingReceivables();
    const sheet = workbook.addWorksheet('Balance Âgée Créances');

    // Title Block
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = 'QUINCAILLERIE CENTRALE EL-EULMA • BALANCE ÂGÉE DES CRÉANCES CLIENTS';
    sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF0F172A' } };

    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = `Total Créances en cours : ${data.summary.totalDebt.toLocaleString('fr-DZ')} DZD (${data.summary.debtorCount} clients débiteurs) • Édité le ${new Date().toLocaleDateString('fr-DZ')}`;
    sheet.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF64748B' } };

    sheet.addRow([]);

    const headerRow = sheet.addRow([
      'CODE CLIENT',
      'RAISON SOCIALE / CLIENT',
      'TÉLÉPHONE',
      'PLAFOND CRÉDIT',
      'TOTAL DETTE (DZD)',
      '0 - 30 JOURS',
      '31 - 60 JOURS',
      '61 - 90 JOURS',
      '+ 90 JOURS (CONTENTIEUX)',
    ]);
    headerRow.eachCell((cell) => {
      cell.fill = primaryHeaderFill;
      cell.font = primaryHeaderFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    for (const c of data.clients) {
      const row = sheet.addRow([
        c.code || `CLT-${c.id}`,
        c.name,
        c.phone || '',
        c.creditLimit,
        c.currentBalance,
        c.aging.current0to30,
        c.aging.days31to60,
        c.aging.days61to90,
        c.aging.over90Days,
      ]);
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00 "DZD"';
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(8).numFmt = '#,##0.00';
      row.getCell(9).numFmt = '#,##0.00';
    }

    // Totals row
    const totalsRow = sheet.addRow([
      'TOTAL CRÉANCES',
      '',
      '',
      data.summary.totalCreditLimit,
      data.summary.totalDebt,
      data.summary.buckets.current0to30,
      data.summary.buckets.days31to60,
      data.summary.buckets.days61to90,
      data.summary.buckets.over90Days,
    ]);
    totalsRow.font = { bold: true };
    totalsRow.getCell(4).numFmt = '#,##0.00';
    totalsRow.getCell(5).numFmt = '#,##0.00 "DZD"';
    totalsRow.getCell(6).numFmt = '#,##0.00';
    totalsRow.getCell(7).numFmt = '#,##0.00';
    totalsRow.getCell(8).numFmt = '#,##0.00';
    totalsRow.getCell(9).numFmt = '#,##0.00';

    sheet.columns = [
      { width: 16 },
      { width: 35 },
      { width: 16 },
      { width: 18 },
      { width: 22 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 25 },
    ];

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filename: `Balance_Agee_Creances_${new Date().toISOString().substring(0, 10)}.xlsx` };
  }

  throw new ReportError(`Type de rapport inconnu: ${reportType}`, 400, 'INVALID_REPORT_TYPE');
}
