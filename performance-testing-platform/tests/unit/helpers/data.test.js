const { parseCSV, validateColumns } = require('../../../src/utils/csv-loader');

describe('parseCSV', () => {
  test('UT-DATA-01: parses CSV with header row into array of objects', () => {
    const content = 'name,age\nAlice,30\nBob,25';
    const result = parseCSV(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Alice', age: '30' });
    expect(result[1]).toEqual({ name: 'Bob', age: '25' });
  });

  test('UT-DATA-02: returns empty array for empty string input', () => {
    expect(parseCSV('')).toEqual([]);
  });

  test('UT-DATA-03: throws descriptive error for null/undefined input', () => {
    expect(() => parseCSV(null)).toThrow('CSV content is required');
    expect(() => parseCSV(undefined)).toThrow('CSV content is required');
  });

  test('UT-DATA-04: returns empty array for header-only CSV (no data rows)', () => {
    expect(parseCSV('id,name,price')).toEqual([]);
  });

  test('UT-DATA-07: parses products.csv format (id, name, price, category)', () => {
    const content =
      'id,name,price,category\n1,Mouse,29.99,electronics\n2,Keyboard,89.99,electronics';
    const result = parseCSV(content);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[0].price).toBe('29.99');
    expect(result[0].category).toBe('electronics');
  });

  test('UT-DATA-08: parses users.csv format (username, password, role)', () => {
    const content = 'username,password,role\ntestuser1,testpass123,customer';
    const result = parseCSV(content);
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('testuser1');
    expect(result[0].role).toBe('customer');
  });
});

describe('validateColumns', () => {
  test('UT-DATA-05: passes when all required columns exist', () => {
    const rows = [{ id: '1', name: 'Mouse', price: '29.99' }];
    expect(() => validateColumns(rows, ['id', 'name', 'price'])).not.toThrow();
  });

  test('UT-DATA-06: throws when required column is missing', () => {
    const rows = [{ id: '1', name: 'Mouse' }];
    expect(() => validateColumns(rows, ['id', 'name', 'price'])).toThrow('price');
  });
});
