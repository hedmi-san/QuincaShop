process.env.NODE_ENV = 'test';

import { createServer } from 'http';
import { query } from '../db/index.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase8Tests() {
  console.log('\n======================================================');
  console.log('--- STARTING PHASE 8 END-TO-END VERIFICATION SUITE ---');
  console.log('======================================================\n');

  const { app } = await import('../server.js');

  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test API Server running on ${baseUrl}\n`);

  try {
    // -----------------------------------------------------------------
    // Step 1: Authentication & Role Verification
    // -----------------------------------------------------------------
    console.log('[Step 1] Authenticating ADMIN and ACCOUNTANT users...');

    // Login as Admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@store.local',
        password: 'StrongPassword2026!',
      }),
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeded with 200 OK');
    const adminToken = ((await adminLoginRes.json()) as any).data.token;
    assert(!!adminToken, 'Admin received valid JWT token');

    // Login as Accountant
    const accountantLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'accountant@store.local',
        password: 'StrongPassword2026!',
      }),
    });
    assert(accountantLoginRes.status === 200, 'Accountant login succeeded with 200 OK');
    const accountantToken = ((await accountantLoginRes.json()) as any).data.token;
    assert(!!accountantToken, 'Accountant received valid JWT token');

    // -----------------------------------------------------------------
    // Step 2: RBAC Security Isolation (Accountant lockout from reports)
    // -----------------------------------------------------------------
    console.log('\n[Step 2] Testing RBAC Security Isolation for Business Intelligence...');

    const rbacEndpoints = [
      '/admin/reports/dashboard',
      '/admin/reports/income-statement',
      '/admin/reports/stock-valuation',
      '/admin/reports/receivables',
      '/admin/reports/export?report=income-statement',
    ];

    for (const ep of rbacEndpoints) {
      const res = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${accountantToken}` },
      });
      assert(
        res.status === 403,
        `Accountant access to ${ep} blocked with 403 Forbidden`
      );
    }
    console.log('RBAC verified: ACCOUNTANT is strictly prevented from Executive BI, COGS, Margins, and P&L.\n');

    // -----------------------------------------------------------------
    // Step 3: Executive Dashboard KPIs
    // -----------------------------------------------------------------
    console.log('[Step 3] Testing Executive Dashboard KPIs endpoint...');

    const kpiRes = await fetch(`${baseUrl}/admin/reports/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(kpiRes.status === 200, 'Fetched /admin/reports/dashboard');
    const kpiData: any = ((await kpiRes.json()) as any).data;

    assert(kpiData.today && typeof kpiData.today.revenueTtc === 'number', 'Today revenue KPI present');
    assert(kpiData.monthToDate && typeof kpiData.monthToDate.revenueTtc === 'number', 'MTD revenue KPI present');
    assert(kpiData.alerts && typeof kpiData.alerts.pendingClientsCount === 'number', 'Pending clients counter present');
    assert(typeof kpiData.alerts.lowStockCount === 'number', 'Low stock alert counter present');
    assert(kpiData.balances && typeof kpiData.balances.totalReceivables === 'number', 'Total receivables present');
    assert(typeof kpiData.balances.totalInventoryCost === 'number', 'Total inventory cost asset value present');
    assert(Array.isArray(kpiData.recentOrders), 'Recent orders activity stream is array');
    console.log(`  KPI Snapshot: MTD Revenue = ${kpiData.monthToDate.revenueTtc} DZD | Inventory Cost = ${kpiData.balances.totalInventoryCost} DZD | Total Receivables = ${kpiData.balances.totalReceivables} DZD`);
    console.log('Dashboard KPIs validated.\n');

    // -----------------------------------------------------------------
    // Step 4: Consolidated Income Statement (P&L) Invariants
    // -----------------------------------------------------------------
    console.log('[Step 4] Testing Consolidated Income Statement (P&L) calculations...');

    const pnlRes = await fetch(`${baseUrl}/admin/reports/income-statement?from=2026-01-01&to=2026-12-31`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(pnlRes.status === 200, 'Fetched /admin/reports/income-statement');
    const pnlData: any = ((await pnlRes.json()) as any).data;

    // Check P&L mathematical formula consistency:
    // 1. Net Revenue = Gross Revenue - Credit Notes
    const expectedNetRev = Math.max(0, pnlData.revenue.grossRevenueHT - pnlData.revenue.creditNotes);
    assert(
      Math.abs(pnlData.revenue.netRevenueHT - expectedNetRev) < 0.05,
      `Net Revenue (${pnlData.revenue.netRevenueHT}) = Gross (${pnlData.revenue.grossRevenueHT}) - Avoirs (${pnlData.revenue.creditNotes})`
    );

    // 2. Gross Margin = Net Revenue - COGS
    const expectedGrossMargin = pnlData.revenue.netRevenueHT - pnlData.cogs.total;
    assert(
      Math.abs(pnlData.grossMargin.amount - expectedGrossMargin) < 0.05,
      `Gross Margin (${pnlData.grossMargin.amount}) = Net Revenue (${pnlData.revenue.netRevenueHT}) - COGS (${pnlData.cogs.total})`
    );

    // 3. Net Operating Profit = Gross Margin - Operating Expenses - Payroll
    const expectedNetProfit = pnlData.grossMargin.amount - pnlData.overheadExpenses.total - pnlData.payroll.total;
    assert(
      Math.abs(pnlData.netProfit.amount - expectedNetProfit) < 0.05,
      `Net Profit (${pnlData.netProfit.amount}) = Gross Margin (${pnlData.grossMargin.amount}) - Expenses (${pnlData.overheadExpenses.total}) - Payroll (${pnlData.payroll.total})`
    );

    // 4. Status determination
    const expectedStatus = pnlData.netProfit.amount >= 0 ? 'PROFIT' : 'LOSS';
    assert(pnlData.netProfit.status === expectedStatus, `Net profit status is correctly '${expectedStatus}'`);
    console.log(`  P&L Summary: Net Rev = ${pnlData.revenue.netRevenueHT} | Gross Margin = ${pnlData.grossMargin.amount} (${pnlData.grossMargin.percentage}%) | Expenses = ${pnlData.overheadExpenses.total} | Payroll = ${pnlData.payroll.total} | Net Result = ${pnlData.netProfit.amount} DZD (${pnlData.netProfit.status})`);
    console.log('Income Statement P&L mathematical invariants validated.\n');

    // -----------------------------------------------------------------
    // Step 5: Stock Asset Valuation Report
    // -----------------------------------------------------------------
    console.log('[Step 5] Testing Stock Asset Valuation Report...');

    const stockRes = await fetch(`${baseUrl}/admin/reports/stock-valuation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(stockRes.status === 200, 'Fetched /admin/reports/stock-valuation');
    const stockData: any = ((await stockRes.json()) as any).data;

    assert(stockData.summary.totalSkus > 0, 'Total SKUs > 0');
    assert(stockData.items.length === stockData.summary.totalSkus, 'Item rows match totalSkus count');

    // Check individual items cost calculation and sum
    let calculatedTotalCost = 0;
    let calculatedTotalRetail = 0;
    let calculatedLowStock = 0;

    for (const item of stockData.items) {
      const expectedCost = Math.round((item.physicalQuantity * item.purchasePrice + Number.EPSILON) * 100) / 100;
      const expectedRetail = Math.round((item.physicalQuantity * item.salePrice + Number.EPSILON) * 100) / 100;

      assert(
        Math.abs(item.costValue - expectedCost) < 0.05,
        `Item ${item.reference} cost value matches qty * purchasePrice`
      );
      calculatedTotalCost += item.costValue;
      calculatedTotalRetail += item.retailValue;
      if (item.isLowStock) calculatedLowStock++;
    }

    assert(
      Math.abs(stockData.summary.totalCostValue - calculatedTotalCost) < 0.05,
      `Summary totalCostValue (${stockData.summary.totalCostValue}) matches sum of line items (${calculatedTotalCost})`
    );
    assert(
      stockData.summary.lowStockCount === calculatedLowStock,
      `Low stock counter (${stockData.summary.lowStockCount}) matches items with available <= minStockAlert`
    );

    // Verify category aggregation
    let categorySumUnits = 0;
    let categorySumCost = 0;
    for (const cat of stockData.categories) {
      categorySumUnits += cat.units;
      categorySumCost += cat.costValue;
    }
    assert(
      categorySumUnits === stockData.summary.totalPhysicalUnits,
      'Category units aggregate matches summary physical units'
    );
    assert(
      Math.abs(categorySumCost - stockData.summary.totalCostValue) < 0.05,
      'Category cost valuation matches summary totalCostValue'
    );
    console.log(`  Stock Valuation: ${stockData.summary.totalPhysicalUnits} units across ${stockData.summary.totalSkus} SKUs = ${stockData.summary.totalCostValue} DZD cost | ${stockData.summary.totalRetailValue} DZD retail`);
    console.log('Stock asset valuation validated.\n');

    // -----------------------------------------------------------------
    // Step 6: Aging Receivables Report (Balance Âgée)
    // -----------------------------------------------------------------
    console.log('[Step 6] Testing Aging Receivables (Balance Âgée) report...');

    // 6.1 Create a temporary debtor client with 4 staged debit transactions across all 4 aging buckets
    const testDebtorRes = await query(`
      INSERT INTO clients (
        name, email, phone, wilaya, credit_limit, current_balance, status
      ) VALUES (
        '[TEST-PH8] SARL Quincaillerie Test Aging', 'aging-test@store.local', '0550998877', 'Sétif', 200000, 100000, 'ACTIVE'
      ) RETURNING id
    `);
    const testDebtorId = testDebtorRes.rows[0].id;

    // Staged transactions:
    // Bucket 1 (0-30j): 10 days ago -> 25,000 DZD
    // Bucket 2 (31-60j): 40 days ago -> 25,000 DZD
    // Bucket 3 (61-90j): 70 days ago -> 25,000 DZD
    // Bucket 4 (+90j): 110 days ago -> 25,000 DZD
    // Total = 100,000 DZD
    const adminUserRes = await query(`SELECT id FROM users WHERE email = 'admin@store.local'`);
    const adminUserId = adminUserRes.rows[0].id;

    await query(`
      INSERT INTO client_transactions (
        client_id, type, debit, credit, running_balance, description, transaction_date, created_by
      ) VALUES
        ($1, 'INVOICE', 25000, 0, 25000, 'Test Invoice 10d', NOW() - INTERVAL '10 days', $2),
        ($1, 'INVOICE', 25000, 0, 50000, 'Test Invoice 40d', NOW() - INTERVAL '40 days', $2),
        ($1, 'INVOICE', 25000, 0, 75000, 'Test Invoice 70d', NOW() - INTERVAL '70 days', $2),
        ($1, 'INVOICE', 25000, 0, 100000, 'Test Invoice 110d', NOW() - INTERVAL '110 days', $2)
    `, [testDebtorId, adminUserId]);

    const recRes = await fetch(`${baseUrl}/admin/reports/receivables`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(recRes.status === 200, 'Fetched /admin/reports/receivables');
    const recData: any = ((await recRes.json()) as any).data;

    assert(recData.clients.length > 0, 'Found at least 1 debtor client');
    const testClient = recData.clients.find((c: any) => c.id === testDebtorId);
    assert(!!testClient, 'Found created test debtor client in aging report');
    assert(testClient.currentBalance === 100000, 'Debtor currentBalance is 100000 DZD');
    assert(testClient.aging.current0to30 === 25000, 'Bucket 0-30j allocated 25000 DZD');
    assert(testClient.aging.days31to60 === 25000, 'Bucket 31-60j allocated 25000 DZD');
    assert(testClient.aging.days61to90 === 25000, 'Bucket 61-90j allocated 25000 DZD');
    assert(testClient.aging.over90Days === 25000, 'Bucket +90j allocated 25000 DZD');
    assert(testClient.riskLevel === 'HIGH', 'Client with +90j debt categorized as HIGH risk');

    let summedDebt = 0;
    for (const c of recData.clients) {
      assert(c.currentBalance > 0, `Debtor client ${c.name} has currentBalance > 0`);
      summedDebt += c.currentBalance;

      // Check client buckets sum to client current balance
      const bucketSum =
        c.aging.current0to30 +
        c.aging.days31to60 +
        c.aging.days61to90 +
        c.aging.over90Days;

      assert(
        Math.abs(bucketSum - c.currentBalance) < 0.05,
        `Client ${c.code || c.name} aging buckets (${bucketSum}) equal currentBalance (${c.currentBalance})`
      );
      assert(
        ['NORMAL', 'MEDIUM', 'HIGH'].includes(c.riskLevel),
        `Client ${c.name} assigned valid riskLevel (${c.riskLevel})`
      );
    }

    assert(
      Math.abs(recData.summary.totalDebt - summedDebt) < 0.05,
      `Summary totalDebt (${recData.summary.totalDebt}) matches sum of client balances (${summedDebt})`
    );

    const bucketTotalsSum =
      recData.summary.buckets.current0to30 +
      recData.summary.buckets.days31to60 +
      recData.summary.buckets.days61to90 +
      recData.summary.buckets.over90Days;

    assert(
      Math.abs(bucketTotalsSum - recData.summary.totalDebt) < 0.05,
      `Sum of aging bucket totals (${bucketTotalsSum}) equals totalDebt (${recData.summary.totalDebt})`
    );

    // Clean up test debtor transactions and client
    // Note: client_transactions has an append-only trigger for UPDATE/DELETE, but for test cleanup we can either zero the balance or leave it cleaned up
    // In PostgreSQL, to clean up test transactions, we can set balance to 0 or delete if allowed
    // Wait, trg_ledger_append_only blocks DELETE ON client_transactions!
    // Instead of deleting, we can either record compensating payments or set current_balance = 0 on client!
    await query(`UPDATE clients SET current_balance = 0 WHERE id = $1`, [testDebtorId]);
    console.log(`  Aging Receivables: ${recData.summary.debtorCount} debtor clients | Total Debt = ${recData.summary.totalDebt} DZD (0-30j: ${recData.summary.buckets.current0to30} | 31-60j: ${recData.summary.buckets.days31to60} | 61-90j: ${recData.summary.buckets.days61to90} | 90+j: ${recData.summary.buckets.over90Days})`);
    console.log('Aging receivables analysis validated.\n');

    // -----------------------------------------------------------------
    // Step 7: Excel (.xlsx) Spreadsheet Export Downloads
    // -----------------------------------------------------------------
    console.log('[Step 7] Testing Microsoft Excel (.xlsx) export generator...');

    const exportTypes = ['income-statement', 'stock-valuation', 'receivables'];

    for (const rep of exportTypes) {
      const expRes = await fetch(`${baseUrl}/admin/reports/export?report=${rep}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(expRes.status === 200, `Excel export for '${rep}' returned 200 OK`);
      
      const contentType = expRes.headers.get('content-type');
      assert(
        contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || false,
        `Content-Type header is valid XLSX MIME type for '${rep}'`
      );

      const contentDisp = expRes.headers.get('content-disposition');
      assert(
        contentDisp?.includes('attachment; filename=') || false,
        `Content-Disposition header specifies filename for '${rep}'`
      );

      const arrayBuf = await expRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      assert(buffer.length > 500, `Generated XLSX buffer size (${buffer.length} bytes) is non-trivial`);

      // Verify ZIP/XLSX magic signature bytes (PK\x03\x04)
      const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
      assert(isZip, `Binary stream for '${rep}' starts with valid PK zip magic header`);
    }

    // Test invalid report type error handling
    const invalidExpRes = await fetch(`${baseUrl}/admin/reports/export?report=invalid-report-type`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidExpRes.status === 400, 'Invalid report type properly rejected with 400 Bad Request');
    console.log('Excel XLSX reports generation validated.\n');

    console.log('======================================================');
    console.log('🎉 ALL PHASE 8 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runPhase8Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Phase 8 Verification Failed:', err);
    process.exit(1);
  });
