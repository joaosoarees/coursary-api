import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Account } from '@application/entities/account/Account';
import {
  websocketConnectAdapter,
  websocketDisconnectAdapter,
} from '@main/adapters/websocketConnectionAdapter';

const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const lessonId = '2HZXtsyCWqKbYadQSGc1G5hSJPo';
const courseId = '2HZXtsyCWqKbYadQSGc1G5hSJPp';

const connectEvent = (authorizer: Record<string, unknown>) => ({
  requestContext: {
    routeKey: '$connect',
    connectionId: 'L0SM9cOFvHcCIhw=',
    apiId: 'abc123def4',
    connectedAt: Date.parse('2026-11-11T12:00:00.000Z'),
    authorizer: { principalId: student.id, ...authorizer },
  },
  queryStringParameters: { ticket: 'never-read-here' },
});

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

describe('websocketConnectAdapter', () => {
  it('should open the connection for the account and lesson the authorizer passed', async () => {
    const execute = vi.fn(() => Promise.resolve());

    await expect(
      websocketConnectAdapter({ execute })(
        connectEvent({ accountId: student.id, courseId, lessonId }),
      ),
    ).resolves.toEqual({ statusCode: 200 });
    expect(execute).toHaveBeenCalledWith({
      id: 'L0SM9cOFvHcCIhw=',
      apiId: 'abc123def4',
      accountId: student.id,
      courseId,
      lessonId,
      connectedAt: new Date('2026-11-11T12:00:00.000Z'),
    });
  });

  it('should refuse a connection the authorizer did not describe', async () => {
    const execute = vi.fn(() => Promise.resolve());

    await expect(
      websocketConnectAdapter({ execute })(
        connectEvent({ courseId, lessonId }),
      ),
    ).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('websocketDisconnectAdapter', () => {
  it('should close the connection by its id', async () => {
    const execute = vi.fn(() => Promise.resolve());

    await expect(
      websocketDisconnectAdapter({ execute })({
        requestContext: {
          connectionId: 'L0SM9cOFvHcCIhw=',
          disconnectStatusCode: 1001,
        },
      }),
    ).resolves.toEqual({ statusCode: 200 });
    expect(execute).toHaveBeenCalledWith({ id: 'L0SM9cOFvHcCIhw=' });
  });
});
