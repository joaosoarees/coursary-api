import { randomUUID } from 'node:crypto';

import KSUID from 'ksuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import { Course } from '@application/entities/course/Course';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeChannel } from '@application/gateways/realtime/RealtimeChannel';
import { ApiGatewayRealtimeConnections } from '@infra/gateways/realtime/ApiGatewayRealtimeConnections';

let world: Awaited<ReturnType<typeof realtimeWorld>>;
// Connection ids are global to the table: each test names its own.
let run: string;

const connect = async (
  name: string,
  {
    courseId = world.course.id,
    apiId = 'api-1',
  }: { courseId?: Course.Id; apiId?: string } = {},
) => {
  const id = RealtimeConnection.toId(`${run}-${name}`);
  await world.connections.save(
    RealtimeConnection.open({
      id,
      apiId,
      accountId: world.student.id,
      lesson: { courseId, lessonId: world.lesson.id },
      connectedAt: new Date(),
    }),
  );

  return id;
};

const channelThat = (close: RealtimeChannel['close']) => {
  const closing = vi.fn(close);
  const channel: RealtimeChannel = {
    apiId: 'api-1',
    post: vi.fn<RealtimeChannel['post']>(),
    close: closing,
  };

  return { channel, closing };
};

beforeEach(async () => {
  world = await realtimeWorld();
  run = randomUUID();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('ApiGatewayRealtimeConnections', () => {
  it("should close every connection of the account, or only one course's", async () => {
    const otherCourse = Course.toId(KSUID.randomSync().string);
    const here = await connect('here');
    const elsewhere = await connect('elsewhere', { courseId: otherCourse });
    const { channel, closing } = channelThat(() => Promise.resolve('closed'));
    const connections = new ApiGatewayRealtimeConnections(
      world.connections,
      channel,
    );

    await connections.closeForAccount({
      accountId: world.student.id,
      courseId: world.course.id,
    });

    expect(closing).toHaveBeenCalledExactlyOnceWith(here);
    await expect(world.storedConnection(here)).resolves.toBeUndefined();
    await expect(world.storedConnection(elsewhere)).resolves.toBeDefined();

    await connections.closeForAccount({ accountId: world.student.id });

    expect(closing).toHaveBeenLastCalledWith(elsewhere);
    await expect(world.storedConnection(elsewhere)).resolves.toBeUndefined();
  });

  it('should stop the pushes even when API Gateway refuses to close, without throwing', async () => {
    const refused = await connect('refused');
    const otherApi = await connect('other-api', { apiId: 'api-2' });
    const { channel, closing } = channelThat(() =>
      Promise.reject(new Error('AccessDeniedException')),
    );

    await expect(
      new ApiGatewayRealtimeConnections(
        world.connections,
        channel,
      ).closeForAccount({ accountId: world.student.id }),
    ).resolves.toBeUndefined();

    expect(closing).toHaveBeenCalledExactlyOnceWith(refused);
    await expect(world.storedConnection(refused)).resolves.toBeUndefined();
    await expect(world.storedConnection(otherApi)).resolves.toBeUndefined();
  });
});
