import { describe, expect, it } from 'vitest';

import { renderAuthEmail } from '@infra/emails/renderAuthEmail';

describe('renderAuthEmail', () => {
  it.each([
    ['CustomMessage_SignUp', 'Confirme seu e-mail no Coursary'],
    ['CustomMessage_ResendCode', 'Confirme seu e-mail no Coursary'],
    ['CustomMessage_ForgotPassword', 'Redefinição de senha do Coursary'],
  ] as const)('should write our own e-mail for %s', async (source, subject) => {
    const email = await renderAuthEmail(source, '{####}');

    expect(email?.subject).toBe(subject);
    expect(email?.html).toContain('{####}');
  });

  it('should leave the messages the app does not use to Cognito', async () => {
    await expect(
      renderAuthEmail('CustomMessage_AdminCreateUser', '{####}'),
    ).resolves.toBeNull();
  });
});
