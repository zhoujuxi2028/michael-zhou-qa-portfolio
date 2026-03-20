const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../inventory.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    product_id   TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    reserved     INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  TEXT NOT NULL,
    order_id    TEXT NOT NULL,
    type        TEXT NOT NULL,
    quantity    INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES inventory(product_id)
  );
`);

// Create unique index only if it doesn't exist
const indexExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_inv_tx_order_type'")
  .get();
if (!indexExists) {
  db.exec(
    'CREATE UNIQUE INDEX idx_inv_tx_order_type ON inventory_transactions(order_id, type)'
  );
}

// Seed data if empty
const count = db.prepare('SELECT COUNT(*) as cnt FROM inventory').get();
if (count.cnt === 0) {
  const insert = db.prepare(
    'INSERT INTO inventory (product_id, product_name, quantity) VALUES (?, ?, ?)'
  );
  const seedData = [
    ['PROD-001', 'Widget A', 100],
    ['PROD-002', 'Widget B', 50],
    ['PROD-003', 'Widget C', 200],
    ['PROD-004', 'Widget D', 10],
    ['PROD-005', 'Widget E', 0],
  ];
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(...item);
    }
  });
  insertMany(seedData);
}

module.exports = db;
