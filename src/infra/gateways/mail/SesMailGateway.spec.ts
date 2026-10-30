import { MessageRejected, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sesClient } from '@infra/clients/sesClient';
import { SesMailGateway } from '@infra/gateways/mail/SesMailGateway';
import { AppConfig } from '@shared/config/AppConfig';

const gateway = new SesMailGateway(new AppConfig());
const mail = {
  to: 'ana@example.com',
  subject: 'Boas-vindas',
  html: '<p>Olá</p>',
  text: 'Olá',
};

beforeEach(() => {
  vi.stubEnv('MAIL_FROM', 'Coursary <noreply@example.com>');
});

describe('SesMailGateway', () => {
  it('should send the e-mail from MAIL_FROM with HTML and text, in UTF-8', async () => {
    const send = vi
      .spyOn(sesClient, 'send')
      .mockResolvedValue({ MessageId: 'ses-1' } as never);

    await expect(gateway.send(mail)).resolves.toEqual({ messageId: 'ses-1' });

    const command = send.mock.calls[0]?.[0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toEqual({
      FromEmailAddress: 'Coursary <noreply@example.com>',
      Destination: { ToAddresses: ['ana@example.com'] },
      Content: {
        Simple: {
          Subject: { Data: 'Boas-vindas', Charset: 'UTF-8' },
          Body: {
            Html: { Data: '<p>Olá</p>', Charset: 'UTF-8' },
            Text: { Data: 'Olá', Charset: 'UTF-8' },
          },
        },
      },
    });
  });

  it('should fail when SES answers without a message id', async () => {
    vi.spyOn(sesClient, 'send').mockResolvedValue({} as never);

    await expect(gateway.send(mail)).rejects.toThrow('without a message id');
  });

  it("should pass on SES's error by name only, never the recipient's address", async () => {
    const rejected = new MessageRejected({
      message: 'Email address is not verified. ana@example.com',
      $metadata: {},
    });
    vi.spyOn(sesClient, 'send').mockRejectedValue(rejected);

    const failure = await gateway.send(mail).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe(
      'SES refused the e-mail: MessageRejected.',
    );
    expect((failure as Error).message).not.toContain('ana@example.com');
  });
});
