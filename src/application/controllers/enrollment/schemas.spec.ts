import { describe, expect, it } from 'vitest';

import { savePositionSchema } from '@application/controllers/enrollment/schemas';

const lessonId = '2Wk1zbcTqPHEuTXoAXZRDcjYKKK';

describe('savePositionSchema', () => {
  it('should accept whole seconds from 0 to a day', () => {
    expect(
      savePositionSchema.safeParse({ lessonId, positionSeconds: 0 }).success,
    ).toBe(true);
    expect(
      savePositionSchema.safeParse({ lessonId, positionSeconds: 86_400 })
        .success,
    ).toBe(true);
  });

  it.each([
    ['a negative position', { lessonId, positionSeconds: -1 }],
    ['a fraction of a second', { lessonId, positionSeconds: 1.5 }],
    ['more than a day', { lessonId, positionSeconds: 86_401 }],
    ['a malformed lesson id', { lessonId: 'nope', positionSeconds: 1 }],
  ])('should refuse %s', (_, body) => {
    expect(savePositionSchema.safeParse(body).success).toBe(false);
  });
});
