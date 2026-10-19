import type { MailGateway } from '@application/gateways/mail/MailGateway';
import { SesMailGateway } from '@infra/gateways/mail/SesMailGateway';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeMailGateway(): MailGateway {
  const appConfig = makeAppConfig();

  return new SesMailGateway(appConfig);
}
