import type { MailTemplates } from '@application/gateways/mail/MailTemplates';

// Plain strings, so a test can see exactly what reached the e-mail.
export class FakeMailTemplates implements MailTemplates {
  welcome({ name }: { name: string }): Promise<MailTemplates.Content> {
    return Promise.resolve({
      subject: 'Boas-vindas',
      html: `<p>Olá, ${name}</p>`,
      text: `Olá, ${name}`,
    });
  }

  courseArchived({
    name,
    title,
  }: {
    name: string;
    title: string;
  }): Promise<MailTemplates.Content> {
    return Promise.resolve({
      subject: `Arquivado: ${title}`,
      html: `<p>${name}, ${title}</p>`,
      text: `${name}, ${title}`,
    });
  }
}
