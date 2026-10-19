import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { mailMessageSchema } from '@main/functions/mail/mailMessageSchema';

const accountId = anAccountId();
const courseId = anAccountId();

describe('mailMessageSchema', () => {
  it.each([
    [{ kind: 'welcome', accountId }],
    [{ kind: 'course-archived-fanout', courseId }],
    [{ kind: 'course-archived-fanout', courseId, cursor: 'eyJQSyI6IngifQ' }],
    [{ kind: 'course-archived', courseId, accountId }],
  ])('should read %o', (message) => {
    expect(mailMessageSchema.parse(message)).toEqual(message);
  });

  it.each([
    [{ kind: 'farewell', accountId }],
    [{ kind: 'welcome' }],
    [{ kind: 'course-archived', courseId }],
    [{ kind: 'course-archived-fanout', courseId, cursor: '' }],
    [{ kind: 'welcome', accountId: 'not-an-id' }],
  ])('should refuse %o', (message) => {
    expect(mailMessageSchema.safeParse(message).success).toBe(false);
  });
});
