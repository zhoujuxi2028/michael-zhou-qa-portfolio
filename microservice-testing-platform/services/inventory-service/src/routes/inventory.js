const express = require('express');
const inventoryModel = require('../models/inventory');
const { ERROR_CODES } = require('../../../../shared/constants');

const router = express.Router();

router.get('/:productId', (req, res) => {
  const item = inventoryModel.getByProductId(req.params.productId);
  if (!item) {
    return res.status(404).json({
      error: ERROR_CODES.PRODUCT_NOT_FOUND,
      message: `Product ${req.params.productId} not found`,
    });
  }
  res.json({
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    reserved: item.reserved,
    available: item.available,
  });
});

router.post('/:productId/deduct', (req, res, next) => {
  const { quantity, orderId } = req.body;
  if (!quantity || !orderId) {
    return res.status(400).json({
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'quantity and orderId are required',
    });
  }
  try {
    const result = inventoryModel.deduct(req.params.productId, quantity, orderId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:productId/rollback', (req, res, next) => {
  const { quantity, orderId, reason } = req.body;
  if (!quantity || !orderId) {
    return res.status(400).json({
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'quantity and orderId are required',
    });
  }
  try {
    const result = inventoryModel.rollback(req.params.productId, quantity, orderId, reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
