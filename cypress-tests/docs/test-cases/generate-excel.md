# Excel Test Case Export

## Overview

The Excel version of test cases (`UPDATE_TEST_CASES.xlsx`) is generated from the JSON mapping file to ensure consistency and maintainability.

## Generation Method

### Option 1: Online Conversion (Quick)

1. Open `test-case-mapping.json` in VS Code
2. Use online tool: https://www.convertcsv.com/json-to-excel.htm
3. Paste JSON content
4. Download as Excel
5. Save as `UPDATE_TEST_CASES.xlsx`

### Option 2: Node.js Script (Automated)

Create a script to generate Excel from JSON:

```javascript
// scripts/generate-test-excel.js
const XLSX = require('xlsx');
const fs = require('fs');

// Read test case mapping
const mapping = JSON.parse(
  fs.readFileSync('docs/test-cases/test-case-mapping.json', 'utf8')
);

// Prepare worksheet data
const worksheetData = [
  // Header row
  ['Test ID', 'Title', 'Priority', 'Category', 'Type', 'Status',
   'Automated', 'Spec File', 'Component', 'Tags'],
  // Data rows
  ...mapping.testCases.map(tc => [
    tc.id,
    tc.title,
    tc.priority,
    tc.category,
    tc.type,
    tc.status,
    tc.automation.automated ? 'Yes' : 'No',
    tc.automation.specFile || '',
    tc.testData?.component || '',
    tc.tags.join(', ')
  ])
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

// Set column widths
worksheet['!cols'] = [
  { wch: 15 },  // Test ID
  { wch: 40 },  // Title
  { wch: 10 },  // Priority
  { wch: 20 },  // Category
  { wch: 15 },  // Type
  { wch: 10 },  // Status
  { wch: 10 },  // Automated
  { wch: 60 },  // Spec File
  { wch: 15 },  // Component
  { wch: 40 }   // Tags
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');

// Write to file
XLSX.writeFile(workbook, 'docs/test-cases/UPDATE_TEST_CASES.xlsx');
console.log('Excel file generated successfully!');
```

**To use:**
```bash
# Install dependency
npm install xlsx --save-dev

# Run script
node scripts/generate-test-excel.js
```

### Option 3: Manual Creation

If automation is not needed immediately:

1. Open Excel or Google Sheets
2. Create columns: Test ID, Title, Priority, Category, Type, Status, Automated, Spec File, Component, Tags
3. Copy data from `UPDATE_TEST_CASES.md` or `test-case-mapping.json`
4. Format as table
5. Save as `UPDATE_TEST_CASES.xlsx`

## Maintenance

**Important**: The Excel file is generated from `test-case-mapping.json`. Always update the JSON file first, then regenerate the Excel file.

**Do not edit Excel directly** - changes will be overwritten on next generation.

## Excel File Contents

The Excel file contains:

**Sheet 1: Test Cases**
- Test ID
- Title
- Priority (P0, P1, P2, P3)
- Category
- Type (Functional, UI, Integration, Negative, Performance)
- Status (Active, Inactive)
- Automated (Yes/No)
- Spec File Path
- Component
- Tags

**Sheet 2: Statistics** (optional)
- Test count by category
- Test count by priority
- Automation coverage

**Sheet 3: Component Coverage** (optional)
- Components list
- Test cases per component
- Coverage percentage

## File Location

```
docs/test-cases/UPDATE_TEST_CASES.xlsx
```

## Usage

**For Stakeholder Reviews:**
- Share Excel file with product managers, business analysts
- Easy to filter and sort
- Can add comments directly in Excel

**For Test Execution:**
- Use JSON mapping or spec files directly
- Excel is for documentation only

## Status

- JSON mapping: ✅ Complete
- Excel generation script: ⏳ To be implemented
- Excel file: ⏳ To be generated

---

**Note**: For Phase 1 completion, the Excel file can be generated later using one of the methods above. The JSON mapping provides all necessary data in a machine-readable format.
