import { query, withTransaction } from '../db/index.js';
import * as cartService from '../services/cart.service.js';
import * as orderService from '../services/order.service.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase5Tests() {
  console.log('\n======================================================');
  console.log('--- STARTING PHASE 5 END-TO-END VERIFICATION SUITE ---');
  console.log('======================================================\n');

  // 1. Setup Test Client & Staff
  console.log('[Step 1] Loading test client and staff accounts...');
  const clientRes = await query(`
    SELECT c.id, c.user_id, c.name, c.email, c.credit_limit, c.current_balance, c.status
    FROM clients c
    WHERE c.status = 'ACTIVE' AND c.user_id IS NOT NULL
    ORDER BY c.id ASC
    LIMIT 1
  `);
  assert(clientRes.rows.length > 0, 'Found at least one ACTIVE client');
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
  console.log(`Using client ID: ${clientId} (${client.name}), Staff ID: ${staffUserId}\n`);

  // 2. Select 2 Products with Positive Stock
  console.log('[Step 2] Selecting test products with stock...');
  const prodRes = await query(`
    SELECT p.id, p.name, p.reference, p.sale_price, p.min_order_qty, p.tva,
           s.physical_quantity, s.reserved_quantity
    FROM products p
    JOIN stock s ON s.product_id = p.id
    WHERE p.active = true AND p.published = true AND s.physical_quantity >= 20
    ORDER BY p.id ASC
    LIMIT 2
  `);
  assert(prodRes.rows.length >= 2, 'Found at least 2 active products with stock >= 20');
  const p1 = prodRes.rows[0];
  const p2 = prodRes.rows[1];
  console.log(`Product 1: ID ${p1.id} "${p1.name}" (Stock: ${p1.physical_quantity}, Reserved: ${p1.reserved_quantity})`);
  console.log(`Product 2: ID ${p2.id} "${p2.name}" (Stock: ${p2.physical_quantity}, Reserved: ${p2.reserved_quantity})\n`);

  // 3. Cart Operations
  console.log('[Step 3] Testing Cart Service...');
  await cartService.clearCart(clientId);
  let cart = await cartService.getCart(clientId);
  assert(cart.items.length === 0, 'Cart is successfully cleared initially');
  assert(cart.summary.itemCount === 0 && cart.summary.totalTtc === 0, 'Cart summary is zeroed');

  // Test minimum order quantity enforcement
  if (p1.min_order_qty && p1.min_order_qty > 1) {
    try {
      await cartService.upsertCartItem(clientId, p1.id, 1);
      assert(false, 'Should throw error when adding quantity below min_order_qty');
    } catch (err: any) {
      assert(err.code === 'MIN_ORDER_QTY_NOT_MET', `Min order qty correctly enforced (${err.message})`);
    }
  }

  // Add items with valid quantities
  const qty1 = Math.max(2, p1.min_order_qty || 1);
  const qty2 = Math.max(3, p2.min_order_qty || 1);
  await cartService.upsertCartItem(clientId, p1.id, qty1);
  cart = await cartService.upsertCartItem(clientId, p2.id, qty2);

  assert(cart.items.length === 2, 'Cart contains exactly 2 items');
  assert(cart.summary.totalQuantity === qty1 + qty2, `Cart totalQuantity is ${qty1 + qty2}`);
  assert(cart.summary.subtotalHt > 0, `Cart subtotal HT is ${cart.summary.subtotalHt} DZD`);
  assert(cart.summary.totalTtc > cart.summary.subtotalHt, `Cart total TTC is ${cart.summary.totalTtc} DZD`);
  console.log(`Cart total calculated: ${cart.summary.totalTtc} DZD (TVA: ${cart.summary.totalTva} DZD)\n`);

  // 4. Credit Limit Validation on Checkout
  console.log('[Step 4] Testing Credit Limit Enforcement...');
  const originalLimit = Number(client.credit_limit);
  // Set limit artificially lower than cart total
  await query('UPDATE clients SET credit_limit = 10 WHERE id = $1', [clientId]);

  try {
    await orderService.placeOrder(clientId, clientUserId, {
      fulfillmentType: 'PICKUP',
      paymentMethod: 'ON_CREDIT',
    });
    assert(false, 'Should fail checkout when exceeding credit limit');
  } catch (err: any) {
    assert(err.code === 'CREDIT_LIMIT_EXCEEDED', `Checkout rejected for exceeding credit limit (${err.message})`);
  }

  // Restore generous credit limit
  await query('UPDATE clients SET credit_limit = $1 WHERE id = $2', [Math.max(500000, originalLimit), clientId]);
  console.log('Restored credit limit. Proceeding with valid checkout...\n');

  // 5. Checkout & Order Creation
  console.log('[Step 5] Placing valid order...');
  const order = await orderService.placeOrder(clientId, clientUserId, {
    fulfillmentType: 'DELIVERY',
    deliveryAddress: 'Zone Industrielle Oued Smar, Lot 44',
    paymentMethod: 'ON_CREDIT',
    clientNote: 'Livraison urgente matinée',
  });

  assert(order.id > 0, `Order created with ID ${order.id}`);
  assert(order.order_number.startsWith('CMD-'), `Order number formatted as sequence: ${order.order_number}`);
  assert(order.status === 'PENDING', 'Initial order status is PENDING');
  assert(order.fulfillment_type === 'DELIVERY', 'Fulfillment type is DELIVERY');

  // Verify cart emptied
  const emptyCart = await cartService.getCart(clientId);
  assert(emptyCart.items.length === 0, 'Cart is automatically cleared after checkout');

  // Check initial stock is NOT reserved yet during PENDING
  const stPending = await query('SELECT physical_quantity, reserved_quantity FROM stock WHERE product_id = $1', [p1.id]);
  assert(Number(stPending.rows[0].reserved_quantity) === Number(p1.reserved_quantity), 'Stock is NOT reserved in PENDING status');
  console.log(`Order ${order.order_number} created successfully.\n`);

  // 6. Transition: PENDING -> CONFIRMED (Pessimistic Stock Reservation)
  console.log('[Step 6] Confirming order and verifying stock reservation...');
  const confirmedOrder = await orderService.updateOrderStatus(order.id, 'CONFIRMED', staffUserId, {
    note: 'Commande confirmée, stock matériel réservé au magasin',
  });
  assert(confirmedOrder.status === 'CONFIRMED', 'Order transitioned to CONFIRMED');

  const stConfirmed1 = await query('SELECT physical_quantity, reserved_quantity FROM stock WHERE product_id = $1', [p1.id]);
  const stConfirmed2 = await query('SELECT physical_quantity, reserved_quantity FROM stock WHERE product_id = $1', [p2.id]);
  assert(
    Number(stConfirmed1.rows[0].reserved_quantity) === Number(p1.reserved_quantity) + qty1,
    `Product 1 reserved_quantity increased from ${p1.reserved_quantity} to ${stConfirmed1.rows[0].reserved_quantity}`
  );
  assert(
    Number(stConfirmed2.rows[0].reserved_quantity) === Number(p2.reserved_quantity) + qty2,
    `Product 2 reserved_quantity increased from ${p2.reserved_quantity} to ${stConfirmed2.rows[0].reserved_quantity}`
  );

  // Check stock movement records
  const movRes = await query(
    `SELECT * FROM stock_movements WHERE reference = $1 AND movement_type = 'RESERVATION'`,
    [order.order_number]
  );
  assert(movRes.rows.length === 2, 'Created 2 RESERVATION stock movement rows');
  console.log('Stock reservations and movements verified.\n');

  // 7. Testing Insufficient Stock Rejection under Pessimistic Locking
  console.log('[Step 7] Testing Insufficient Stock Rejection during Confirmation...');
  // Place another order for huge quantity
  const availableP1 = Number(stConfirmed1.rows[0].physical_quantity) - Number(stConfirmed1.rows[0].reserved_quantity);
  await cartService.upsertCartItem(clientId, p1.id, availableP1 + 50); // exceeds available stock!
  // Force cart item into order by temporarily inflating physical stock or testing order confirm shortfall
  const orderExcess = await orderService.placeOrder(clientId, clientUserId, {
    fulfillmentType: 'PICKUP',
    paymentMethod: 'CASH',
  }).catch((err: any) => {
    assert(err.code === 'INSUFFICIENT_STOCK', `Cart checkout prevented overselling (${err.message})`);
    return null;
  });
  assert(orderExcess === null, 'Oversell attempt was successfully blocked at checkout');

  // 8. Lifecycle: CONFIRMED -> PREPARING -> READY -> DELIVERED
  console.log('[Step 8] Testing State Machine Transitions...');
  // Attempt invalid transition: CONFIRMED -> DELIVERED directly
  try {
    await orderService.updateOrderStatus(order.id, 'DELIVERED', staffUserId);
    assert(false, 'Should block illegal transition CONFIRMED -> DELIVERED');
  } catch (err: any) {
    assert(err.code === 'INVALID_STATE_TRANSITION', `Blocked illegal transition (${err.message})`);
  }

  // Valid transition to PREPARING
  const prepOrder = await orderService.updateOrderStatus(order.id, 'PREPARING', staffUserId, {
    note: 'Colis en cours de préparation en entrepôt',
  });
  assert(prepOrder.status === 'PREPARING', 'Order transitioned to PREPARING');

  // Valid transition to READY
  const readyOrder = await orderService.updateOrderStatus(order.id, 'READY', staffUserId, {
    note: 'Colis prêt sur le quai de chargement',
  });
  assert(readyOrder.status === 'READY', 'Order transitioned to READY');

  // Valid transition to DELIVERED (Stock Sale Commit!)
  const deliveredOrder = await orderService.updateOrderStatus(order.id, 'DELIVERED', staffUserId, {
    note: 'Marchandise remise au transporteur et livrée',
  });
  assert(deliveredOrder.status === 'DELIVERED', 'Order transitioned to DELIVERED');

  // Verify stock deduction on DELIVERED
  const stDelivered1 = await query('SELECT physical_quantity, reserved_quantity FROM stock WHERE product_id = $1', [p1.id]);
  assert(
    Number(stDelivered1.rows[0].physical_quantity) === Number(p1.physical_quantity) - qty1,
    `Product 1 physical_quantity decreased by ${qty1} (from ${p1.physical_quantity} to ${stDelivered1.rows[0].physical_quantity})`
  );
  assert(
    Number(stDelivered1.rows[0].reserved_quantity) === Number(p1.reserved_quantity),
    `Product 1 reserved_quantity released back to ${stDelivered1.rows[0].reserved_quantity}`
  );

  const saleMovRes = await query(
    `SELECT * FROM stock_movements WHERE reference = $1 AND movement_type = 'SALE'`,
    [order.order_number]
  );
  assert(saleMovRes.rows.length === 2, 'Created 2 SALE stock movement rows');
  console.log('Stock sale commit and decrement verified.\n');

  // 9. Order Cancellation & Stock Release Test
  console.log('[Step 9] Testing Order Cancellation and Stock Release...');
  await cartService.clearCart(clientId);
  // Add item, checkout order 2
  await cartService.upsertCartItem(clientId, p2.id, qty2);
  const order2 = await orderService.placeOrder(clientId, clientUserId, {
    fulfillmentType: 'PICKUP',
    paymentMethod: 'CASH',
  });
  assert(order2.status === 'PENDING', 'Order 2 placed in PENDING');

  // Client cancels order 2
  const cancelledOrder2 = await orderService.cancelOrderByClient(order2.id, clientId, clientUserId, 'Erreur de référence');
  assert(cancelledOrder2.status === 'CANCELLED', 'Client successfully cancelled PENDING order');

  // Test client cannot cancel already confirmed order
  await cartService.upsertCartItem(clientId, p2.id, qty2);
  const order3 = await orderService.placeOrder(clientId, clientUserId, {
    fulfillmentType: 'PICKUP',
    paymentMethod: 'CASH',
  });
  await orderService.updateOrderStatus(order3.id, 'CONFIRMED', staffUserId);

  try {
    await orderService.cancelOrderByClient(order3.id, clientId, clientUserId, 'Tentative annulation');
    assert(false, 'Client should NOT be able to cancel CONFIRMED order');
  } catch (err: any) {
    assert(err.code === 'CANNOT_CANCEL_NON_PENDING', `Client cancellation blocked for non-pending order (${err.message})`);
  }

  // Staff cancels CONFIRMED order -> Stock reservation MUST be released!
  const stBeforeStaffCancel = await query('SELECT reserved_quantity FROM stock WHERE product_id = $1', [p2.id]);
  await orderService.updateOrderStatus(order3.id, 'CANCELLED', staffUserId, {
    cancelReason: 'Annulation par la direction',
  });
  const stAfterStaffCancel = await query('SELECT reserved_quantity FROM stock WHERE product_id = $1', [p2.id]);
  assert(
    Number(stAfterStaffCancel.rows[0].reserved_quantity) === Number(stBeforeStaffCancel.rows[0].reserved_quantity) - qty2,
    `Reserved quantity was cleanly released upon cancellation (-${qty2})`
  );

  const releaseMov = await query(
    `SELECT * FROM stock_movements WHERE reference = $1 AND movement_type = 'RELEASE'`,
    [order3.order_number]
  );
  assert(releaseMov.rows.length === 1, 'RELEASE stock movement logged');
  console.log('Stock release on cancellation verified.\n');

  // 10. Visual Order Tracking Data Retrieval
  console.log('[Step 10] Testing Visual Order Tracking Detail Retrieval...');
  const detailedOrder = await orderService.getOrderById(order.id, clientId, false);
  assert(detailedOrder.id === order.id, 'Retrieved order matching ID');
  assert(Array.isArray(detailedOrder.items) && detailedOrder.items.length === 2, 'Includes order snapshot items');
  assert(Array.isArray(detailedOrder.history) && detailedOrder.history.length >= 4, 'Includes status progression history');
  console.log('Order status history trail:');
  for (const h of detailedOrder.history) {
    console.log(`  - [${h.status}] at ${h.created_at} : "${h.note}"`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 5 TESTS COMPLETED WITH 100% SUCCESS! 🎉');
  console.log('======================================================\n');
  process.exit(0);
}

runPhase5Tests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED WITH ERROR:', err);
  process.exit(1);
});
