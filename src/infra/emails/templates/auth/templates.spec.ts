import { render } from 'react-email';
import { describe, expect, it } from 'vitest';

import { ConfirmEmail } from '@infra/emails/templates/auth/ConfirmEmail';
import { ForgotPassword } from '@infra/emails/templates/auth/ForgotPassword';

describe.each([
  ['ConfirmEmail', ConfirmEmail],
  ['ForgotPassword', ForgotPassword],
])('%s', (_, template) => {
  it('should keep the code placeholder for Cognito to fill in', async () => {
    const html = await render(template({ code: '{####}' }));

    expect(html).toContain('{####}');
    expect(html).toContain('Coursary');
  });

  it('should stay under the 20,000 characters past which Cognito sends its default text', async () => {
    const html = await render(template({ code: '{####}' }));

    expect(html.length).toBeLessThan(20_000);
  });
});
