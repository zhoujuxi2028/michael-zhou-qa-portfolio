#!/usr/bin/env node

/**
 * Collection Validation Script
 * Validates Postman collection JSON files for common issues
 */

const fs = require('fs');
const path = require('path');

const collectionsDir = path.join(__dirname, '..', 'collections');

function validateCollection(filePath) {
  const fileName = path.basename(filePath);
  console.log(`Validating: ${fileName}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const collection = JSON.parse(content);

    // Check required fields
    if (!collection.info) {
      throw new Error('Missing "info" field');
    }
    if (!collection.info.name) {
      throw new Error('Missing collection name');
    }
    if (!collection.info.schema) {
      throw new Error('Missing schema URL');
    }

    // Check for items (requests/folders)
    if (!collection.item || !Array.isArray(collection.item)) {
      throw new Error('Missing or invalid "item" array');
    }

    const itemCount = countItems(collection.item);

    console.log(`  ✓ ${collection.info.name}`);
    console.log(`    - Version: ${collection.info.version || 'N/A'}`);
    console.log(`    - Items: ${itemCount.folders} folders, ${itemCount.requests} requests`);

    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

function countItems(items, counts = { folders: 0, requests: 0 }) {
  for (const item of items) {
    if (item.item && Array.isArray(item.item)) {
      counts.folders++;
      countItems(item.item, counts);
    } else if (item.request) {
      counts.requests++;
    }
  }
  return counts;
}

// Main execution
console.log('');
console.log('=== Postman Collection Validation ===');
console.log('');

if (!fs.existsSync(collectionsDir)) {
  console.error('Collections directory not found:', collectionsDir);
  process.exit(1);
}

const files = fs.readdirSync(collectionsDir)
  .filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.log('No collection files found.');
  process.exit(0);
}

let hasErrors = false;
files.forEach(file => {
  const valid = validateCollection(path.join(collectionsDir, file));
  if (!valid) hasErrors = true;
});

console.log('');
if (hasErrors) {
  console.log('✗ Validation failed');
  process.exit(1);
} else {
  console.log('✓ All collections valid');
  process.exit(0);
}
