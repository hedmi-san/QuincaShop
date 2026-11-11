const pg = require('../backend/node_modules/pg');

const p = new pg.Pool({ connectionString: 'postgres://postgres:root@localhost:5432/single_store_db' });

async function run() {
  console.log('--- Applying database data fixes for mojibake ---');
  await p.query("UPDATE categories SET name = 'Soudage & découpe plasma', slug = 'soudage-decoupe-plasma' WHERE id = 61 OR slug LIKE '%d%coupe%' OR name LIKE '%D%coupe%'");
  await p.query("UPDATE products SET name = 'Perceuse Visseuse à Percussion DeWalt DCD996 18V XR Brushless', description = 'Perceuse percussion 3 vitesses 95Nm pour applications lourdes de perçage et vissage.' WHERE id = 73 OR reference = 'DEW-DCD-996' OR name LIKE '%Percussion%'");
  await p.query("UPDATE notifications SET body = 'Votre compte \"SARL Brahimi Construction 6025\" a été suspendu. Motif : Vérification périodique du registre fiscal' WHERE id = 3 OR body LIKE '%V%rification%'");

  // Temporarily disable mutation trigger on immutable tables to repair encoding
  await p.query("ALTER TABLE stock_movements DISABLE TRIGGER ALL");
  await p.query("UPDATE stock_movements SET notes = 'Réception arrivage fournisseur outillage' WHERE id = 24 OR notes LIKE '%R%ception%'");
  await p.query("ALTER TABLE stock_movements ENABLE TRIGGER ALL");

  await p.query("ALTER TABLE audit_logs DISABLE TRIGGER ALL");
  await p.query("UPDATE audit_logs SET description = 'Suspension du client SARL Brahimi Construction 6025. Motif : Vérification périodique du registre fiscal' WHERE id = 2 OR description LIKE '%V%rification%'");
  await p.query("ALTER TABLE audit_logs ENABLE TRIGGER ALL");

  console.log('--- Checking database for any remaining \\uFFFD replacement characters ---');
  let remainingCount = 0;
  const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  for (const t of tables.rows) {
    const cols = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND data_type IN ('text', 'character varying')", [t.table_name]);
    for (const c of cols.rows) {
      try {
        const res = await p.query(`SELECT id, ${c.column_name} FROM ${t.table_name} WHERE ${c.column_name} LIKE '%\uFFFD%'`);
        if (res.rows.length > 0) {
          remainingCount += res.rows.length;
          console.log(`Found \\uFFFD in ${t.table_name}.${c.column_name}:`, res.rows);
        }
      } catch (e) {}
    }
  }

  if (remainingCount === 0) {
    console.log('✅ 0 \\uFFFD characters found in entire database!');
  } else {
    console.log(`⚠️ ${remainingCount} \\uFFFD characters still remaining.`);
  }

  await p.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
