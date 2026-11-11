import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import { OpenRealtimeConnectionUseCase } from '@application/usecases/realtime/OpenRealtimeConnectionUseCase';

let world: Awaited<ReturnType<typeof realtimeWorld>>;

let id: RealtimeConnection.Id;

beforeEach(async () => {
  world = await realtimeWorld();
  id = RealtimeConnection.toId(randomUUID());
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
