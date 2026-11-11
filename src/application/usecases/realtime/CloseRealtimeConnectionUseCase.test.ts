import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import { CloseRealtimeConnectionUseCase } from '@application/usecases/realtime/CloseRealtimeConnectionUseCase';

let world: Awaited<ReturnType<typeof realtimeWorld>>;

let id: RealtimeConnection.Id;

beforeEach(async () => {
  world = await realtimeWorld();
  id = RealtimeConnection.toId(randomUUID());
});

describe('CloseRealtimeConnectionUseCase', () => {
  it('should remove the connection, and take a second close quietly', async () => {
    await world.connections.save(
      RealtimeConnection.open({
        id,
        apiId: 'abc123def4',
        accountId: world.student.id,
        courseId: world.course.id,
        lessonId: world.lesson.id,
        connectedAt: new Date(),
      }),
    );
    const close = new CloseRealtimeConnectionUseCase(world.connections);

    await close.execute({ id });
    await close.execute({ id });

    await expect(world.storedConnection(id)).resolves.toBeUndefined();
  });
});
