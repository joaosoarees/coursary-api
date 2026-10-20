import { describe, expect, it } from 'vitest';

import {
  createCourseSchema,
  updateCourseSchema,
} from '@application/controllers/course/schemas';

describe('createCourseSchema', () => {
  it('should trim the title and default the description', () => {
    expect(createCourseSchema.parse({ title: ' DynamoDB ' })).toEqual({
      title: 'DynamoDB',
      description: '',
    });
  });

  it('should refuse a title under 3 or over 120 characters', () => {
    expect(createCourseSchema.safeParse({ title: ' ab ' }).success).toBe(false);
    expect(
      createCourseSchema.safeParse({ title: 'x'.repeat(121) }).success,
    ).toBe(false);
  });
});

describe('updateCourseSchema', () => {
  it('should ask for at least one field', () => {
    expect(updateCourseSchema.safeParse({}).success).toBe(false);
    expect(updateCourseSchema.safeParse({ description: 'x' }).success).toBe(
      true,
    );
  });
});
