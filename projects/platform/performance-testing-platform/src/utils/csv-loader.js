function parseCSV(content) {
  if (content == null) throw new Error('CSV content is required (got null/undefined)');
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

function validateColumns(rows, requiredColumns) {
  if (rows.length === 0) return;
  const present = Object.keys(rows[0]);
  const missing = requiredColumns.filter((c) => !present.includes(c));
  if (missing.length > 0) {
    throw new Error(`CSV missing required columns: ${missing.join(', ')}`);
  }
}

module.exports = { parseCSV, validateColumns };
