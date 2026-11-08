const express = require('express');
const orderModel = require('../models/order');
const inventoryClient = require('../services/inventory-client');
const redisPublisher = require('../services/redis-publisher');
const { ORDER_STATUS, ERROR_CODES } = require('../../../../shared/constants');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { productId, quantity, unitPrice } = req.body;

    // Create order in pending state
    const order = orderModel.create({ productId, quantity, unitPrice });

    // Deduct inventory (sync REST call)
    try {
      await inventoryClient.checkAndDeduct(productId, quantity, order.id, req.correlationId);
      orderModel.updateStatus(order.id, ORDER_STATUS.CONFIRMED);
    } catch (err) {
      orderModel.updateStatus(order.id, ORDER_STATUS.CANCELLED);
      return res.status(err.code === ERROR_CODES.INSUFFICIENT_STOCK ? 409 : 503).json({
        error: err.code || 'SERVICE_UNAVAILABLE',
        message: err.message,
        orderId: order.id,
      });
    }

    // Publish order.created event (async)
    try {
      await redisPublisher.publishOrderCreated(order, req.correlationId);
    } catch (err) {
      logger.warn('Failed to publish order.created', { orderId: order.id, error: err.message });
    }

    const updated = orderModel.getById(order.id);
    res.status(201).json({
      id: updated.id,
      productId: updated.product_id,
      quantity: updated.quantity,
      unitPrice: updated.unit_price,
      totalAmount: updated.total_amount,
      status: updated.status,
      createdAt: updated.created_at,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res) => {
  const order = orderModel.getById(req.params.id);
  if (!order) {
    return res.status(404).json({
      error: ERROR_CODES.ORDER_NOT_FOUND,
      message: `Order ${req.params.id} not found`,
    });
  }
  res.json({
    id: order.id,
    productId: order.product_id,
    quantity: order.quantity,
    unitPrice: order.unit_price,
    totalAmount: order.total_amount,
    status: order.status,
    paymentId: order.payment_id,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  });
});

router.get('/', (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const result = orderModel.list({
    status,
    page: parseInt(page),
    limit: parseInt(limit),
  });
  res.json(result);
});

router.patch('/:id/status', (req, res, next) => {
  try {
    const { status, paymentId } = req.body;
    const updated = orderModel.updateStatus(req.params.id, status, paymentId);
    res.json({
      id: updated.id,
      productId: updated.product_id,
      quantity: updated.quantity,
      unitPrice: updated.unit_price,
      totalAmount: updated.total_amount,
      status: updated.status,
      paymentId: updated.payment_id,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
