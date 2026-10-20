import { describe, expect, it } from 'vitest';

import {
  createLessonSchema,
  outlineBodySchema,
  updateLessonSchema,
} from '@application/controllers/outline/schemas';

describe('lesson schemas', () => {
  it('should take a body up to 32 KiB in UTF-8 bytes', () => {
    const lesson = { title: 'Keys', durationMinutes: 10 };

    expect(
      createLessonSchema.safeParse({ ...lesson, body: 'a'.repeat(32 * 1024) })
        .success,
    ).toBe(true);
    expect(
      createLessonSchema.safeParse({
        ...lesson,
        body: 'é'.repeat(16 * 1024 + 1),
      }).success,
    ).toBe(false);
  });

  it('should keep the duration a whole number from 1 to 600', () => {
    for (const durationMinutes of [0, 601, 1.5]) {
      expect(
        createLessonSchema.safeParse({ title: 'Keys', durationMinutes })
          .success,
      ).toBe(false);
    }
  });

  it('should ask an update for at least one field', () => {
    expect(updateLessonSchema.safeParse({}).success).toBe(false);
  });
});

describe('outlineBodySchema', () => {
  it('should refuse a malformed id', () => {
    expect(
      outlineBodySchema.safeParse({ modules: [{ id: 'x', lessonIds: [] }] })
        .success,
    ).toBe(false);
  });
});
