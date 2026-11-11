import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import { websocketAuthorizerAdapter } from '@main/adapters/websocketAuthorizerAdapter';

const methodArn =
  'arn:aws:execute-api:sa-east-1:123456789012:abc123def4/dev/$connect';
const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const { ticket } = RealtimeTicket.issue({
  accountId: student.id,
  courseId: Course.create({ instructor: student, title: 'T' }).id,
  lessonId: Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo'),
});

const connect = (query: Record<string, string> | null) =>
  ({
    methodArn,
    queryStringParameters: query,
  }) as APIGatewayRequestAuthorizerEvent;

describe('websocketAuthorizerAdapter', () => {
  it('should let the ticket holder in, carrying the account and the lesson', async () => {
    const execute = vi.fn(() => Promise.resolve(ticket));

    const result = await websocketAuthorizerAdapter({ execute })(
      connect({ ticket: 'token-1' }),
    );

    expect(execute).toHaveBeenCalledWith({ token: 'token-1' });
    expect(result).toEqual({
      principalId: student.id,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: methodArn,
          },
        ],
      },
      context: { accountId: student.id, lessonId: ticket.lessonId },
    });
  });

  it('should deny a refused ticket, and one never sent without asking', async () => {
    const execute = vi.fn(() => Promise.resolve(null));
    const authorize = websocketAuthorizerAdapter({ execute });

    await expect(authorize(connect({ ticket: 'used' }))).resolves.toMatchObject(
      {
        policyDocument: { Statement: [{ Effect: 'Deny' }] },
      },
    );
    await expect(authorize(connect(null))).resolves.toMatchObject({
      policyDocument: { Statement: [{ Effect: 'Deny' }] },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
