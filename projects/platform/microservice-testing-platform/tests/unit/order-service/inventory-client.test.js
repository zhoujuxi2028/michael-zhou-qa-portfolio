// Must be set before requiring the client (module reads env at load time).
process.env.INVENTORY_RETRY_BASE_MS = '0';
process.env.INVENTORY_TIMEOUT_MS = '50';
process.env.INVENTORY_MAX_ATTEMPTS = '3';

// CodeQL js/request-forgery (#872 / alert 588): productId must not alter the request path
const { ERROR_CODES } = require('../../../shared/constants');
const client = require('../../../services/order-service/src/services/inventory-client');

const okResponse = { ok: true, json: async () => ({ deducted: 1 }) };
const http503 = { ok: false, status: 503, json: async () => ({}) };
const http409 = {
  ok: false,
  status: 409,
  json: async () => ({ error: 'INSUFFICIENT_STOCK', available: 5, requested: 10 }),
};

function abortingFetch() {
  return jest.fn(
    (_url, opts) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })
  );
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(okResponse);
});

afterEach(() => {
  delete global.fetch;
});

describe('inventory-client productId validation', () => {
  test('valid productId → requests inventory path', async () => {
    await client.checkAndDeduct('PROD-001', 1, 'ORD-1', 'cid');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/inventory\/PROD-001\/deduct$/);
  });

  test.each(['../admin', 'PROD-001/../../x', 'PROD 001', 'a?b=1', 'x#y', '', 'x'.repeat(65)])(
    'checkAndDeduct rejects %p without sending a request',
    async (bad) => {
      await expect(client.checkAndDeduct(bad, 1, 'ORD-1', 'cid')).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_ERROR,
      });
      expect(global.fetch).not.toHaveBeenCalled();
    }
  );

  test('rollback rejects path traversal without sending a request', async () => {
    await expect(client.rollback('../admin', 1, 'ORD-1', 'r', 'cid')).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('non-string productId is rejected', async () => {
    await expect(
      client.checkAndDeduct({ toString: () => 'PROD-001' }, 1, 'ORD-1', 'cid')
    ).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
    });
  });
});

describe('inventory-client timeout + retry (idempotency enables safe retry)', () => {
  test('retries on 5xx and succeeds on a later attempt', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(http503).mockResolvedValueOnce(okResponse);

    const result = await client.checkAndDeduct('PROD-001', 1, 'ORD-1', 'cid');

    expect(result).toEqual({ deducted: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('throws SERVICE_UNAVAILABLE after exhausting retries on persistent 5xx', async () => {
    global.fetch = jest.fn().mockResolvedValue(http503);

    await expect(client.checkAndDeduct('PROD-001', 1, 'ORD-1', 'cid')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
    expect(global.fetch).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS
  });

  test('does not retry 4xx business errors (e.g. INSUFFICIENT_STOCK)', async () => {
    global.fetch = jest.fn().mockResolvedValue(http409);

    await expect(client.checkAndDeduct('PROD-001', 10, 'ORD-1', 'cid')).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      available: 5,
      requested: 10,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1); // no retry
  });

  test('retries on network error and succeeds', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(okResponse);

    const result = await client.checkAndDeduct('PROD-001', 1, 'ORD-1', 'cid');

    expect(result).toEqual({ deducted: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('times out (AbortError) and eventually fails with SERVICE_UNAVAILABLE', async () => {
    global.fetch = abortingFetch();

    await expect(client.checkAndDeduct('PROD-001', 1, 'ORD-1', 'cid')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
    expect(global.fetch).toHaveBeenCalledTimes(3); // retried each timeout
  });
});
