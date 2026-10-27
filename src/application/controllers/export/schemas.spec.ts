import { describe, expect, it } from 'vitest';

import { exportIdParamsSchema } from '@application/controllers/export/schemas';

describe('exportIdParamsSchema', () => {
  it('should take a KSUID and refuse anything else', () => {
    const exportId = '2HmQ3Kp0bB1x9Yq4rT7uV8wZ0aC';

    expect(exportIdParamsSchema.parse({ exportId })).toEqual({ exportId });
    expect(exportIdParamsSchema.safeParse({ exportId: 'x' }).success).toBe(
      false,
    );
  });
});
