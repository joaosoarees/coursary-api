import { describe, expect, it } from 'vitest';

import { createOrganizationSchema } from '@application/controllers/organization/schemas';

describe('createOrganizationSchema', () => {
  it('should trim the name before measuring it', () => {
    expect(createOrganizationSchema.parse({ name: '  Acme  ' })).toEqual({
      name: 'Acme',
    });
  });

  it.each([' a ', '   ', 'x'.repeat(81)])('should refuse %j', (name) => {
    expect(createOrganizationSchema.safeParse({ name }).success).toBe(false);
  });

  it('should take 2 and 80 characters', () => {
    for (const name of ['ab', 'x'.repeat(80)]) {
      expect(createOrganizationSchema.safeParse({ name }).success).toBe(true);
    }
  });
});
