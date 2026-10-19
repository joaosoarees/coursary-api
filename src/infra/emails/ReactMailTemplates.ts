import { render } from 'react-email';

import type { MailTemplates } from '@application/gateways/mail/MailTemplates';
import {
  WelcomeEmail,
  welcomeEmailSubject,
} from '@infra/emails/templates/account/WelcomeEmail';

export class ReactMailTemplates implements MailTemplates {
  async welcome({ name }: { name: string }): Promise<MailTemplates.Content> {
    const email = WelcomeEmail({ name });
    const [html, text] = await Promise.all([
      render(email),
      render(email, { plainText: true }),
    ]);

    return { subject: welcomeEmailSubject, html, text };
  }
}
