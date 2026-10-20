import type { ReactElement } from 'react';
import { render } from 'react-email';

import type { MailTemplates } from '@application/gateways/mail/MailTemplates';
import {
  WelcomeEmail,
  welcomeEmailSubject,
} from '@infra/emails/templates/account/WelcomeEmail';
import {
  CourseArchivedEmail,
  courseArchivedSubject,
} from '@infra/emails/templates/course/CourseArchivedEmail';

export class ReactMailTemplates implements MailTemplates {
  welcome({ name }: { name: string }): Promise<MailTemplates.Content> {
    return ReactMailTemplates.content(
      welcomeEmailSubject,
      WelcomeEmail({ name }),
    );
  }

  courseArchived({
    name,
    title,
  }: {
    name: string;
    title: string;
  }): Promise<MailTemplates.Content> {
    return ReactMailTemplates.content(
      courseArchivedSubject(title),
      CourseArchivedEmail({ name, title }),
    );
  }

  private static async content(
    subject: string,
    email: ReactElement,
  ): Promise<MailTemplates.Content> {
    const [html, text] = await Promise.all([
      render(email),
      render(email, { plainText: true }),
    ]);

    return { subject, html, text };
  }
}
