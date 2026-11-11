import { beforeEach, describe, expect, it } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import { OpenRealtimeConnectionUseCase } from '@application/usecases/realtime/OpenRealtimeConnectionUseCase';

let world: Awaited<ReturnType<typeof realtimeWorld>>;

const id = RealtimeConnection.toId('L0SM9cOFvHcCIhw=');

beforeEach(async () => {
  world = await realtimeWorld();
});

describe('OpenRealtimeConnectionUseCase', () => {
  it('should keep the connection under the lesson', async () => {
    await new OpenRealtimeConnectionUseCase(world.connections).execute({
      id,
      apiId: 'abc123def4',
      accountId: world.student.id,
      lessonId: world.lesson.id,
      connectedAt: new Date(),
    });

    await expect(world.storedConnection(id)).resolves.toMatchObject({
      accountId: world.student.id,
      GSI1PK: `REALTIME#LESSON#${world.lesson.id}`,
    });
  });
});
