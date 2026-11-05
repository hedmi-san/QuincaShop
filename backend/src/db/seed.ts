import bcrypt from 'bcryptjs';
import { query, pool } from './index.js';

export async function runSeed() {
  console.log('🌱 Starting database seed...');

  // 1. Roles
  await query(`
    INSERT INTO roles(name, description) VALUES
      ('ADMIN', 'Owner, full access'),
      ('ACCOUNTANT', 'Operations, orders, payments, invoices'),
      ('CLIENT', 'Registered customer')
    ON CONFLICT (name) DO NOTHING;
  `);

  // 2. Settings
  await query(`
    INSERT INTO settings(key, value) VALUES
      ('company', $1::jsonb),
      ('tax', $2::jsonb),
      ('shop', $3::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `, [
    JSON.stringify({
      name: 'SARL Outillage Industriel Algérie',
      address: 'Zone Industrielle Oued Smar, Alger',
      phone: '+213 (0) 23 92 11 22',
      email: 'contact@outillage-algerie.dz',
      rc: '16/00-0123456B16',
      nif: '001616012345678',
      nis: '001616010012345',
      art: '16123456789',
      capital: '10 000 000 DZD',
      bank: 'BEA Agence Rouiba - 002 00012 1234567890 45',
      logo_url: '/assets/images/logo.png',
    }),
    JSON.stringify({
      default_tva: 19,
      timbre: { rate: 0.01, min: 5, max: 10000 },
    }),
    JSON.stringify({
      allow_registration: true,
      require_email_verification: true,
      delivery_enabled: false,
      default_credit_limit: 0,
    }),
  ]);

  // Fetch role IDs
  const rolesRes = await query('SELECT id, name FROM roles');
  const roleMap: Record<string, number> = {};
  for (const r of rolesRes.rows) {
    roleMap[r.name] = r.id;
  }

  const defaultPassword = 'StrongPassword2026!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 3. Admin User
  const adminEmail = 'admin@store.local';
  const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  let adminId: number;

  if (existingAdmin.rows.length === 0) {
    const insertRes = await query(`
      INSERT INTO users (
        email, password_hash, full_name, phone, role_id,
        email_verified, must_change_password, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      adminEmail,
      passwordHash,
      'Administrateur Système',
      '+213 550 00 00 01',
      roleMap['ADMIN'],
      true,
      true,
      true,
    ]);
    adminId = insertRes.rows[0].id;
    console.log(`✅ Created default admin user (${adminEmail})`);
  } else {
    adminId = existingAdmin.rows[0].id;
    console.log(`ℹ️ Admin user already exists (${adminEmail})`);
  }

  // 4. Accountant User
  const accountantEmail = 'accountant@store.local';
  const existingAccountant = await query('SELECT id FROM users WHERE email = $1', [accountantEmail]);

  if (existingAccountant.rows.length === 0) {
    await query(`
      INSERT INTO users (
        email, password_hash, full_name, phone, role_id,
        email_verified, must_change_password, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      accountantEmail,
      passwordHash,
      'Responsable Comptable',
      '+213 550 00 00 02',
      roleMap['ACCOUNTANT'],
      true,
      false,
      true,
    ]);
    console.log(`✅ Created default accountant user (${accountantEmail})`);
  } else {
    console.log(`ℹ️ Accountant user already exists (${accountantEmail})`);
  }

  // 5. Active Test Client (client@store.local)
  const clientEmail = 'client@store.local';
  const existingClientUser = await query('SELECT id FROM users WHERE email = $1', [clientEmail]);
  let clientUserId: number;

  if (existingClientUser.rows.length === 0) {
    const uRes = await query(`
      INSERT INTO users (
        email, password_hash, full_name, phone, role_id,
        email_verified, must_change_password, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      clientEmail,
      passwordHash,
      'Karim Benali',
      '+213 550 11 22 33',
      roleMap['CLIENT'],
      true,
      false,
      true,
    ]);
    clientUserId = uRes.rows[0].id;

    await query(`
      INSERT INTO clients (
        user_id, code, name, contact_person, phone, email, address, wilaya,
        rc, nif, art, nis, activite, status, approved_by, approved_at,
        credit_limit, opening_balance, current_balance, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE', $14, NOW(), 500000, 0, 0, false)
    `, [
      clientUserId,
      'CLT-0001',
      'EURL Quincaillerie Centrale',
      'Karim Benali',
      '+213 550 11 22 33',
      clientEmail,
      '12 Boulevard des Martyrs',
      'Alger',
      '16/00-1122334B16',
      '001616098765432',
      '16120000001',
      '112233445566778',
      'Commerce de détail de quincaillerie',
      adminId,
    ]);
    console.log(`✅ Created active test client (${clientEmail} -> CLT-0001)`);
  } else {
    console.log(`ℹ️ Active test client already exists (${clientEmail})`);
  }

  // 6. Pending Test Client (pending@store.local)
  const pendingEmail = 'pending@store.local';
  const existingPendingUser = await query('SELECT id FROM users WHERE email = $1', [pendingEmail]);

  if (existingPendingUser.rows.length === 0) {
    const pRes = await query(`
      INSERT INTO users (
        email, password_hash, full_name, phone, role_id,
        email_verified, must_change_password, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      pendingEmail,
      passwordHash,
      'Amine Mansouri',
      '+213 550 99 88 77',
      roleMap['CLIENT'],
      true,
      false,
      true,
    ]);
    const pendingUserId = pRes.rows[0].id;

    await query(`
      INSERT INTO clients (
        user_id, name, contact_person, phone, email, address, wilaya,
        status, credit_limit, opening_balance, current_balance, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 0, 0, 0, false)
    `, [
      pendingUserId,
      'SARL BTP Aménagement',
      'Amine Mansouri',
      '+213 550 99 88 77',
      pendingEmail,
      'Zone Artisanale Rouiba',
      'Alger',
    ]);
    console.log(`✅ Created pending test client (${pendingEmail})`);
  } else {
    console.log(`ℹ️ Pending test client already exists (${pendingEmail})`);
  }

  // 7. Walk-in Client (CLT-COMPTOIR)
  const comptoirCode = 'CLT-COMPTOIR';
  const existingComptoir = await query('SELECT id FROM clients WHERE code = $1', [comptoirCode]);

  if (existingComptoir.rows.length === 0) {
    await query(`
      INSERT INTO clients (
        code, name, contact_person, phone, email, address, wilaya,
        status, approved_by, approved_at, credit_limit, opening_balance, current_balance, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13)
    `, [
      comptoirCode,
      'Client Comptoir',
      'Comptoir Vente Directe',
      '+213 23 92 11 22',
      'comptoir@store.local',
      'Vente directe au magasin',
      'Alger',
      'ACTIVE',
      adminId,
      0,
      0,
      0,
      true,
    ]);
    console.log(`✅ Created default walk-in client (${comptoirCode})`);
  } else {
    console.log(`ℹ️ Walk-in client already exists (${comptoirCode})`);
  }

  // 8. Categories
  const categoriesData = [
    { name: 'Outillage Électroportatif', slug: 'outillage-electroportatif', sort_order: 1 },
    { name: 'Outillage à Main', slug: 'outillage-a-main', sort_order: 2 },
    { name: 'Visserie & Fixation', slug: 'visserie-fixation', sort_order: 3 },
    { name: 'Équipement de Protection (EPI)', slug: 'equipement-protection-epi', sort_order: 4 },
    { name: 'Plomberie & Sanitaire', slug: 'plomberie-sanitaire', sort_order: 5 },
  ];

  const catMap: Record<string, number> = {};
  for (const c of categoriesData) {
    const res = await query(`
      INSERT INTO categories (name, slug, sort_order, active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
      RETURNING id, slug
    `, [c.name, c.slug, c.sort_order]);
    catMap[res.rows[0].slug] = res.rows[0].id;
  }
  console.log(`✅ Ensured ${categoriesData.length} categories`);

  // 9. Sample Products & Stock
  const productsData = [
    {
      reference: 'BOS-GBH-2-26',
      name: 'Perforateur Burineur Bosch GBH 2-26 DRE Professional 800W',
      slug: 'perforateur-burineur-bosch-gbh-2-26-dre',
      brand: 'Bosch',
      category: 'outillage-electroportatif',
      description: 'Perforateur SDS-Plus puissant de 800W avec stop de rotation pour burinage.',
      specs: { puissance: '800 W', mandrin: 'SDS-Plus', force_frappe: '2.7 J', poids: '2.8 kg' },
      purchase_price: 24000.00,
      sale_price: 31000.00,
      facture_price: 31000.00,
      min_order_qty: 1,
      min_stock_alert: 5,
      unit: 'PIECE',
      box_size: 1,
      tva: 19.00,
      physical_qty: 25,
      reserved_qty: 3,
    },
    {
      reference: 'MAK-GA9020',
      name: 'Meuleuse d’angle Makita GA9020 230mm 2200W',
      slug: 'meuleuse-angle-makita-ga9020-230mm',
      brand: 'Makita',
      category: 'outillage-electroportatif',
      description: 'Meuleuse grand format robuste pour travaux lourds de découpe et d’ébarbage.',
      specs: { puissance: '2200 W', diametre_disque: '230 mm', vitesse: '6600 tr/min' },
      purchase_price: 18500.00,
      sale_price: 23500.00,
      facture_price: 23500.00,
      min_order_qty: 1,
      min_stock_alert: 4,
      unit: 'PIECE',
      box_size: 1,
      tva: 19.00,
      physical_qty: 18,
      reserved_qty: 2,
    },
    {
      reference: 'STA-CL-012',
      name: 'Jeu de 12 clés mixtes Stanley FatMax 6-24mm',
      slug: 'jeu-12-cles-mixtes-stanley-fatmax',
      brand: 'Stanley',
      category: 'outillage-a-main',
      description: 'Jeu d’outillage à main chrome vanadium haute résistance.',
      specs: { pieces: '12', dimensions: '6, 7, 8, 10, 11, 12, 13, 14, 17, 19, 22, 24 mm' },
      purchase_price: 6500.00,
      sale_price: 9200.00,
      facture_price: 9200.00,
      min_order_qty: 2,
      min_stock_alert: 10,
      unit: 'LOT',
      box_size: 5,
      tva: 19.00,
      physical_qty: 45,
      reserved_qty: 0,
    },
    {
      reference: 'FIS-SX-8X40',
      name: 'Chevilles d’expansion Fischer SX 8x40mm (Boîte de 100)',
      slug: 'chevilles-expansion-fischer-sx-8x40-100pcs',
      brand: 'Fischer',
      category: 'visserie-fixation',
      description: 'Cheville nylon 4 directions pour fixation dans béton et maçonnerie.',
      specs: { diametre: '8 mm', longueur: '40 mm', quantite: '100 pcs' },
      purchase_price: 950.00,
      sale_price: 1450.00,
      facture_price: 1450.00,
      min_order_qty: 5,
      min_stock_alert: 20,
      unit: 'BOITE',
      box_size: 10,
      tva: 19.00,
      physical_qty: 120,
      reserved_qty: 15,
    },
    {
      reference: 'DEL-CASQ-PRO',
      name: 'Casque de chantier ventilé Delta Plus Zircon 1',
      slug: 'casque-chantier-delta-plus-zircon-1',
      brand: 'Delta Plus',
      category: 'equipement-protection-epi',
      description: 'Casque de protection UV haute résistance avec coiffe polyéthylène 8 points.',
      specs: { norme: 'EN397', materiau: 'Polypropylène (PP)', reglage: '53-63 cm' },
      purchase_price: 1200.00,
      sale_price: 1850.00,
      facture_price: 1850.00,
      min_order_qty: 5,
      min_stock_alert: 15,
      unit: 'PIECE',
      box_size: 20,
      tva: 19.00,
      physical_qty: 80,
      reserved_qty: 5,
    },
    {
      reference: 'OUT-ROB-1521',
      name: 'Vanne d’arrêt à sphère laiton FF 1/2" (15x21)',
      slug: 'vanne-arret-sphere-laiton-ff-15-21',
      brand: 'Somatherm',
      category: 'plomberie-sanitaire',
      description: 'Robinetterie de coupure d’eau corps laiton chromé PN25 avec poignée papillon.',
      specs: { diametre: '1/2" (15x21)', raccord: 'Femelle / Femelle', pression_max: '25 bar' },
      purchase_price: 850.00,
      sale_price: 1300.00,
      facture_price: 1300.00,
      min_order_qty: 10,
      min_stock_alert: 30,
      unit: 'PIECE',
      box_size: 25,
      tva: 19.00,
      physical_qty: 0, // OUT OF STOCK test
      reserved_qty: 0,
    },
  ];

  for (const p of productsData) {
    const catId = catMap[p.category] || null;

    const prodRes = await query(`
      INSERT INTO products (
        reference, name, slug, brand, category_id, description, specs,
        purchase_price, sale_price, facture_price, min_order_qty, min_stock_alert,
        unit, box_size, tva, published, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, true)
      ON CONFLICT (reference) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        purchase_price = EXCLUDED.purchase_price,
        sale_price = EXCLUDED.sale_price,
        category_id = EXCLUDED.category_id
      RETURNING id
    `, [
      p.reference,
      p.name,
      p.slug,
      p.brand,
      catId,
      p.description,
      JSON.stringify(p.specs),
      p.purchase_price,
      p.sale_price,
      p.facture_price,
      p.min_order_qty,
      p.min_stock_alert,
      p.unit,
      p.box_size,
      p.tva,
    ]);

    const prodId = prodRes.rows[0].id;

    // Insert or update stock
    await query(`
      INSERT INTO stock (product_id, physical_quantity, reserved_quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id) DO UPDATE SET
        physical_quantity = EXCLUDED.physical_quantity,
        reserved_quantity = EXCLUDED.reserved_quantity
    `, [prodId, p.physical_qty, p.reserved_qty]);
  }

  console.log(`✅ Ensured ${productsData.length} sample products with stock`);
  console.log('🌱 Seed completed successfully.');
}

// Allow direct CLI execution: node/tsx src/db/seed.ts
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      pool.end();
      process.exit(1);
    });
}
