import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { ticketBodySchema } from '@application/controllers/realtime/schemas';

const courseId = anAccountId();
const lessonId = anAccountId();

describe('ticketBodySchema', () => {
  it('should take a lesson, or nothing for the account alone', () => {
    expect(ticketBodySchema.parse({ courseId, lessonId })).toEqual({
      lesson: { courseId, lessonId },
    });
    expect(ticketBodySchema.parse({})).toEqual({ lesson: undefined });
  });

  it.each([[{ courseId }], [{ lessonId }], [{ courseId, lessonId: 'x' }]])(
    'should refuse %o',
    (body) => {
      expect(ticketBodySchema.safeParse(body).success).toBe(false);
    },
  );
});
