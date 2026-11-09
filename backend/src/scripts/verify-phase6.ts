import { query } from '../db/index.js';
import * as cartService from '../services/cart.service.js';
import * as orderService from '../services/order.service.js';
import * as factureService from '../services/facture.service.js';
import * as ledgerService from '../services/ledger.service.js';
import * as paymentService from '../services/payment.service.js';
import { amountToFrenchWords } from '../utils/numberToWords.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase6Tests() {
  console.log('\n======================================================');
  console.log('--- STARTING PHASE 6 END-TO-END VERIFICATION SUITE ---');
  console.log('======================================================\n');

  // 1. Setup Test Client & Staff Accounts
  console.log('[Step 1] Loading active B2B client and staff accounts...');
  const clientRes = await query(`
    SELECT c.id, c.user_id, c.name, c.email, c.credit_limit, c.current_balance, c.status
    FROM clients c
    WHERE c.status = 'ACTIVE' AND c.user_id IS NOT NULL
    ORDER BY c.id ASC
    LIMIT 1
  `);
  assert(clientRes.rows.length > 0, 'Found at least one ACTIVE client with user_id');
  const client = clientRes.rows[0];
  const clientId = client.id;
  const clientUserId = client.user_id;

  const staffRes = await query(`
    SELECT u.id, u.email, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'ADMIN'
    LIMIT 1
  `);
  assert(staffRes.rows.length > 0, 'Found ADMIN staff account');
  const staffUserId = staffRes.rows[0].id;
  console.log(`Client ID: ${clientId} (${client.name}), Staff ID: ${staffUserId}\n`);

  // 2. Unit Verification: Algerian Timbre Fiscal Formula
  console.log('[Step 2] Testing Algerian Timbre Fiscal calculation formula...');
  // Cash payments: 1% min 5, max 10000
  assert(factureService.calculateTimbreFiscal('ESPECE', 100) === 5, 'Cash 100 DZD applies minimum 5 DZD timbre');
  assert(factureService.calculateTimbreFiscal('CASH', 50000) === 500, 'Cash 50,000 DZD applies 500 DZD (1%) timbre');
  assert(factureService.calculateTimbreFiscal('ESPECE', 1500000) === 10000, 'Cash 1,500,000 DZD caps at maximum 10,000 DZD timbre');
  // Non-cash payments: zero timbre
  assert(factureService.calculateTimbreFiscal('CHECK', 50000) === 0, 'Cheque payment has 0 DZD timbre');
  assert(factureService.calculateTimbreFiscal('TRANSFER', 50000) === 0, 'Transfer payment has 0 DZD timbre');
  assert(factureService.calculateTimbreFiscal('ON_CREDIT', 50000) === 0, 'Credit payment has 0 DZD timbre');
  console.log('Timbre fiscal rules validated.\n');

  // 3. Unit Verification: French Legal Amount in Words
  console.log('[Step 3] Testing French Amount-to-Words conversion...');
  const w1 = amountToFrenchWords(159600);
  assert(w1.toLowerCase().includes('cent cinquante-neuf mille six cents dinars'), `159600 formatted correctly: "${w1}"`);
  const w2 = amountToFrenchWords(12500.50);
  assert(w2.toLowerCase().includes('douze mille cinq cents dinars') && w2.includes('50 centimes'), `12500.50 formatted correctly: "${w2}"`);
  console.log('Amount-to-words generator validated.\n');

  // 4. Create an Order to Invoice
  console.log('[Step 4] Creating an order for invoicing test...');
  await cartService.clearCart(clientId);
  const prodRes = await query(`
    SELECT p.id, p.sale_price, p.min_order_qty
    FROM products p
    JOIN stock s ON s.product_id = p.id
    WHERE p.active = true AND p.published = true AND (s.physical_quantity - s.reserved_quantity) >= 5
    LIMIT 1
  `);
  assert(prodRes.rows.length > 0, 'Found available product');
  const prod = prodRes.rows[0];

  await cartService.upsertCartItem(clientId, prod.id, Math.max(2, prod.min_order_qty || 1));
  const testOrder = await orderService.placeOrder(clientId, clientUserId, {
    fulfillmentType: 'DELIVERY',
    paymentMethod: 'ON_CREDIT',
    clientNote: 'Pour test facturation Phase 6',
  });
  console.log(`Created test order ID ${testOrder.id} (${testOrder.order_number})\n`);

  // Record initial balance before invoice
  const balBefore = await ledgerService.getClientBalance(clientId);
  const initialBalance = balBefore.currentBalance;
  console.log(`Client balance before invoice: ${initialBalance} DZD`);

  // 5. Generate Official Facture Fiscale
  console.log('[Step 5] Generating official Facture Fiscale (FAC-YYYY-XXXX)...');
  const facture = await factureService.createFactureFromOrder(
    {
      orderId: testOrder.id,
      docType: 'FACTURE',
      paymentMode: 'ON_CREDIT',
      transportMode: 'CAMIONNETTE',
      truckNumber: '01234-116-16',
      driverName: 'Mourad Haddad',
    },
    staffUserId
  );

  assert(facture.id > 0, `Facture generated with ID ${facture.id}`);
  assert(facture.facture_number.startsWith('FAC-'), `Facture number has sequence prefix FAC-: ${facture.facture_number}`);
  assert(facture.doc_type === 'FACTURE', 'Document type is FACTURE');
  assert(facture.status === 'ISSUED', 'Facture status is ISSUED');
  assert(facture.amount_in_words !== null && facture.amount_in_words.length > 5, `Amount in words generated: "${facture.amount_in_words}"`);
  assert(facture.company_snapshot && facture.company_snapshot.rc, 'Company snapshot frozen with legal RC');
  assert(facture.client_snapshot && facture.client_snapshot.name, 'Client snapshot frozen with legal coordinates');

  // Verify snapshot items
  const fiRes = await query('SELECT * FROM facture_items WHERE facture_id = $1', [facture.id]);
  assert(fiRes.rows.length > 0, `Facture items snapshotted in DB (${fiRes.rows.length} item(s))`);

  // 6. Sub-Ledger Verification on Facture Emission
  console.log('[Step 6] Verifying Client Sub-Ledger entry...');
  const balAfterFacture = await ledgerService.getClientBalance(clientId);
  const expectedBalanceAfter = initialBalance + Number(facture.total_ttc);
  assert(
    Math.abs(balAfterFacture.currentBalance - expectedBalanceAfter) < 0.01,
    `Client current_balance increased from ${initialBalance} to ${balAfterFacture.currentBalance} DZD (+${facture.total_ttc})`
  );

  const txRes = await query(
    `SELECT * FROM client_transactions WHERE reference_type = 'FACTURE' AND reference_id = $1`,
    [facture.id]
  );
  assert(txRes.rows.length === 1, 'Client transaction entry created in client_transactions');
  const txRow = txRes.rows[0];
  assert(txRow.type === 'INVOICE', 'Transaction type is INVOICE');
  assert(Number(txRow.debit) === Number(facture.total_ttc) && Number(txRow.credit) === 0, 'Transaction recorded as Debit');
  assert(Number(txRow.running_balance) === balAfterFacture.currentBalance, 'Running balance strictly tracks client balance');
  console.log('Sub-ledger entry verified.\n');

  // 7. Test Uniqueness Invariant (Only 1 active Facture per order)
  console.log('[Step 7] Testing Facture uniqueness constraint per order...');
  try {
    await factureService.createFactureFromOrder(
      {
        orderId: testOrder.id,
        docType: 'FACTURE',
      },
      staffUserId
    );
    assert(false, 'Should prevent creating duplicate active FACTURE for same order');
  } catch (err: any) {
    assert(err.code === 'FACTURE_ALREADY_EXISTS', `Duplicate facture blocked (${err.message})`);
  }

  // 8. Generate Bon de Livraison (BL)
  console.log('[Step 8] Generating Bon de Livraison (BL-YYYY-XXXX)...');
  const bl = await factureService.createFactureFromOrder(
    {
      orderId: testOrder.id,
      docType: 'BON_LIVRAISON',
      transportMode: 'RETRAIT',
    },
    staffUserId
  );
  assert(bl.facture_number.startsWith('BL-'), `Bon de livraison numbered with BL- prefix: ${bl.facture_number}`);
  assert(bl.doc_type === 'BON_LIVRAISON', 'Doc type is BON_LIVRAISON');
  // BL does not re-debit the ledger
  const balAfterBL = await ledgerService.getClientBalance(clientId);
  assert(balAfterBL.currentBalance === balAfterFacture.currentBalance, 'Bon de Livraison does not duplicate debit on ledger');
  console.log('Bon de Livraison issued without double-counting ledger.\n');

  // 9. Customer Payment Recording (Versement)
  console.log('[Step 9] Recording customer payment (Versement)...');
  const paymentAmount = Math.round(Number(facture.total_ttc) / 2); // pay half
  const payment = await paymentService.recordPayment({
    clientId,
    amount: paymentAmount,
    method: 'CHECK',
    reference: 'CHQ-BNA-8829103',
    userId: staffUserId,
    allocatedOrderIds: [testOrder.id],
  });

  assert(payment.id > 0, `Payment recorded with ID ${payment.id}`);
  assert(payment.payment_number.startsWith('PAY-'), `Payment number formatted as PAY-YYYY-XXXX: ${payment.payment_number}`);
  assert(Number(payment.amount) === paymentAmount, `Payment amount matches: ${paymentAmount} DZD`);

  const balAfterPayment = await ledgerService.getClientBalance(clientId);
  const expectedAfterPay = balAfterFacture.currentBalance - paymentAmount;
  assert(
    Math.abs(balAfterPayment.currentBalance - expectedAfterPay) < 0.01,
    `Client current_balance decreased by ${paymentAmount} DZD (new balance: ${balAfterPayment.currentBalance})`
  );

  const payTxRes = await query(
    `SELECT * FROM client_transactions WHERE reference_type = 'PAYMENT' AND reference_id = $1`,
    [payment.id]
  );
  assert(payTxRes.rows.length === 1, 'Payment transaction created in client_transactions');
  const payTx = payTxRes.rows[0];
  assert(payTx.type === 'PAYMENT', 'Transaction type is PAYMENT');
  assert(Number(payTx.credit) === paymentAmount && Number(payTx.debit) === 0, 'Transaction recorded as Credit');
  console.log('Customer payment and balance decrement verified.\n');

  // 10. Facture Voiding (Annulation & Credit Note)
  console.log('[Step 10] Testing Facture Voiding & Compensating Avoir (Credit Note)...');
  const voidReason = 'Erreur de saisie entité client - Remplacée';
  const voidedFacture = await factureService.voidFacture(facture.id, staffUserId, voidReason);
  assert(voidedFacture.status === 'VOIDED', 'Facture marked as VOIDED');
  assert(voidedFacture.void_reason === voidReason, `Void reason recorded: "${voidedFacture.void_reason}"`);
  assert(voidedFacture.voided_at !== null, 'Void timestamp recorded');

  // Attempting to void again should fail
  try {
    await factureService.voidFacture(facture.id, staffUserId, 'Tentative 2');
    assert(false, 'Should prevent voiding an already voided invoice');
  } catch (err: any) {
    assert(err.code === 'FACTURE_ALREADY_VOIDED', `Prevented re-voiding (${err.message})`);
  }

  // Check compensating credit note in ledger
  const avoirTxRes = await query(
    `SELECT * FROM client_transactions WHERE reference_type = 'FACTURE' AND reference_id = $1 AND type = 'CREDIT_NOTE'`,
    [facture.id]
  );
  assert(avoirTxRes.rows.length === 1, 'Compensating CREDIT_NOTE (Avoir) appended to ledger');
  const avoirTx = avoirTxRes.rows[0];
  assert(Number(avoirTx.credit) === Number(facture.total_ttc), `Credit note amount matches invoice total: ${facture.total_ttc} DZD`);

  const balAfterVoid = await ledgerService.getClientBalance(clientId);
  const expectedAfterVoid = balAfterPayment.currentBalance - Number(facture.total_ttc);
  assert(
    Math.abs(balAfterVoid.currentBalance - expectedAfterVoid) < 0.01,
    `Client balance cleanly reversed by credit note (balance: ${balAfterVoid.currentBalance} DZD)`
  );
  console.log('Facture voiding and credit note compensation verified.\n');

  // 11. Append-Only Trigger Integrity Test
  console.log('[Step 11] Testing Append-Only database triggers on client_transactions...');
  try {
    await query('UPDATE client_transactions SET debit = 9999 WHERE id = $1', [txRow.id]);
    assert(false, 'Database trigger should forbid UPDATE on client_transactions');
  } catch (err: any) {
    assert(err.message.includes('append-only'), `UPDATE forbidden by trigger: "${err.message}"`);
  }

  try {
    await query('DELETE FROM client_transactions WHERE id = $1', [txRow.id]);
    assert(false, 'Database trigger should forbid DELETE on client_transactions');
  } catch (err: any) {
    assert(err.message.includes('append-only'), `DELETE forbidden by trigger: "${err.message}"`);
  }
  console.log('Append-only ledger integrity strictly enforced by PostgreSQL triggers.\n');

  // 12. Extrait de Compte (Statement) Data Retrieval
  console.log('[Step 12] Testing Extrait de Compte (Statement) retrieval...');
  const statement = await ledgerService.getClientLedger(clientId);
  assert(statement.client.id === clientId, 'Statement includes client details');
  assert(Array.isArray(statement.transactions) && statement.transactions.length >= 3, `Retrieved ${statement.transactions.length} transactions`);
  assert(statement.summary.totalDebits > 0, `Total debits: ${statement.summary.totalDebits} DZD`);
  assert(statement.summary.totalCredits > 0, `Total credits: ${statement.summary.totalCredits} DZD`);
  console.log('Recent statement transactions:');
  for (const t of statement.transactions.slice(-4)) {
    console.log(`  - [${t.type}] ${t.transactionDate.toISOString().substring(0, 10)} | D:${t.debit} C:${t.credit} | Solde:${t.runningBalance} | "${t.description}"`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 6 TESTS COMPLETED WITH 100% SUCCESS! 🎉');
  console.log('======================================================\n');
  process.exit(0);
}

runPhase6Tests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED WITH ERROR:', err);
  process.exit(1);
});

