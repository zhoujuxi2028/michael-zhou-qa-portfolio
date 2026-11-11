// CodeQL js/request-forgery (#872 / alert 588): productId must not alter the request path
const { ERROR_CODES } = require('../../../shared/constants');
const client = require('../../../services/order-service/src/services/inventory-client');

const okResponse = { ok: true, json: async () => ({ deducted: 1 }) };

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
