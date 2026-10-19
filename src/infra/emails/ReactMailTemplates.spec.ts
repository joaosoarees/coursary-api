import { describe, expect, it } from 'vitest';

import { ReactMailTemplates } from '@infra/emails/ReactMailTemplates';

describe('ReactMailTemplates.welcome', () => {
  it('should greet the student by name, in HTML and in plain text', async () => {
    const { subject, html, text } = await new ReactMailTemplates().welcome({
      name: 'Ana',
    });

    expect(subject).toBe('Boas-vindas ao Coursary');
    expect(html).toContain('Olá, Ana!');
    expect(html).toContain('lang="pt-BR"');
    // The plain text turns headings into capitals.
    expect(text).toContain('OLÁ, ANA!');
    expect(text).toContain('Bons estudos!');
    expect(text).not.toContain('<');
  });

  it('should escape a name that looks like markup', async () => {
    const { html } = await new ReactMailTemplates().welcome({
      name: '<b>Ana</b>',
    });

    expect(html).not.toContain('<b>Ana</b>');
  });
});

describe('ReactMailTemplates.courseArchived', () => {
  it('should name the course and say the student keeps access', async () => {
    const { subject, html, text } =
      await new ReactMailTemplates().courseArchived({
        name: 'Ana',
        title: 'DynamoDB na prática',
      });

    expect(subject).toBe('O curso DynamoDB na prática foi arquivado');
    expect(html).toContain('O instrutor arquivou o curso DynamoDB na prática.');
    expect(text).toContain('Você continua com acesso às aulas');
  });
});
