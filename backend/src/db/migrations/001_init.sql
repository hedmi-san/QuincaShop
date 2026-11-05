-- =====================================================================
-- Single-Store Mini ERP & B2B Shop — baseline schema (PostgreSQL 15+)
-- Save as backend/src/db/migrations/001_init.sql
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------- Infrastructure ----------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sequences (
  key VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL DEFAULT 0,          -- 0 = no yearly reset
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, year)
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Users & roles ----------
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE CHECK (name IN ('ADMIN','ACCOUNTANT','CLIENT')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_tokens (          -- verify email / reset password
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Clients ----------
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  code VARCHAR(50) UNIQUE,                         -- assigned on approval
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(150),
  email VARCHAR(150),
  address TEXT,
  wilaya VARCHAR(60),
  rc VARCHAR(100), nif VARCHAR(100), art VARCHAR(100), nis VARCHAR(100),
  num_fiscal VARCHAR(100), activite TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','REJECTED','SUSPENDED')),
  status_reason TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,   -- cache of last running_balance
  is_default BOOLEAN NOT NULL DEFAULT FALSE,          -- CLT-COMPTOIR walk-in
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_documents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  doc_type VARCHAR(30) NOT NULL,                      -- RC, NIF, NIS, ID, OTHER
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Catalog ----------
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE,
  brand VARCHAR(100),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  specs JSONB,
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),  -- ADMIN only
  sale_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  facture_price NUMERIC(14,2),
  min_order_qty INTEGER NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  min_stock_alert INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(50) NOT NULL DEFAULT 'PIECE',
  box_size INTEGER NOT NULL DEFAULT 0,
  tva NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  published BOOLEAN NOT NULL DEFAULT TRUE,            -- visible in public shop
  active BOOLEAN NOT NULL DEFAULT TRUE,               -- soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumb_url TEXT,
  alt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_primary_image
  ON product_images(product_id) WHERE is_primary;

-- ---------- Stock ----------
CREATE TABLE IF NOT EXISTS stock (
  product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  physical_quantity INTEGER NOT NULL DEFAULT 0 CHECK (physical_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reserved_quantity <= physical_quantity)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  movement_type VARCHAR(20) NOT NULL
    CHECK (movement_type IN ('SALE','PURCHASE','ADJUSTMENT','RESERVATION','RELEASE','RETURN','INITIAL')),
  quantity_change INTEGER NOT NULL,            -- signed, applies to physical (or reserved for RESERVATION/RELEASE)
  reference VARCHAR(100) NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  address TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  purchase_date DATE NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0)
);

-- ---------- Cart & orders ----------
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  status VARCHAR(12) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','CONFIRMED','PREPARING','READY','DELIVERED','COMPLETED','CANCELLED','REJECTED')),
  fulfillment_type VARCHAR(10) NOT NULL DEFAULT 'PICKUP' CHECK (fulfillment_type IN ('PICKUP','DELIVERY')),
  delivery_address TEXT,
  delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(12) NOT NULL DEFAULT 'ON_CREDIT'
    CHECK (payment_method IN ('CASH','CHECK','TRANSFER','ON_CREDIT')),
  subtotal_ht NUMERIC(14,2) NOT NULL,
  total_tva NUMERIC(14,2) NOT NULL,
  total_ttc NUMERIC(14,2) NOT NULL,
  client_note TEXT,
  staff_note TEXT,
  channel VARCHAR(8) NOT NULL DEFAULT 'ONLINE' CHECK (channel IN ('ONLINE','STAFF')),
  cancel_reason TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  reference VARCHAR(50) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'PIECE',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL,              -- HT, locked
  purchase_price_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,
  tva NUMERIC(5,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(12) NOT NULL,
  note TEXT,
  visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
  changed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Ledger & payments ----------
CREATE TABLE IF NOT EXISTS client_transactions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  type VARCHAR(15) NOT NULL CHECK (type IN ('INVOICE','PAYMENT','CREDIT_NOTE','REFUND','ADJUSTMENT')),
  reference_type VARCHAR(20),
  reference_id INTEGER,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  running_balance NUMERIC(14,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE TABLE IF NOT EXISTS client_payments (
  id SERIAL PRIMARY KEY,
  payment_number VARCHAR(30) NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method VARCHAR(10) NOT NULL CHECK (method IN ('CASH','CHECK','TRANSFER')),
  reference TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES client_payments(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0)
);

-- ---------- Fiscal documents ----------
CREATE TABLE IF NOT EXISTS factures (
  id SERIAL PRIMARY KEY,
  facture_number VARCHAR(30) NOT NULL UNIQUE,
  doc_type VARCHAR(15) NOT NULL DEFAULT 'FACTURE' CHECK (doc_type IN ('FACTURE','PROFORMA','BON_LIVRAISON')),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  payment_mode VARCHAR(12) NOT NULL,
  total_ht NUMERIC(14,2) NOT NULL,
  total_tva NUMERIC(14,2) NOT NULL,
  timbre NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(14,2) NOT NULL,
  amount_in_words TEXT,
  transport_mode VARCHAR(50), truck_number VARCHAR(50), driver_name VARCHAR(100),
  client_snapshot JSONB NOT NULL,                     -- legal identity frozen at issue time
  company_snapshot JSONB NOT NULL,
  status VARCHAR(8) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','VOIDED')),
  voided_at TIMESTAMPTZ,
  voided_by INTEGER REFERENCES users(id),
  void_reason TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status = 'ISSUED' OR (void_reason IS NOT NULL AND voided_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_facture_per_order
  ON factures(order_id) WHERE doc_type = 'FACTURE' AND status = 'ISSUED';

CREATE TABLE IF NOT EXISTS facture_items (
  id SERIAL PRIMARY KEY,
  facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  reference VARCHAR(50),
  designation VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_ht NUMERIC(14,2) NOT NULL,
  tva NUMERIC(5,2) NOT NULL
);

-- ---------- Expenses, HR, payroll ----------
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('ELECTRICITY','WATER','RENT','FUEL','MAINTENANCE','TRANSPORTATION','SUPPLIES','OTHER')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  expense_date DATE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  nin VARCHAR(50),
  phone VARCHAR(50),
  position VARCHAR(100),
  hire_date DATE,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','TERMINATED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  period DATE NOT NULL,                                -- first day of month
  base_salary NUMERIC(14,2) NOT NULL,
  bonus1 NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonus2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  payment_date DATE,
  UNIQUE (employee_id, period)
);

-- ---------- Notifications & audit ----------
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- specific user, or NULL + role_target
  role_target VARCHAR(30),
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR role_target IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  description TEXT NOT NULL,
  ip_address VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_pending ON clients(created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_clients_trgm ON clients
  USING gin ((name || ' ' || COALESCE(code,'') || ' ' || COALESCE(phone,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_trgm ON products
  USING gin ((name || ' ' || reference || ' ' || COALESCE(brand,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE active AND published;
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_cart_client ON cart_items(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_open ON orders(created_at)
  WHERE status IN ('PENDING','CONFIRMED','PREPARING','READY');
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_client ON client_transactions(client_id, transaction_date, id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON client_payments(client_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_factures_client ON factures(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_salaries_period ON salaries(period);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ---------- Append-only guards ----------
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_append_only ON client_transactions;
CREATE TRIGGER trg_ledger_append_only BEFORE UPDATE OR DELETE ON client_transactions
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
DROP TRIGGER IF EXISTS trg_movements_append_only ON stock_movements;
CREATE TRIGGER trg_movements_append_only BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
DROP TRIGGER IF EXISTS trg_audit_append_only ON audit_logs;
CREATE TRIGGER trg_audit_append_only BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ---------- Baseline data ----------
INSERT INTO roles(name, description) VALUES
  ('ADMIN','Owner, full access'),
  ('ACCOUNTANT','Operations, orders, payments, invoices'),
  ('CLIENT','Registered customer')
ON CONFLICT (name) DO NOTHING;

INSERT INTO settings(key, value) VALUES
  ('company', '{"name":"","address":"","phone":"","email":"","rc":"","nif":"","nis":"","art":"","capital":"","bank":"","logo_url":""}'),
  ('tax', '{"default_tva":19,"timbre":{"rate":0.01,"min":5,"max":10000}}'),
  ('shop', '{"allow_registration":true,"require_email_verification":true,"delivery_enabled":false,"default_credit_limit":0}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO schema_migrations(version) VALUES ('001_init') ON CONFLICT DO NOTHING;

