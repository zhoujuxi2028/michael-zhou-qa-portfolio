const { getDatabase, resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('database', () => {
  test('getDatabase returns a database instance', () => {
    const db = getDatabase();
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
  });

  test('getDatabase seeds 5 products', () => {
    const db = getDatabase();
    const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    expect(count).toBe(5);
  });

  test('resetDatabase clears the singleton', () => {
    getDatabase();
    resetDatabase();
    const db = getDatabase();
    const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    expect(count).toBe(5);
  });
});
