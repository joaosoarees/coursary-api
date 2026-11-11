import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import { RealtimeConnectionItem } from '@infra/database/dynamo/items/realtime/RealtimeConnectionItem';

describe('RealtimeConnectionItem', () => {
  it('should key the connection by its id and index it by the lesson', () => {
    const student = Account.create({ name: 'Bia', email: 'b@example.com' });
    const lessonId = Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo');
    const connection = RealtimeConnection.open({
      id: RealtimeConnection.toId('L0SM9cOFvHcCIhw='),
      apiId: 'abc123def4',
      accountId: student.id,
      lessonId,
      connectedAt: new Date('2026-11-11T12:00:00.000Z'),
    });

    const item = RealtimeConnectionItem.fromEntity(connection).toItem();

    expect(item).toMatchObject({
      PK: 'CONNECTION#L0SM9cOFvHcCIhw=',
      SK: 'CONNECTION#L0SM9cOFvHcCIhw=',
      GSI1PK: `REALTIME#LESSON#${lessonId}`,
      GSI1SK: 'CONNECTION#L0SM9cOFvHcCIhw=',
      type: 'RealtimeConnection',
      expiresAt: Date.parse('2026-11-11T14:15:00.000Z') / 1000,
    });
    expect(RealtimeConnectionItem.toEntity(item)).toEqual(connection);
  });
});
