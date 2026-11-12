import { beforeEach, describe, expect, it } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import { ConsumeRealtimeTicketUseCase } from '@application/usecases/realtime/ConsumeRealtimeTicketUseCase';

let world: Awaited<ReturnType<typeof realtimeWorld>>;

const store = async () => {
  const issued = RealtimeTicket.issue({
    accountId: world.student.id,
    lesson: { courseId: world.course.id, lessonId: world.lesson.id },
  });
  await world.tickets.save(issued.ticket);

  return issued;
};

const consume = (token: string, now?: Date) =>
  new ConsumeRealtimeTicketUseCase(world.tickets).execute({ token, now });

beforeEach(async () => {
  world = await realtimeWorld();
});

describe('ConsumeRealtimeTicketUseCase', () => {
  it('should hand the ticket over once', async () => {
    const { ticket, token } = await store();

    await expect(consume(token)).resolves.toEqual(ticket);
    await expect(consume(token)).resolves.toBeNull();
    await expect(world.storedTicket(token)).resolves.toBeUndefined();
  });

  it('should refuse an unknown ticket and one past its thirty seconds', async () => {
    const { ticket, token } = await store();

    await expect(consume('not-a-ticket')).resolves.toBeNull();
    await expect(consume(token, ticket.expiresAt)).resolves.toBeNull();
  });
});
