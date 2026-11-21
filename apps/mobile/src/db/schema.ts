export const MIGRATIONS: string[] = [
  /* v1 */ `
  CREATE TABLE company (id INTEGER PRIMARY KEY CHECK (id=1), name TEXT NOT NULL DEFAULT '', name_hi TEXT, address TEXT, phone TEXT, gstin TEXT,
    fy_start_month INTEGER NOT NULL DEFAULT 4, commission_mode INTEGER NOT NULL DEFAULT 1, voucher_prefix TEXT, updated_at INTEGER NOT NULL DEFAULT 0);
  INSERT INTO company(id) VALUES (1);
  CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, name_hi TEXT,
    type TEXT NOT NULL CHECK (type IN ('CUSTOMER','SUPPLIER','CASH','BANK','SALES','PURCHASE','COMMISSION','DELIVERY','EXPENSE','OTHER')),
    phone TEXT, opening_paise INTEGER NOT NULL DEFAULT 0, credit_days INTEGER, credit_limit_paise INTEGER,
    default_commission_pct REAL NOT NULL DEFAULT 0, is_system INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL, deleted_at INTEGER, device_id TEXT);
  CREATE INDEX idx_acc_type ON accounts(type) WHERE deleted_at IS NULL;
  CREATE TABLE items (id TEXT PRIMARY KEY, name TEXT NOT NULL, name_hi TEXT, unit TEXT NOT NULL DEFAULT 'KG',
    default_rate_paise INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, deleted_at INTEGER, device_id TEXT);
  CREATE TABLE transactions (id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('SALE','PURCHASE','RECEIPT','PAYMENT','JOURNAL','CONTRA','EXPENSE')),
    voucher_no TEXT NOT NULL, date TEXT NOT NULL, party_id TEXT REFERENCES accounts(id), narration TEXT,
    total_paise INTEGER NOT NULL, prev_balance_paise INTEGER, mode TEXT, ref_no TEXT, cheque_date TEXT, cleared INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL, deleted_at INTEGER, device_id TEXT);
  CREATE INDEX idx_txn_date ON transactions(date) WHERE deleted_at IS NULL;
  CREATE INDEX idx_txn_party ON transactions(party_id) WHERE deleted_at IS NULL;
  CREATE INDEX idx_txn_type ON transactions(type) WHERE deleted_at IS NULL;
  CREATE TABLE transaction_lines (id TEXT PRIMARY KEY, txn_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id), debit_paise INTEGER NOT NULL DEFAULT 0 CHECK (debit_paise>=0),
    credit_paise INTEGER NOT NULL DEFAULT 0 CHECK (credit_paise>=0), CHECK (debit_paise=0 OR credit_paise=0));
  CREATE INDEX idx_line_acc ON transaction_lines(account_id);
  CREATE INDEX idx_line_txn ON transaction_lines(txn_id);
  CREATE TABLE bill_items (id TEXT PRIMARY KEY, txn_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id), item_name TEXT NOT NULL, qty REAL NOT NULL, unit TEXT NOT NULL, rate_paise INTEGER NOT NULL,
    gross_paise INTEGER NOT NULL, commission_pct REAL NOT NULL DEFAULT 0, commission_paise INTEGER NOT NULL DEFAULT 0, delivery_paise INTEGER NOT NULL DEFAULT 0, net_paise INTEGER NOT NULL);
  CREATE INDEX idx_bill_txn ON bill_items(txn_id);
  CREATE TABLE counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
  -- invariant: a transaction's lines must balance (checked at commit by repo; trigger guards updates)
  CREATE VIEW v_balanced AS SELECT txn_id, SUM(debit_paise)-SUM(credit_paise) AS diff FROM transaction_lines GROUP BY txn_id;
  `,
  /* v2: wastage + crates */ `
  CREATE TABLE wastage (id TEXT PRIMARY KEY, item_name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'KG', qty REAL NOT NULL CHECK (qty>0), date TEXT NOT NULL, note TEXT, updated_at INTEGER NOT NULL, deleted_at INTEGER);
  CREATE TABLE crate_moves (id TEXT PRIMARY KEY, party_id TEXT NOT NULL REFERENCES accounts(id), date TEXT NOT NULL, given INTEGER NOT NULL DEFAULT 0 CHECK (given>=0), returned INTEGER NOT NULL DEFAULT 0 CHECK (returned>=0), note TEXT, updated_at INTEGER NOT NULL, deleted_at INTEGER);
  CREATE INDEX idx_crate_party ON crate_moves(party_id) WHERE deleted_at IS NULL;
  `,
];
