#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates Postman environment JSON files for consistency
 */

const fs = require('fs');
const path = require('path');

const environmentsDir = path.join(__dirname, '..', 'environments');

// Required variables that must exist in all environments
const REQUIRED_VARIABLES = [
  'baseUrl',
  'apiVersion',
  'authToken',
  'timeout',
  'environment'
];

// Optional but recommended variables for consistency
const RECOMMENDED_VARIABLES = [
  'userId',
  'productId',
  'orderId',
  'cartId',
  'retryAttempt',
  'maxRetries',
  'circuitBreakerState',
  'circuitBreakerFailures'
];

function validateEnvironment(filePath) {
  const fileName = path.basename(filePath);
  console.log(`Validating: ${fileName}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = JSON.parse(content);

    // Check basic structure
    if (!env.name) {
      throw new Error('Missing environment name');
    }

    if (!env.values || !Array.isArray(env.values)) {
      throw new Error('Missing "values" array');
    }

    const variableKeys = env.values.map(v => v.key);
    const missingRequired = [];
    const missingRecommended = [];

    // Check required variables
    for (const required of REQUIRED_VARIABLES) {
      if (!variableKeys.includes(required)) {
        missingRequired.push(required);
      }
    }

    if (missingRequired.length > 0) {
      throw new Error(`Missing required variables: ${missingRequired.join(', ')}`);
    }

    // Check recommended variables (warning only)
    for (const recommended of RECOMMENDED_VARIABLES) {
      if (!variableKeys.includes(recommended)) {
        missingRecommended.push(recommended);
      }
    }

    console.log(`  ✓ ${env.name}`);
    console.log(`    - Variables: ${env.values.length}`);

    if (missingRecommended.length > 0) {
      console.log(`    - Warning: Missing recommended variables: ${missingRecommended.join(', ')}`);
    }

    return { valid: true, variableCount: env.values.length };
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return { valid: false, variableCount: 0 };
  }
}

// Main execution
console.log('');
console.log('=== Postman Environment Validation ===');
console.log('');

if (!fs.existsSync(environmentsDir)) {
  console.error('Environments directory not found:', environmentsDir);
  process.exit(1);
}

const files = fs.readdirSync(environmentsDir)
  .filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.log('No environment files found.');
  process.exit(0);
}

let hasErrors = false;
const results = [];

files.forEach(file => {
  const result = validateEnvironment(path.join(environmentsDir, file));
  results.push({ file, ...result });
  if (!result.valid) hasErrors = true;
});

// Check consistency
console.log('');
console.log('--- Consistency Check ---');
const variableCounts = results.filter(r => r.valid).map(r => r.variableCount);
const allConsistent = variableCounts.every(c => c === variableCounts[0]);

if (allConsistent && variableCounts.length > 0) {
  console.log(`✓ All environments have ${variableCounts[0]} variables`);
} else if (variableCounts.length > 0) {
  console.log('⚠ Variable count inconsistency detected:');
  results.forEach(r => {
    if (r.valid) {
      console.log(`  - ${r.file}: ${r.variableCount} variables`);
    }
  });
}

console.log('');
if (hasErrors) {
  console.log('✗ Validation failed');
  process.exit(1);
} else {
  console.log('✓ All environments valid');
  process.exit(0);
}
