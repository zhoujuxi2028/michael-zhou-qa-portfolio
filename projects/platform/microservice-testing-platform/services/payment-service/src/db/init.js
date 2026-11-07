const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../payments.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id              TEXT PRIMARY KEY,
    order_id        TEXT NOT NULL,
    amount          REAL NOT NULL CHECK(amount > 0),
    status          TEXT NOT NULL DEFAULT 'processing',
    correlation_id  TEXT,
    processed_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const idxOrder = db
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_payments_order'")
  .get();
if (!idxOrder) {
  db.exec('CREATE UNIQUE INDEX idx_payments_order ON payments(order_id)');
}

module.exports = db;
