const express = require('express');
const paymentModel = require('../models/payment');
const { ERROR_CODES } = require('../../../../shared/constants');

const router = express.Router();

router.get('/:orderId', (req, res) => {
  const payment = paymentModel.getByOrderId(req.params.orderId);
  if (!payment) {
    return res.status(404).json({
      error: ERROR_CODES.PAYMENT_NOT_FOUND,
      message: `Payment for order ${req.params.orderId} not found`,
    });
  }
  res.json({
    id: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,
    status: payment.status,
    processedAt: payment.processed_at,
  });
});

module.exports = router;
