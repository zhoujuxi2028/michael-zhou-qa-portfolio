# 📖 API Testing Guide

**Version**: 1.0.0
**Last Updated**: 2026-02-21
**Author**: Michael Zhou

---

## 📋 Table of Contents

- [Introduction](#introduction)
- [API Testing Basics](#api-testing-basics)
- [Postman Features](#postman-features)
- [Writing Test Scripts](#writing-test-scripts)
- [Best Practices](#best-practices)
- [Advanced Topics](#advanced-topics)

---

## 🎯 Introduction

This guide covers API testing using Postman and Newman, including:
- RESTful API testing fundamentals
- Postman collection development
- Test automation with Newman
- CI/CD integration

---

## 📚 API Testing Basics

### What is API Testing?

API (Application Programming Interface) testing is a type of software testing that validates:
- **Functionality**: Does the API work as expected?
- **Performance**: How fast does the API respond?
- **Security**: Is the API secure?
- **Reliability**: Does the API handle errors gracefully?

### HTTP Methods

| Method | Purpose | Example |
|--------|---------|---------|
| GET | Retrieve data | `GET /api/users/123` |
| POST | Create new resource | `POST /api/users` |
| PUT | Update entire resource | `PUT /api/users/123` |
| PATCH | Partial update | `PATCH /api/users/123` |
| DELETE | Delete resource | `DELETE /api/users/123` |

### HTTP Status Codes

| Code Range | Category | Examples |
|------------|----------|----------|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirection | 301 Moved, 304 Not Modified |
| 4xx | Client Error | 400 Bad Request, 401 Unauthorized, 404 Not Found |
| 5xx | Server Error | 500 Internal Error, 503 Service Unavailable |

---

## 🚀 Postman Features

### Collections

Organize requests into logical groups:
- By feature (User Management, Products, etc.)
- By test type (Smoke, Regression, Performance)
- By environment (Dev, Staging, Production)

### Environments

Manage variables for different testing stages:
- Development: Local testing
- Staging: Pre-production
- Production: Read-only smoke tests

### Variables

Types of variables:
- **Global**: Available across all collections
- **Collection**: Scoped to a collection
- **Environment**: Environment-specific values
- **Local**: Temporary, single request

### Pre-request Scripts

Execute code before sending request:
```javascript
// Set timestamp
pm.environment.set("timestamp", Date.now());

// Generate random data
pm.environment.set("randomEmail", `test${Math.random()}@example.com`);

// Set authentication token
const token = pm.environment.get("authToken");
pm.request.headers.add({
    key: "Authorization",
    value: `Bearer ${token}`
});
```

### Test Scripts

Validate responses after request:
```javascript
// Status code test
pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
});

// Response time test
pm.test("Response time < 500ms", function() {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// JSON body test
pm.test("Response has user data", function() {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('email');
});
```

---

## ✍️ Writing Test Scripts

### Basic Assertions

```javascript
// Status code
pm.test("Status is 200", () => {
    pm.response.to.have.status(200);
});

// Response time
pm.test("Response time is acceptable", () => {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});

// Header check
pm.test("Content-Type is JSON", () => {
    pm.expect(pm.response.headers.get("Content-Type"))
      .to.include("application/json");
});
```

### JSON Schema Validation

```javascript
const schema = {
    type: "object",
    required: ["id", "name", "email"],
    properties: {
        id: { type: "number" },
        name: { type: "string" },
        email: { type: "string", format: "email" }
    }
};

pm.test("Response matches schema", () => {
    pm.response.to.have.jsonSchema(schema);
});
```

### Response Body Assertions

```javascript
pm.test("User data is correct", () => {
    const jsonData = pm.response.json();

    // Property existence
    pm.expect(jsonData).to.have.property("id");

    // Value check
    pm.expect(jsonData.name).to.equal("John Doe");

    // Type check
    pm.expect(jsonData.age).to.be.a("number");

    // Array checks
    pm.expect(jsonData.roles).to.be.an("array");
    pm.expect(jsonData.roles).to.include("admin");
});
```

### Chaining Requests

```javascript
// Save data from response
const responseData = pm.response.json();
pm.environment.set("userId", responseData.id);
pm.environment.set("authToken", responseData.token);

// Use in next request
// URL: {{baseUrl}}/users/{{userId}}
// Header: Authorization: Bearer {{authToken}}
```

---

## 🎯 Best Practices

### Test Organization

1. **Folder Structure**:
   ```
   Collection
   ├── Authentication
   │   ├── Register User
   │   ├── Login
   │   └── Logout
   ├── User Management
   │   ├── Get User
   │   ├── Update User
   │   └── Delete User
   └── Error Handling
       ├── Invalid Credentials
       └── Not Found
   ```

2. **Naming Conventions**:
   - Descriptive names: `GET - Retrieve User by ID`
   - Include method: `POST - Create New User`
   - Clear purpose: `DELETE - Remove User (Error: Not Found)`

### Test Coverage

Test all scenarios:
- ✅ **Happy path**: Valid inputs, successful responses
- ✅ **Negative testing**: Invalid inputs, error handling
- ✅ **Boundary testing**: Min/max values, empty strings
- ✅ **Edge cases**: Null values, special characters

### Environment Management

```javascript
// Don't hardcode values
❌ pm.sendRequest("https://api.example.com/users");

// Use environment variables
✅ pm.sendRequest(`${pm.environment.get("baseUrl")}/users`);
```

### Error Handling

```javascript
pm.test("API returns proper error for invalid input", () => {
    pm.response.to.have.status(400);

    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("error");
    pm.expect(jsonData.error).to.have.property("message");
    pm.expect(jsonData.error.code).to.equal("INVALID_INPUT");
});
```

---

## 🔥 Advanced Topics

### Data-Driven Testing

Use CSV or JSON files for multiple test iterations:

**test-data.json**:
```json
[
    {"username": "user1", "email": "user1@example.com"},
    {"username": "user2", "email": "user2@example.com"}
]
```

**Run with Newman**:
```bash
newman run collection.json -d test-data.json -n 2
```

### Dynamic Variables

Postman provides built-in dynamic variables:
```
{{$guid}}           - UUID
{{$timestamp}}      - Current timestamp
{{$randomInt}}      - Random integer
{{$randomEmail}}    - Random email
{{$randomFirstName}} - Random first name
```

### Performance Testing

```javascript
pm.test("Response time < 200ms (P95)", () => {
    pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test("Response time < 500ms (P99)", () => {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

### Authentication

**Bearer Token**:
```javascript
pm.request.headers.add({
    key: "Authorization",
    value: `Bearer ${pm.environment.get("authToken")}`
});
```

**Basic Auth**:
```javascript
const username = pm.environment.get("username");
const password = pm.environment.get("password");
const credentials = btoa(`${username}:${password}`);

pm.request.headers.add({
    key: "Authorization",
    value: `Basic ${credentials}`
});
```

### Retry Logic

```javascript
const maxRetries = 3;
let retryCount = pm.environment.get("retryCount") || 0;

if (pm.response.code === 429 && retryCount < maxRetries) {
    // Rate limited, retry
    retryCount++;
    pm.environment.set("retryCount", retryCount);

    setTimeout(() => {
        pm.sendRequest(pm.request);
    }, 1000 * retryCount); // Exponential backoff
} else {
    pm.environment.unset("retryCount");
}
```

---

## 📊 Reporting

### Newman HTML Report

```bash
newman run collection.json \
    -e environment.json \
    -r html \
    --reporter-html-export report.html
```

### Custom Reporting

```javascript
// In test script
const testResult = {
    name: pm.info.requestName,
    status: pm.response.code,
    time: pm.response.responseTime
};

// Save to collection variable
let results = pm.collectionVariables.get("results") || [];
results.push(testResult);
pm.collectionVariables.set("results", results);
```

---

## 🔗 Resources

- **Postman Learning Center**: https://learning.postman.com/
- **Newman Documentation**: https://github.com/postmanlabs/newman
- **Chai Assertion Library**: https://www.chaijs.com/
- **API Testing Best Practices**: https://restfulapi.net/

---

**Happy Testing! 🧪✨**
