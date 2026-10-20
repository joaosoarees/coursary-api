import type { MailTemplates } from '@application/gateways/mail/MailTemplates';
import { ReactMailTemplates } from '@infra/emails/ReactMailTemplates';

export function makeMailTemplates(): MailTemplates {
  return new ReactMailTemplates();
}
