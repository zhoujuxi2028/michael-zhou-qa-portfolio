const logger = require('../utils/logger');
const { ERROR_CODES, PRODUCT_ID_PATTERN } = require('../../../../shared/constants');

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
// Timeout + bounded retry. Retry is safe because inventory deduction is idempotent
// by orderId (see inventory model: de-dupes on (order_id, type=deduct)).
const REQUEST_TIMEOUT_MS = parseInt(process.env.INVENTORY_TIMEOUT_MS || '2000', 10);
const MAX_ATTEMPTS = parseInt(process.env.INVENTORY_MAX_ATTEMPTS || '3', 10);
const RETRY_BASE_DELAY_MS = parseInt(process.env.INVENTORY_RETRY_BASE_MS || '100', 10);

function validationError() {
  const err = new Error(ERROR_CODES.VALIDATION_ERROR);
  err.code = ERROR_CODES.VALIDATION_ERROR;
  return err;
}

function serviceUnavailableError(message) {
  const err = new Error(message || 'Inventory service unavailable');
  err.code = 'SERVICE_UNAVAILABLE';
  return err;
}

// Reject ids that could alter the request path (CodeQL js/request-forgery, #872)
function productPath(productId, action) {
  if (typeof productId !== 'string' || !PRODUCT_ID_PATTERN.test(productId)) {
    throw validationError();
  }
  return `${INVENTORY_URL}/api/inventory/${encodeURIComponent(productId)}/${action}`;
}

async function postJson(url, payload, correlationId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_e) {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAndDeduct(productId, quantity, orderId, correlationId) {
  const url = productPath(productId, 'deduct');
  const payload = { quantity, orderId };
  let lastErr = serviceUnavailableError();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await postJson(url, payload, correlationId);
    } catch (err) {
      // Network error or timeout → retryable
      const reason =
        err.name === 'AbortError' ? `timeout after ${REQUEST_TIMEOUT_MS}ms` : err.message;
      lastErr = serviceUnavailableError(`Inventory request failed: ${reason}`);
      logger.warn('Inventory request failed', { productId, orderId, attempt, error: reason });
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      break;
    }

    const data = await readJson(response);

    if (response.ok) {
      return data;
    }

    if (response.status >= 500) {
      // 5xx → retryable
      lastErr = serviceUnavailableError(`Inventory returned ${response.status}`);
      logger.warn('Inventory 5xx, will retry', {
        productId,
        orderId,
        attempt,
        status: response.status,
      });
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      break;
    }

    // 4xx business error (e.g. INSUFFICIENT_STOCK) → not retryable
    logger.warn('Inventory deduction failed', { productId, orderId, error: data });
    const code = data && data.error ? data.error : 'INVENTORY_REQUEST_REJECTED';
    const err = new Error(code);
    err.code = code;
    if (data) {
      err.available = data.available;
      err.requested = data.requested;
    }
    throw err;
  }

  throw lastErr;
}

async function rollback(productId, quantity, orderId, reason, correlationId) {
  // productPath throws VALIDATION_ERROR synchronously (before any request)
  const url = productPath(productId, 'rollback');
  try {
    const response = await postJson(url, { quantity, orderId, reason }, correlationId);
    return await readJson(response);
  } catch (err) {
    // Best-effort: surface a coded error so callers can log/alert, never hang.
    throw serviceUnavailableError(`Inventory rollback failed: ${err.message}`);
  }
}

module.exports = { checkAndDeduct, rollback };
