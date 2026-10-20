import { describe, expect, it } from 'vitest';

import { courseIdParamsSchema } from '@application/controllers/shared/schemas';

describe('courseIdParamsSchema', () => {
  it('should refuse a malformed id', () => {
    expect(courseIdParamsSchema.safeParse({ courseId: 'nope' }).success).toBe(
      false,
    );
  });
});
