import { describe, expect, it } from 'vitest';

import {
  courseStudentsQuerySchema,
  savePositionSchema,
} from '@application/controllers/enrollment/schemas';

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

describe('courseStudentsQuerySchema', () => {
  it('should list the newest enrollment first unless asked otherwise', () => {
    expect(courseStudentsQuerySchema.parse({})).toEqual({
      limit: 20,
      order: 'desc',
    });
    expect(courseStudentsQuerySchema.parse({ order: 'asc' })).toMatchObject({
      order: 'asc',
    });
  });

  it('should refuse an order other than asc or desc', () => {
    expect(courseStudentsQuerySchema.safeParse({ order: 'name' }).success).toBe(
      false,
    );
  });
});
