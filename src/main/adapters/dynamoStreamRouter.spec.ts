import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { CatalogIndexQueue } from '@application/gateways/catalog/CatalogIndexQueue';
import type { MailQueue } from '@application/gateways/mail/MailQueue';
import { dynamoStreamRouter } from '@main/adapters/dynamoStreamRouter';

const published = (id: string, title: string) => ({
  type: 'Course',
  id,
  title,
  instructorName: 'Ana',
  status: 'PUBLISHED',
  publishedAt: '2026-10-17T12:00:00.000Z',
});

const modify = (
  eventID: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DynamoDBRecord => ({
  eventID,
  eventName: 'MODIFY',
  dynamodb: {
    OldImage: marshall(before) as never,
    NewImage: marshall(after) as never,
  },
});

const routeInto = () => {
  const courses: CatalogIndexQueue.Request[] = [];
  const signUps: AuthGateway.ExpiredSignUp[] = [];
  const mails: MailQueue.Request[] = [];
  const deletions: string[] = [];
  const route = dynamoStreamRouter(
    {
      enqueue: (requests) => {
        courses.push(...requests);

        return Promise.resolve();
      },
    },
    {
      enqueue: (expired) => {
        signUps.push(...expired);

        return Promise.resolve();
      },
    },
    {
      enqueue: (requests) => {
        mails.push(...requests);

        return Promise.resolve();
      },
    },
    {
      enqueue: (courseIds) => {
        deletions.push(...courseIds);

        return Promise.resolve();
      },
    },
  );

  return { route, courses, signUps, mails, deletions };
};

describe('dynamoStreamRouter', () => {
  it('should enqueue the courses whose search record changed, in order, one per change', async () => {
    const { route, courses, signUps } = routeInto();

    await route({
      Records: [
        modify('e1', published('c1', 'A'), published('c1', 'B')),
        modify('e2', published('c2', 'A'), {
          ...published('c2', 'A'),
          enrollmentCount: 1,
        }),
        modify('e3', published('c1', 'B'), published('c1', 'C')),
      ],
    });

    expect(courses).toEqual([
      { courseId: 'c1', deduplicationId: 'e1' },
      { courseId: 'c1', deduplicationId: 'e3' },
    ]);
    expect(signUps).toEqual([]);
  });

  it('should send a sign-up the TTL removed to the cleanup queue', async () => {
    const { route, courses, signUps } = routeInto();
    const accountId = anAccountId();

    await route({
      Records: [
        {
          eventID: 'e1',
          eventName: 'REMOVE',
          userIdentity: {
            type: 'Service',
            principalId: 'dynamodb.amazonaws.com',
          },
          dynamodb: {
            OldImage: marshall({
              type: 'Account',
              id: accountId,
              email: 'ana@example.com',
              status: 'PENDING',
            }) as never,
          },
        },
      ],
    });

    expect(signUps).toEqual([{ accountId, email: 'ana@example.com' }]);
    expect(courses).toEqual([]);
  });

  it('should ask for a welcome e-mail when a confirmation turns an account active', async () => {
    const { route, mails, signUps } = routeInto();
    const accountId = anAccountId();
    const account = (status: string) =>
      marshall({ type: 'Account', id: accountId, status }) as never;

    await route({
      Records: [
        {
          eventID: 'e1',
          eventName: 'MODIFY',
          dynamodb: {
            OldImage: account('PENDING'),
            NewImage: account('ACTIVE'),
          },
        },
      ],
    });

    expect(mails).toEqual([{ kind: 'welcome', accountId }]);
    expect(signUps).toEqual([]);
  });

  it('should start the notice fan-out when a course is archived, besides reindexing it', async () => {
    const { route, mails, courses } = routeInto();
    const courseId = anAccountId();

    await route({
      Records: [
        modify(
          'e1',
          { ...published(courseId, 'A') },
          { ...published(courseId, 'A'), status: 'ARCHIVED' },
        ),
      ],
    });

    expect(mails).toEqual([{ kind: 'course-archived-fanout', courseId }]);
    expect(courses).toEqual([{ courseId, deduplicationId: 'e1' }]);
  });

  it('should start the deletion of a draft the delete route marked', async () => {
    const { route, deletions, courses } = routeInto();
    const courseId = anAccountId();
    const draft = (status: string) =>
      marshall({ type: 'Course', id: courseId, status }) as never;

    await route({
      Records: [
        {
          eventID: 'e1',
          eventName: 'MODIFY',
          dynamodb: { OldImage: draft('DRAFT'), NewImage: draft('DELETING') },
        },
      ],
    });

    expect(deletions).toEqual([courseId]);
    expect(courses).toEqual([]);
  });
});
