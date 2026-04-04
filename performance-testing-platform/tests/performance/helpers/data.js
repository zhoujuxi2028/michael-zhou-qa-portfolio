// k6 CSV data loader — uses open() + split() (NOT Node.js, no CDN dependency)
// Path: k6 open() resolves relative to MAIN SCRIPT (tests/performance/) → ../../../data/<file>.csv
import { SharedArray } from 'k6/data';

function parseCSV(content) {
  const lines = content
    .trim()
    .split('\n')
    .filter((l) => l.trim());
  if (lines.length <= 1) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });
}

function loadCSV(filePath, name) {
  return new SharedArray(name, function () {
    const content = open(filePath);
    if (!content || !content.trim()) {
      throw new Error(`CSV file is empty or not found: ${filePath}`);
    }
    return parseCSV(content);
  });
}

export const users = loadCSV('../../../data/users.csv', 'users');
export const products = loadCSV('../../../data/products.csv', 'products');

export function randomUser() {
  return users[Math.floor(Math.random() * users.length)];
}

export function randomProduct() {
  return products[Math.floor(Math.random() * products.length)];
}
