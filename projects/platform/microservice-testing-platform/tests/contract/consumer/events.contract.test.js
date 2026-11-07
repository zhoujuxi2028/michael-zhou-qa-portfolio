/**
 * Event Contract Tests
 * Validates that event payloads match the agreed schema.
 */
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schemas = require('../schemas/events.schema');

const ajv = new Ajv();
addFormats(ajv);

describe('Contract: Event Schemas', () => {
  // CT-E-01: order.created event format
  test('order.created event matches schema', () => {
    const event = {
      orderId: 'ORD-20260320-001',
      productId: 'PROD-001',
      quantity: 2,
      totalAmount: 59.98,
      timestamp: '2026-03-20T10:00:00.000Z',
      correlationId: 'corr-uuid-001',
    };

    const valid = ajv.validate(schemas.orderCreatedEvent, event);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-E-02: order.created field types
  test('order.created rejects invalid field types', () => {
    const event = {
      orderId: 'ORD-001',
      productId: 'PROD-001',
      quantity: 'two', // should be integer
      totalAmount: 59.98,
      timestamp: '2026-03-20T10:00:00.000Z',
      correlationId: 'corr-001',
    };

    const valid = ajv.validate(schemas.orderCreatedEvent, event);
    expect(valid).toBe(false);
  });

  // CT-E-03: payment.completed event format
  test('payment.completed event matches schema', () => {
    const event = {
      paymentId: 'PAY-001',
      orderId: 'ORD-20260320-001',
      status: 'completed',
      timestamp: '2026-03-20T10:00:05.000Z',
      correlationId: 'corr-uuid-001',
    };

    const valid = ajv.validate(schemas.paymentCompletedEvent, event);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-E-04: Events contain correlationId
  test('events require correlationId as non-empty string', () => {
    const event = {
      orderId: 'ORD-20260320-001',
      productId: 'PROD-001',
      quantity: 2,
      totalAmount: 59.98,
      timestamp: '2026-03-20T10:00:00.000Z',
      correlationId: '', // empty
    };

    const valid = ajv.validate(schemas.orderCreatedEvent, event);
    expect(valid).toBe(false);
  });

  // CT-E-05: Events contain ISO 8601 timestamp
  test('events require ISO 8601 timestamp', () => {
    const event = {
      paymentId: 'PAY-001',
      orderId: 'ORD-20260320-001',
      status: 'completed',
      timestamp: 'not-a-date',
      correlationId: 'corr-001',
    };

    const valid = ajv.validate(schemas.paymentCompletedEvent, event);
    expect(valid).toBe(false);
  });
});
