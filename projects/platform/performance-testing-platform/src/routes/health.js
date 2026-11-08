const { Router } = require('express');
const { getMetrics } = require('../middleware/metrics');

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', (_req, res) => {
  res.json({ ready: true });
});

router.get('/metrics', (_req, res) => {
  res.json(getMetrics());
});

module.exports = router;
