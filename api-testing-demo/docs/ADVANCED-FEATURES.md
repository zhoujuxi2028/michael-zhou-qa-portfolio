# 🚀 Advanced Features - Expert-Level Test Framework

**Version:** 1.0.0
**Last Updated:** 2026-02-25
**Author:** Michael Zhou

---

## 📋 Table of Contents

- [Overview](#overview)
- [Custom Validation Library](#custom-validation-library)
- [Test Data Factory](#test-data-factory)
- [Error Handler & Retry Logic](#error-handler--retry-logic)
- [Usage Examples](#usage-examples)

---

## 🎯 Overview

This test framework includes three powerful components embedded in the collection-level pre-request script:

1. **ValidationLibrary** - Advanced validation and business rule checking
2. **TestDataFactory** - Realistic test data generation
3. **ErrorHandler** - Retry logic, circuit breaker, rate limiting

These components are available to **all requests** in the collection via `pm.globals`.

---

## 🔍 Custom Validation Library

### Overview

The `ValidationLibrary` provides enterprise-grade validation capabilities including:
- JSON Schema validation with custom rules
- Business logic validation (order totals, inventory, pricing)
- Cross-request data correlation
- Format validation (email, credit card, etc.)
- Performance validation

### API Reference

#### 1. Schema Validation

```javascript
const ValidationLibrary = JSON.parse(pm.globals.get('ValidationLibrary'));

const data = pm.response.json();
const schema = {
    type: 'object',
    required: ['id', 'name', 'email'],
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
    }
};

const result = ValidationLibrary.validateSchema(data, schema);
if (result.valid) {
    console.log('✅ Schema validation passed');
} else {
    console.error('❌ Validation errors:', result.errors);
}
```

#### 2. Business Rule Validators

##### Order Total Calculation

```javascript
pm.test('[Business] Order total calculated correctly', () => {
    const order = pm.response.json();
    const isValid = ValidationLibrary.businessRules.orderTotalIsCorrect(order);
    pm.expect(isValid).to.be.true;
});
```

**What it validates:**
- Subtotal = sum of (price × quantity) for all items
- Tax = subtotal × taxRate
- Total = subtotal + tax + shipping - discount
- Floating-point precision (within $0.01)

##### Stock Validation

```javascript
const product = { stock: 50 };
const requestedQuantity = 30;

const ValidationLibrary = JSON.parse(pm.globals.get('ValidationLibrary'));
const sufficient = ValidationLibrary.businessRules.stockSufficient(product, requestedQuantity);

pm.test('[Business] Stock is sufficient', () => {
    pm.expect(sufficient).to.be.true;
});
```

##### Price Range Validation

```javascript
const product = { price: 199.99 };

const isValid = ValidationLibrary.businessRules.priceInRange(product, 10, 1000);

pm.test('[Business] Price is within acceptable range', () => {
    pm.expect(isValid).to.be.true;
});
```

##### State Transition Validation

```javascript
const allowedTransitions = {
    'pending': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': []
};

const currentStatus = 'pending';
const newStatus = 'processing';

const isValid = ValidationLibrary.businessRules.validStateTransition(
    currentStatus,
    newStatus,
    allowedTransitions
);

pm.test('[State] Order status transition is valid', () => {
    pm.expect(isValid).to.be.true;
});
```

##### Email Validation

```javascript
const email = 'user@example.com';
const isValid = ValidationLibrary.businessRules.isValidEmail(email);

pm.test('[Validation] Email format is valid', () => {
    pm.expect(isValid).to.be.true;
});
```

##### Credit Card Validation (Luhn Algorithm)

```javascript
const cardNumber = '4532015112830366'; // Valid test card

const isValid = ValidationLibrary.businessRules.isValidCardNumber(cardNumber);

pm.test('[Validation] Credit card number is valid (Luhn check)', () => {
    pm.expect(isValid).to.be.true;
});
```

**Test Cards:**
- Visa: `4532015112830366`
- MasterCard: `5425233430109903`
- Amex: `374245455400126`

##### Coupon Validation

```javascript
const coupon = {
    code: 'SAVE20',
    active: true,
    expiryDate: '2027-12-31T23:59:59Z',
    minimumOrderAmount: 100
};

const orderTotal = 150;
const currentDate = new Date();

const isValid = ValidationLibrary.businessRules.isCouponValid(coupon, orderTotal, currentDate);

pm.test('[Business] Coupon is valid for this order', () => {
    pm.expect(isValid).to.be.true;
});
```

#### 3. Cross-Request Data Correlation

##### Order Matches Cart

```javascript
const cart = {
    items: [
        { productId: 'prod_001', quantity: 2, price: 199.99 },
        { productId: 'prod_002', quantity: 1, price: 299.99 }
    ]
};

const order = pm.response.json();

const matches = ValidationLibrary.correlationChecks.orderMatchesCart(cart, order);

pm.test('[Correlation] Order items match cart items', () => {
    pm.expect(matches).to.be.true;
});
```

##### Inventory Deduction Verification

```javascript
const beforeStock = parseInt(pm.environment.get('productStock_before'));
const afterStock = pm.response.json().stock;
const orderQuantity = parseInt(pm.environment.get('orderQuantity'));

const correct = ValidationLibrary.correlationChecks.inventoryDeductedCorrectly(
    beforeStock,
    afterStock,
    orderQuantity
);

pm.test('[Correlation] Inventory deducted correctly', () => {
    pm.expect(correct).to.be.true;
});
```

#### 4. Performance Validators

```javascript
pm.test('[Performance] Response time acceptable', () => {
    const acceptable = ValidationLibrary.performance.responseTimeAcceptable(
        pm.response.responseTime,
        2000 // threshold in ms
    );
    pm.expect(acceptable).to.be.true;
});

pm.test('[Performance] Pagination page size optimal', () => {
    const pageSize = pm.response.json().per_page;
    const optimal = ValidationLibrary.performance.paginationOptimal(pageSize);
    pm.expect(optimal).to.be.true;
});
```

---

## 🏭 Test Data Factory

### Overview

`TestDataFactory` generates realistic, randomized test data for:
- Users (with different roles)
- Products (across multiple categories)
- Orders (with correct calculations)
- Addresses
- Payment methods
- Coupons

### API Reference

#### Generate Unique ID

```javascript
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));
const uniqueId = TestDataFactory.generateUniqueId();
// Returns: TEST_1709123456789_1234
```

#### Create User

```javascript
// In pre-request script
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));

const customer = TestDataFactory.createUser('customer');
const vendor = TestDataFactory.createUser('vendor');
const admin = TestDataFactory.createUser('admin');

pm.environment.set('testUser', JSON.stringify(customer));
```

**Generated User Object:**
```json
{
  "id": "TEST_1709123456789_1234",
  "email": "john.doe.1709123456789@testmail.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer",
  "phone": "+12345678901",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "createdAt": "2026-02-25T10:30:00.000Z"
}
```

#### Create Product

```javascript
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));
const vendorId = pm.environment.get('vendorId');

const product = TestDataFactory.createProduct(vendorId);
pm.environment.set('testProduct', JSON.stringify(product));
```

**Generated Product Object:**
```json
{
  "id": "TEST_1709123456789_5678",
  "name": "Test Product Wireless Headphones",
  "description": "Premium noise-cancelling headphones",
  "category": "Electronics",
  "price": 199.99,
  "stock": 50,
  "vendorId": "vendor_123",
  "sku": "SKU-TEST_1709123456789_5678",
  "images": ["https://example.com/images/TEST_1709123456789_5678.jpg"],
  "tags": ["electronics", "test"],
  "active": true,
  "createdAt": "2026-02-25T10:30:00.000Z"
}
```

#### Create Order

```javascript
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));
const userId = pm.environment.get('userId');

const items = [
    { productId: 'prod_001', quantity: 2, price: 199.99 },
    { productId: 'prod_002', quantity: 1, price: 299.99 }
];

const order = TestDataFactory.createOrder(userId, items);
pm.environment.set('testOrder', JSON.stringify(order));
```

**Generated Order Object:**
```json
{
  "id": "TEST_1709123456789_9012",
  "userId": "user_123",
  "items": [...],
  "subtotal": 699.97,
  "taxRate": 0.08,
  "tax": 56.00,
  "shippingCost": 0.00,
  "discount": 0,
  "total": 755.97,
  "status": "pending",
  "paymentStatus": "pending",
  "shippingAddress": {...},
  "createdAt": "2026-02-25T10:30:00.000Z",
  "updatedAt": "2026-02-25T10:30:00.000Z"
}
```

**Calculation Logic:**
- Subtotal = sum of (price × quantity)
- Tax = subtotal × 0.08 (8%)
- Shipping = $9.99 if subtotal < $50, otherwise $0
- Total = subtotal + tax + shipping - discount

#### Create Payment Method

```javascript
const paymentMethod = TestDataFactory.createPaymentMethod();
pm.environment.set('paymentMethod', JSON.stringify(paymentMethod));
```

**Generated Payment Method:**
```json
{
  "type": "credit_card",
  "cardNumber": "4532015112830366",
  "cardholderName": "John Doe",
  "expiryMonth": 12,
  "expiryYear": 2028,
  "cvv": "123"
}
```

#### Create Coupon

```javascript
const coupon = TestDataFactory.createCoupon();
pm.environment.set('testCoupon', JSON.stringify(coupon));
```

**Generated Coupon:**
```json
{
  "code": "TESTCOUPON1234",
  "discountType": "percentage",
  "discountValue": 15,
  "minimumOrderAmount": 50,
  "expiryDate": "2026-03-27T10:30:00.000Z",
  "active": true
}
```

---

## ⚡ Error Handler & Retry Logic

### Overview

`ErrorHandler` provides production-grade error handling:
- **Exponential Backoff Retry** - Automatic retry with increasing delays
- **Circuit Breaker Pattern** - Prevent cascade failures
- **Rate Limiting Handler** - Respect server rate limits
- **Idempotency Key Management** - Prevent duplicate operations

### API Reference

#### 1. Circuit Breaker

**States:**
- `CLOSED` - Normal operation
- `OPEN` - Failures exceeded threshold, fast-fail
- `HALF_OPEN` - Testing if system recovered

```javascript
// In test script
const ErrorHandler = JSON.parse(pm.globals.get('ErrorHandler'));

// Check if request should be allowed
const allowed = ErrorHandler.circuitBreaker.shouldAllowRequest();
if (!allowed) {
    console.warn('🛑 Circuit breaker is OPEN - skipping request');
    pm.test('[Circuit Breaker] Request blocked (circuit open)', () => {
        pm.expect(allowed).to.be.false;
    });
}

// Record success/failure
if (pm.response.code >= 200 && pm.response.code < 300) {
    ErrorHandler.circuitBreaker.recordSuccess();
} else if (pm.response.code >= 500) {
    ErrorHandler.circuitBreaker.recordFailure();
}

pm.globals.set('ErrorHandler', JSON.stringify(ErrorHandler));
```

**Configuration:**
- Failure Threshold: 3 failures
- Timeout: 60 seconds (OPEN → HALF_OPEN transition)

#### 2. Retry Logic with Exponential Backoff

```javascript
// In test script
const ErrorHandler = JSON.parse(pm.globals.get('ErrorHandler'));

if (pm.response.code >= 500 || pm.response.code === 408) {
    const shouldRetry = ErrorHandler.retry.shouldRetry(pm.response.code, 3);

    if (shouldRetry) {
        const attempt = ErrorHandler.retry.incrementAttempt();
        const delay = ErrorHandler.retry.calculateBackoffDelay(attempt - 1);

        console.log(`⏳ Retry ${attempt} after ${delay}ms`);

        pm.test(`[Retry] Scheduled retry ${attempt} with ${delay}ms delay`, () => {
            pm.expect(delay).to.be.greaterThan(0);
        });
    } else {
        console.error('❌ Max retries exceeded');
        ErrorHandler.retry.resetAttempt();
    }

    pm.globals.set('ErrorHandler', JSON.stringify(ErrorHandler));
} else {
    ErrorHandler.retry.resetAttempt();
    pm.globals.set('ErrorHandler', JSON.stringify(ErrorHandler));
}
```

**Backoff Formula:**
```
delay = baseDelay × 2^attempt
```

**Example:**
- Attempt 1: 1000ms (1s)
- Attempt 2: 2000ms (2s)
- Attempt 3: 4000ms (4s)

#### 3. Idempotency Key Management

```javascript
// In pre-request script (for POST/PUT/PATCH)
const ErrorHandler = JSON.parse(pm.globals.get('ErrorHandler'));
const idempotencyKey = ErrorHandler.idempotency.setKey();

pm.request.headers.add({
    key: 'Idempotency-Key',
    value: idempotencyKey
});

console.log(`🔑 Idempotency Key: ${idempotencyKey}`);
```

```javascript
// In test script - verify idempotency
const savedKey = ErrorHandler.idempotency.getKey();

pm.test('[Idempotency] Idempotency key was set', () => {
    pm.expect(savedKey).to.exist;
    console.log(`Idempotency key used: ${savedKey}`);
});
```

#### 4. Rate Limiting Handler

```javascript
// In test script
const ErrorHandler = JSON.parse(pm.globals.get('ErrorHandler'));

if (pm.response.code === 429) {
    const result = ErrorHandler.rateLimit.handleResponse(pm.response);

    if (result.shouldRetry) {
        console.warn(`⏱️  Rate limited. Retry after ${result.delay}ms`);

        pm.test('[Rate Limit] Retry-After header parsed', () => {
            pm.expect(result.delay).to.be.greaterThan(0);
        });
    }
}
```

**Reads Header:**
- `Retry-After` (seconds)
- Falls back to 5 seconds if header missing

---

## 💡 Usage Examples

### Example 1: Complete Order Validation

```javascript
// In test script
const ValidationLibrary = JSON.parse(pm.globals.get('ValidationLibrary'));
const order = pm.response.json();

// Level 1: HTTP Status
pm.test('[HTTP] Status code is 201 Created', () => {
    pm.response.to.have.status(201);
});

// Level 2: Schema Validation
const orderSchema = {
    type: 'object',
    required: ['id', 'userId', 'items', 'total', 'status'],
    properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        items: { type: 'array' },
        total: { type: 'number' },
        status: { type: 'string' }
    }
};

pm.test('[Schema] Response matches order schema', () => {
    const result = ValidationLibrary.validateSchema(order, orderSchema);
    pm.expect(result.valid).to.be.true;
});

// Level 3: Business Logic
pm.test('[Business] Order total calculated correctly', () => {
    const isValid = ValidationLibrary.businessRules.orderTotalIsCorrect(order);
    pm.expect(isValid).to.be.true;
});

// Level 4: State Validation
pm.test('[State] Order status is valid initial state', () => {
    pm.expect(['pending', 'processing']).to.include(order.status);
});

// Level 5: Performance
pm.test('[Performance] Response time acceptable', () => {
    const acceptable = ValidationLibrary.performance.responseTimeAcceptable(pm.response.responseTime);
    pm.expect(acceptable).to.be.true;
});
```

### Example 2: Data-Driven Test with Factory

```javascript
// In pre-request script
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));

// Get iteration data (if using CSV/JSON data file)
const productId = pm.iterationData.get('productId');
const quantity = pm.iterationData.get('quantity');

// Generate order with factory
const userId = pm.environment.get('userId');
const items = [{
    productId: productId,
    quantity: quantity,
    price: parseFloat(pm.iterationData.get('price'))
}];

const order = TestDataFactory.createOrder(userId, items);

// Set request body
pm.request.body.raw = JSON.stringify(order);
```

### Example 3: Complete Error Handling Workflow

```javascript
// In test script
const ErrorHandler = JSON.parse(pm.globals.get('ErrorHandler'));

// 1. Check circuit breaker
if (!ErrorHandler.circuitBreaker.shouldAllowRequest()) {
    pm.test('[Circuit Breaker] Fast-fail - circuit is OPEN', () => {
        pm.expect(ErrorHandler.circuitBreaker.getState()).to.equal('OPEN');
    });
    return;
}

// 2. Handle response
if (pm.response.code >= 200 && pm.response.code < 300) {
    // Success
    ErrorHandler.circuitBreaker.recordSuccess();
    ErrorHandler.retry.resetAttempt();

    pm.test('✅ Request successful', () => {
        pm.response.to.be.success;
    });

} else if (pm.response.code === 429) {
    // Rate limiting
    const rateLimitResult = ErrorHandler.rateLimit.handleResponse(pm.response);
    console.warn(`Rate limited. Wait ${rateLimitResult.delay}ms`);

} else if (pm.response.code >= 500) {
    // Server error - retry logic
    if (ErrorHandler.retry.shouldRetry(pm.response.code)) {
        const attempt = ErrorHandler.retry.incrementAttempt();
        const delay = ErrorHandler.retry.calculateBackoffDelay(attempt - 1);
        console.log(`Retry ${attempt} scheduled after ${delay}ms`);
    } else {
        console.error('Max retries exceeded');
        ErrorHandler.circuitBreaker.recordFailure();
    }
}

pm.globals.set('ErrorHandler', JSON.stringify(ErrorHandler));
```

---

## 🎓 Best Practices

### 1. Always Load Libraries in Test Scripts

```javascript
// At the beginning of test script
const ValidationLibrary = JSON.parse(pm.globals.get('ValidationLibrary'));
const TestDataFactory = JSON.parse(pm.globals.get('TestDataFactory'));
const ErrorHandler = JSON.parse(pm.globals.get('ErrorHandler'));
```

### 2. Update ErrorHandler After Modifications

```javascript
// After modifying ErrorHandler state
pm.globals.set('ErrorHandler', JSON.stringify(ErrorHandler));
```

### 3. Use Structured Test Naming

```javascript
pm.test('[Category] Test description', () => {
    // Test code
});
```

**Categories:**
- `[HTTP]` - Status code checks
- `[Schema]` - JSON schema validation
- `[Business]` - Business rule validation
- `[State]` - State transition validation
- `[Correlation]` - Cross-request data checks
- `[Performance]` - Response time validation
- `[Retry]` - Retry logic tests
- `[Circuit Breaker]` - Circuit breaker tests

### 4. Save Critical Data for Next Requests

```javascript
// Save for request chaining
pm.environment.set('orderId', order.id);
pm.environment.set('orderData', JSON.stringify(order));
```

### 5. Clean Up After Tests

```javascript
// In collection-level test script or final request
pm.environment.unset('tempData');
ErrorHandler.circuitBreaker.resetFailures();
ErrorHandler.retry.resetAttempt();
```

---

## 📊 Framework Capabilities Summary

| Feature | Description | Complexity Level |
|---------|-------------|------------------|
| JSON Schema Validation | Validate response structure | ⭐⭐⭐ |
| Business Rule Validation | Order totals, inventory, pricing | ⭐⭐⭐⭐ |
| Luhn Algorithm | Credit card validation | ⭐⭐⭐⭐ |
| Cross-Request Correlation | Data consistency checks | ⭐⭐⭐⭐⭐ |
| Data Factory | Realistic test data generation | ⭐⭐⭐ |
| Exponential Backoff | Intelligent retry mechanism | ⭐⭐⭐⭐ |
| Circuit Breaker | Prevent cascade failures | ⭐⭐⭐⭐⭐ |
| Rate Limiting Handler | Respect API rate limits | ⭐⭐⭐ |
| Idempotency Management | Prevent duplicate operations | ⭐⭐⭐⭐ |

---

**Built with ❤️ by Michael Zhou**
**For questions or feedback: zhou_juxi@hotmail.com**
