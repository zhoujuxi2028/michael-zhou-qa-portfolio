const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDbPath() {
  if (process.env.NODE_ENV === 'test') return ':memory:';
  const dataDir = path.join(__dirname, '../../data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'perf.db');
}

function getDatabase() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    initSchema();
    seedData();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
}

function seedData() {
  const insert = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)');
  const products = [
    ['Laptop', 999.99, 100000],
    ['Phone', 699.99, 100000],
    ['Tablet', 449.99, 100000],
    ['Headphones', 149.99, 100000],
    ['Keyboard', 89.99, 100000],
  ];
  const tx = db.transaction(() => products.forEach((p) => insert.run(...p)));
  tx();
}

function resetDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDatabase, resetDatabase };
