const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../orders.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id           TEXT PRIMARY KEY,
    product_id   TEXT NOT NULL,
    quantity     INTEGER NOT NULL CHECK(quantity > 0),
    unit_price   REAL NOT NULL CHECK(unit_price > 0),
    total_amount REAL NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    payment_id   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Create indexes if they don't exist
const idxStatus = db
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_orders_status'")
  .get();
if (!idxStatus) {
  db.exec('CREATE INDEX idx_orders_status ON orders(status)');
}

module.exports = db;
