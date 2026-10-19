import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMailGateway } from '@tests/fakes/FakeMailGateway';
import { FakeMailTemplates } from '@tests/fakes/FakeMailTemplates';
import { accountWorld } from '@tests/support/accountWorld';

import { accountStatuses } from '@application/entities/account/Account';
import { MailBusy } from '@application/errors/mail';
import { OnceMailer } from '@application/usecases/mail/OnceMailer';
import { SendWelcomeEmailUseCase } from '@application/usecases/mail/SendWelcomeEmailUseCase';

const templates = new FakeMailTemplates();

let world: ReturnType<typeof accountWorld>;
let mailGateway: FakeMailGateway;
let sendWelcome: SendWelcomeEmailUseCase;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  world = accountWorld();
  mailGateway = new FakeMailGateway();
  sendWelcome = new SendWelcomeEmailUseCase(
    world.accounts,
    templates,
    new OnceMailer(world.sentMails, mailGateway),
  );
});

describe('SendWelcomeEmailUseCase', () => {
  it('should welcome an active account by name, once', async () => {
    const account = await world.addAccount({ name: 'Ana' });

    await expect(sendWelcome.execute({ accountId: account.id })).resolves.toBe(
      'sent',
    );
    await expect(sendWelcome.execute({ accountId: account.id })).resolves.toBe(
      'already-sent',
    );

    expect(mailGateway.sent).toEqual([
      {
        to: account.email,
        subject: 'Boas-vindas',
        html: '<p>Olá, Ana</p>',
        text: 'Olá, Ana',
      },
    ]);
  });

  it('should send nothing to an account that is no longer active', async () => {
    const account = await world.addAccount({
      status: accountStatuses.Disabled,
    });

    await expect(sendWelcome.execute({ accountId: account.id })).resolves.toBe(
      'skipped',
    );
    expect(mailGateway.sent).toEqual([]);
  });

  it('should give the message back while another attempt holds the claim', async () => {
    const account = await world.addAccount();
    await world.sentMails.claim({
      accountId: account.id,
      kind: 'welcome',
      now: new Date(),
      leaseSeconds: 120,
    });

    await expect(
      sendWelcome.execute({ accountId: account.id }),
    ).rejects.toBeInstanceOf(MailBusy);
    expect(mailGateway.sent).toEqual([]);
  });

  it('should let a later attempt send when SES failed', async () => {
    const account = await world.addAccount();
    mailGateway.failWith = new Error('throttled');

    await expect(
      sendWelcome.execute({ accountId: account.id }),
    ).rejects.toThrow('throttled');

    mailGateway.failWith = undefined;
    vi.useFakeTimers({ now: Date.now() + 121_000 });
    await expect(sendWelcome.execute({ accountId: account.id })).resolves.toBe(
      'sent',
    );
    vi.useRealTimers();
  });
});
