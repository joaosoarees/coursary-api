import { SendEmailCommand } from '@aws-sdk/client-sesv2';

import type { MailGateway } from '@application/gateways/mail/MailGateway';
import { sesClient } from '@infra/clients/sesClient';
import type { AppConfig } from '@shared/config/AppConfig';

export class SesMailGateway implements MailGateway {
  constructor(private readonly config: AppConfig) {}

  async send({
    to,
    subject,
    html,
    text,
  }: MailGateway.Mail): Promise<MailGateway.Sent> {
    const { MessageId } = await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: this.config.mailFrom,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: html, Charset: 'UTF-8' },
              Text: { Data: text, Charset: 'UTF-8' },
            },
          },
        },
      }),
    );

    if (!MessageId) {
      throw new Error('SES accepted the e-mail without a message id.');
    }

    return { messageId: MessageId };
  }
}
