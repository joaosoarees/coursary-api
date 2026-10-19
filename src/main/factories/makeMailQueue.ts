import type { MailQueue } from '@application/gateways/mail/MailQueue';
import { SqsMailQueue } from '@infra/gateways/mail/SqsMailQueue';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeMailQueue(): MailQueue {
  const appConfig = makeAppConfig();

  return new SqsMailQueue(appConfig);
}
