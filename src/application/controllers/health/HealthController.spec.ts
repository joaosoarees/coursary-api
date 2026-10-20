import { describe, expect, it } from 'vitest';

import { HealthController } from '@application/controllers/health/HealthController';

describe('HealthController', () => {
  it('should answer 200 with status ok', async () => {
    const response = await new HealthController().execute({
      body: {},
      params: {},
      queryParams: {},
      accountId: null,
      role: null,
      account: null,
    });

    expect(response).toEqual({ statusCode: 200, body: { status: 'ok' } });
  });
});
