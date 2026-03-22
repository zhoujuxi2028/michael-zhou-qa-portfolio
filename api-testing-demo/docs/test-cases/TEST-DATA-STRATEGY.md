# 📊 Test Data Management Strategy

**Version:** 1.0.0
**Last Updated:** 2026-02-25
**Author:** Michael Zhou

---

## 📋 Table of Contents

- [Overview](#overview)
- [Data Factory Pattern](#data-factory-pattern)
- [Test Data Files](#test-data-files)
- [Data Isolation Strategy](#data-isolation-strategy)
- [Data-Driven Testing](#data-driven-testing)
- [Best Practices](#best-practices)

---

## 🎯 Overview

This test framework implements a comprehensive test data management strategy using:

1. **Data Factory Pattern** - Programmatic generation of realistic test data
2. **Static Test Data Files** - Pre-defined test data for consistent scenarios
3. **Data Isolation** - Unique identifiers prevent test interference
4. **Data-Driven Testing** - CSV/JSON files for parameterized testing
5. **Test Data Cleanup** - Automatic cleanup strategies

---

## 🏭 Data Factory Pattern

### Why Use Data Factory?

**Benefits:**
- ✅ **Realistic Data**: Generated data mimics production data
- ✅ **No Conflicts**: Unique IDs prevent test interference
- ✅ **Dynamic Values**: Timestamps, random values, UUIDs
- ✅ **Maintainable**: Centralized data generation logic
- ✅ **Scalable**: Generate unlimited test data on-demand

### Factory Methods

#### 1. User Factory

```javascript
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));

// Generate customer
const customer = TestDataFactory.createUser('customer');

// Generate vendor
const vendor = TestDataFactory.createUser('vendor');

// Generate admin
const admin = TestDataFactory.createUser('admin');
```

**Features:**
- Unique email addresses (timestamp-based)
- Random phone numbers (11 digits)
- Random addresses (street, city, state, zip)
- Role-based generation
- ISO 8601 timestamps

#### 2. Product Factory

```javascript
const product = TestDataFactory.createProduct(vendorId);
```

**Features:**
- Random categories (Electronics, Clothing, Books, Home, Sports)
- Random prices ($10-$1000)
- Random stock levels (10-110 units)
- Unique SKUs
- Product images
- Tags and metadata

#### 3. Order Factory

```javascript
const items = [
    { productId: 'prod_001', quantity: 2, price: 199.99 },
    { productId: 'prod_002', quantity: 1, price: 299.99 }
];

const order = TestDataFactory.createOrder(userId, items);
```

**Features:**
- Automatic total calculation (subtotal, tax, shipping, discount)
- 8% tax rate
- Free shipping on orders > $50
- Order status initialization
- Shipping address generation

#### 4. Payment Method Factory

```javascript
const paymentMethod = TestDataFactory.createPaymentMethod();
```

**Features:**
- Valid test card numbers (Luhn algorithm compliant)
- Random cardholder names
- Future expiry dates
- Valid CVV codes

#### 5. Coupon Factory

```javascript
const coupon = TestDataFactory.createCoupon();
```

**Features:**
- Unique coupon codes
- Random discount types (percentage/fixed)
- Random discount values
- 30-day validity
- Minimum order amounts

### Unique ID Generation

```javascript
const uniqueId = TestDataFactory.generateUniqueId();
// Returns: TEST_1709123456789_1234
```

**Format:**
```
TEST_{timestamp}_{random}
```

**Benefits:**
- Globally unique across test runs
- Sortable by creation time
- Easy to identify test data
- No collision risk

---

## 📁 Test Data Files

### File Structure

```
postman-tests/data/
├── test-users.json          # Pre-defined users (5 users)
├── test-products.json       # Sample products (5 products)
├── test-coupons.json        # Coupon codes (3 coupons)
├── test-orders-data.csv     # Order scenarios (10 rows)
└── inventory-scenarios.json # Inventory test cases (5 scenarios)
```

### 1. test-users.json

**Purpose:** Pre-defined user accounts for consistent testing

**Contents:**
- 1 Admin user
- 1 Vendor user
- 3 Customer users

**Usage:**
```javascript
// Load in pre-request script
const testUsers = JSON.parse(pm.environment.get('testUsers'));
const admin = testUsers.find(u => u.role === 'admin');

pm.request.body.raw = JSON.stringify({
    email: admin.email,
    password: admin.password
});
```

### 2. test-products.json

**Purpose:** Sample products across different categories

**Categories:**
- Electronics (Headphones, Smart Watch)
- Sports (Running Shoes)
- Clothing (T-Shirt)
- Books (Programming Book)

**Usage:**
```javascript
const products = JSON.parse(pm.environment.get('testProducts'));
const product = products.find(p => p.category === 'Electronics');

pm.environment.set('productId', product.id);
```

### 3. test-coupons.json

**Purpose:** Coupon codes for discount testing

**Types:**
- Percentage discount (10% off)
- Fixed discount ($20 off)
- Free shipping

**Usage:**
```javascript
const coupons = JSON.parse(pm.environment.get('testCoupons'));
const coupon = coupons.find(c => c.code === 'WELCOME10');

pm.environment.set('couponCode', coupon.code);
```

### 4. test-orders-data.csv

**Purpose:** Data-driven order creation testing

**Columns:**
```csv
orderId,productId,quantity,expectedPrice,couponCode,expectedTotal
ORD001,prod_001,1,199.99,WELCOME10,189.99
ORD002,prod_002,2,299.99,,599.98
```

**Usage with Newman:**
```bash
newman run collection.json \
  -e environment.json \
  -d data/test-orders-data.csv \
  -n 10
```

### 5. inventory-scenarios.json

**Purpose:** Inventory management test scenarios

**Scenarios:**
- Low Stock Alert
- Out of Stock
- Sufficient Stock
- Stock Reservation
- Stock Release

**Usage:**
```javascript
const scenarios = JSON.parse(pm.environment.get('inventoryScenarios'));
const scenario = scenarios.find(s => s.scenario === 'Low Stock Alert');

pm.test('[Inventory] Low stock alert triggered', () => {
    pm.expect(scenario.expectedAlert).to.be.true;
});
```

---

## 🔒 Data Isolation Strategy

### Problem: Test Interference

**Without Isolation:**
```
Test A creates user "testuser@example.com"
Test B tries to create same user → FAILS (duplicate)
```

**With Isolation:**
```
Test A creates "testuser.1709123456789@example.com"
Test B creates "testuser.1709123987654@example.com"
No conflicts!
```

### Implementation

#### 1. Timestamp-Based Unique IDs

```javascript
const timestamp = Date.now(); // 1709123456789
const email = `user.${timestamp}@testmail.com`;
```

#### 2. Random Component

```javascript
const random = Math.floor(Math.random() * 10000);
const id = `TEST_${Date.now()}_${random}`;
```

#### 3. Environment Variable Scoping

```javascript
// Save user ID for this test run
pm.environment.set('currentUserId', user.id);

// Clean up after test
pm.environment.unset('currentUserId');
```

### Test Data Lifecycle

```
1. Pre-request: Generate/Load test data
2. Request: Use test data
3. Test: Validate response
4. Cleanup: Remove/reset test data (optional)
```

---

## 🔄 Data-Driven Testing

### What is Data-Driven Testing?

Run the **same test** with **different data** from external files (CSV/JSON).

### Benefits

- ✅ **Test Coverage**: Test multiple scenarios with one test
- ✅ **Maintainability**: Separate test logic from test data
- ✅ **Scalability**: Easy to add new test cases (just add rows)
- ✅ **Reusability**: Same test data for different tests

### CSV Data-Driven Testing

**File: test-orders-data.csv**
```csv
orderId,productId,quantity,expectedPrice,couponCode,expectedTotal
ORD001,prod_001,1,199.99,WELCOME10,189.99
ORD002,prod_002,2,299.99,,599.98
ORD003,prod_003,1,129.99,SAVE20,109.99
```

**Test Script:**
```javascript
// Access iteration data
const productId = pm.iterationData.get('productId');
const quantity = pm.iterationData.get('quantity');
const expectedTotal = pm.iterationData.get('expectedTotal');

pm.test('[Data-Driven] Order total matches expected', () => {
    const actual = pm.response.json().total;
    pm.expect(actual).to.equal(parseFloat(expectedTotal));
});
```

**Run with Newman:**
```bash
newman run collection.json \
  -e environment.json \
  -d data/test-orders-data.csv \
  -n 10  # Run 10 iterations
```

**Output:**
```
Iteration 1/10: ORD001, prod_001, qty=1, coupon=WELCOME10
Iteration 2/10: ORD002, prod_002, qty=2, no coupon
Iteration 3/10: ORD003, prod_003, qty=1, coupon=SAVE20
...
```

### JSON Data-Driven Testing

**File: test-scenarios.json**
```json
[
  {
    "scenario": "Low Stock Alert",
    "productId": "prod_001",
    "currentStock": 5,
    "threshold": 10,
    "expectedAlert": true
  },
  {
    "scenario": "Sufficient Stock",
    "productId": "prod_003",
    "currentStock": 100,
    "threshold": 10,
    "expectedAlert": false
  }
]
```

**Test Script:**
```javascript
const scenario = pm.iterationData.get('scenario');
const expectedAlert = pm.iterationData.get('expectedAlert');

pm.test(`[${scenario}] Alert status correct`, () => {
    const alertTriggered = pm.response.json().alert;
    pm.expect(alertTriggered).to.equal(expectedAlert);
});
```

---

## ✅ Best Practices

### 1. Use Factory for Dynamic Data

**❌ Don't:**
```javascript
const user = {
    email: "test@example.com",  // Hardcoded - will conflict
    name: "Test User"
};
```

**✅ Do:**
```javascript
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));
const user = TestDataFactory.createUser('customer');  // Unique every time
```

### 2. Use Static Files for Reference Data

**Good for:**
- Predefined user accounts (admin, vendor)
- Sample products
- Test coupons
- Configuration data

**Not good for:**
- Data that changes frequently
- Data that needs to be unique per test run

### 3. Save Critical Data for Request Chaining

```javascript
// After creating user
const user = pm.response.json();
pm.environment.set('userId', user.id);
pm.environment.set('authToken', user.token);

// Next request can use
const userId = pm.environment.get('userId');
```

### 4. Clean Up After Tests

```javascript
// In final test or collection-level teardown
pm.environment.unset('userId');
pm.environment.unset('orderId');
pm.environment.unset('tempData');
```

### 5. Validate Generated Data

```javascript
// After generating data
const product = TestDataFactory.createProduct();

pm.test('[Data Factory] Generated product is valid', () => {
    pm.expect(product).to.have.property('id');
    pm.expect(product).to.have.property('price');
    pm.expect(product.price).to.be.greaterThan(0);
    pm.expect(product.stock).to.be.at.least(10);
});
```

### 6. Use Meaningful Test Data

```javascript
// ❌ Bad
const product = { name: "aaa", price: 1 };

// ✅ Good
const product = {
    name: "Wireless Headphones - Premium Noise Cancelling",
    price: 199.99
};
```

### 7. Document Test Data Requirements

```javascript
/**
 * Test: Order Creation
 *
 * Required Data:
 * - userId: Valid user ID from environment
 * - productId: Valid product with stock > 0
 * - quantity: Integer between 1-10
 * - paymentMethod: Valid payment method object
 *
 * Generated Data:
 * - orderId: Unique order ID (TEST_timestamp_random)
 * - createdAt: Current ISO timestamp
 */
```

### 8. Use Data Snapshots for Verification

```javascript
// Before operation - take snapshot
const beforeStock = pm.response.json().stock;
pm.environment.set('stockBefore', beforeStock.toString());

// After operation - verify change
const afterStock = pm.response.json().stock;
const before = parseInt(pm.environment.get('stockBefore'));

pm.test('[Verification] Stock decreased by order quantity', () => {
    const orderQty = parseInt(pm.environment.get('orderQuantity'));
    pm.expect(afterStock).to.equal(before - orderQty);
});
```

---

## 📊 Test Data Summary

| Data Type | Source | Unique | When to Use |
|-----------|--------|--------|-------------|
| Dynamic Users | Data Factory | ✅ Yes | Most tests |
| Static Users | test-users.json | ❌ No | Login, role testing |
| Dynamic Products | Data Factory | ✅ Yes | Product creation tests |
| Static Products | test-products.json | ❌ No | Order creation, cart tests |
| Dynamic Orders | Data Factory | ✅ Yes | Order workflow tests |
| Order Scenarios | test-orders-data.csv | ❌ No | Data-driven testing |
| Coupons | test-coupons.json | ❌ No | Discount testing |
| Inventory Scenarios | inventory-scenarios.json | ❌ No | Stock management tests |

---

## 🔗 Related Documentation

- [ADVANCED-FEATURES.md](./ADVANCED-FEATURES.md) - Complete framework documentation
- [API-TESTING-GUIDE.md](./API-TESTING-GUIDE.md) - API testing fundamentals
- [TEST-CASES-EXPERT.md](./TEST-CASES-EXPERT.md) - Test case documentation

---

**Built with ❤️ by Michael Zhou**
**For questions: zhou_juxi@hotmail.com**
