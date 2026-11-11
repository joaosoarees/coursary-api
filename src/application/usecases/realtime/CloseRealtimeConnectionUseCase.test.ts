import { beforeEach, describe, expect, it } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import { CloseRealtimeConnectionUseCase } from '@application/usecases/realtime/CloseRealtimeConnectionUseCase';

let world: Awaited<ReturnType<typeof realtimeWorld>>;

const id = RealtimeConnection.toId('L0SM9cOFvHcCIhw=');

beforeEach(async () => {
  world = await realtimeWorld();
});

describe('CloseRealtimeConnectionUseCase', () => {
  it('should remove the connection, and take a second close quietly', async () => {
    await world.connections.save(
      RealtimeConnection.open({
        id,
        apiId: 'abc123def4',
        accountId: world.student.id,
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
