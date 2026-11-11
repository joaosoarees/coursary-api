import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import type { Account } from '@application/entities/account/Account';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Question } from '@application/entities/question/Question';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeChannel } from '@application/gateways/realtime/RealtimeChannel';
import { PushLessonChangesUseCase } from '@application/usecases/realtime/PushLessonChangesUseCase';

let world: Awaited<ReturnType<typeof realtimeWorld>>;

const questionId = Question.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo');

const connect = async (
  id: string,
  {
    account = world.student,
    lessonId = world.lesson.id,
    apiId = 'api-1',
    connectedAt = new Date(),
  }: {
    account?: Account;
    lessonId?: Lesson.Id;
    apiId?: string;
    connectedAt?: Date;
  } = {},
) => {
  await world.connections.save(
    RealtimeConnection.open({
      id: RealtimeConnection.toId(`${run}-${id}`),
      apiId,
      accountId: account.id,
      lessonId,
      connectedAt,
    }),
  );
};

// Connection ids are global to the table: each test names its own.
let run: string;
const named = (id: string) => id.slice(run.length + 1);

const channelThat = (answer: (id: string) => Promise<'sent' | 'gone'>) => {
  const post = vi.fn<RealtimeChannel['post']>((id) => answer(named(id)));

  return { channel: { apiId: 'api-1', post }, post };
};

const sent = () => Promise.resolve('sent' as const);

beforeEach(async () => {
  world = await realtimeWorld();
  run = randomUUID();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('PushLessonChangesUseCase', () => {
  it('should tell every live connection of the lesson which question changed', async () => {
    await connect('c-1');
    await connect('c-2', { account: world.owner });
    await connect('c-old', {
      connectedAt: new Date(Date.now() - 3 * 3600_000),
    });
    await connect('c-other-api', { apiId: 'api-2' });
    const { channel, post } = channelThat(sent);

    await new PushLessonChangesUseCase(world.connections, channel).execute({
      lessonId: world.lesson.id,
      questionIds: [questionId],
      listChanged: true,
    });

    expect(post.mock.calls.map(([id]) => named(id)).sort()).toEqual([
      'c-1',
      'c-2',
    ]);
    expect(post).toHaveBeenCalledWith(`${run}-c-1`, {
      type: 'answers',
      lessonId: world.lesson.id,
      questionId,
    });
  });

  it('should send the list change alone when no question answered', async () => {
    await connect('c-1');
    const { channel, post } = channelThat(sent);

    await new PushLessonChangesUseCase(world.connections, channel).execute({
      lessonId: world.lesson.id,
      questionIds: [],
      listChanged: true,
    });

    expect(post).toHaveBeenCalledExactlyOnceWith(`${run}-c-1`, {
      type: 'questions',
      lessonId: world.lesson.id,
    });
  });

  it('should drop a connection that is gone and keep the others', async () => {
    await connect('c-gone');
    await connect('c-1');
    const { channel } = channelThat((id) =>
      Promise.resolve(id === 'c-gone' ? 'gone' : 'sent'),
    );

    await new PushLessonChangesUseCase(world.connections, channel).execute({
      lessonId: world.lesson.id,
      questionIds: [],
      listChanged: true,
    });

    await expect(
      world.storedConnection(`${run}-c-gone`),
    ).resolves.toBeUndefined();
    await expect(world.storedConnection(`${run}-c-1`)).resolves.toBeDefined();
  });

  it('should reach the rest and then fail, keeping a connection whose post failed', async () => {
    await connect('c-broken');
    await connect('c-1');
    const { channel, post } = channelThat((id) =>
      id === 'c-broken'
        ? Promise.reject(new Error('AccessDeniedException'))
        : Promise.resolve('sent'),
    );

    await expect(
      new PushLessonChangesUseCase(world.connections, channel).execute({
        lessonId: world.lesson.id,
        questionIds: [],
        listChanged: true,
      }),
    ).rejects.toThrow('1 connections');
    expect(post).toHaveBeenCalledWith(`${run}-c-1`, expect.anything());
    await expect(
      world.storedConnection(`${run}-c-broken`),
    ).resolves.toBeDefined();
  });
});
