import { SendEmailCommand, SESv2ServiceException } from '@aws-sdk/client-sesv2';

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
    const command = new SendEmailCommand({
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
    });

    const { MessageId } = await SesMailGateway.sending(command);

    if (!MessageId) {
      throw new Error('SES accepted the e-mail without a message id.');
    }

    return { messageId: MessageId };
  }

  // SES names the recipient in its messages ("Email address is not verified: …"); only the
  // error's name goes on, so no address reaches the logs.
  private static async sending(command: SendEmailCommand) {
    try {
      return await sesClient.send(command);
    } catch (error) {
      if (error instanceof SESv2ServiceException) {
        // The cause would carry the address this drops.
        // eslint-disable-next-line preserve-caught-error
        throw new Error(`SES refused the e-mail: ${error.name}.`);
      }

      throw error;
    }
  }
}
