import type { CustomMessageTriggerEvent } from 'aws-lambda';
import { render } from 'react-email';

import {
  ConfirmEmail,
  confirmEmailSubject,
} from '@infra/emails/templates/auth/ConfirmEmail';
import {
  ForgotPassword,
  forgotPasswordSubject,
} from '@infra/emails/templates/auth/ForgotPassword';

export interface AuthEmail {
  subject: string;
  html: string;
}

export async function renderAuthEmail(
  triggerSource: CustomMessageTriggerEvent['triggerSource'],
  code: string,
): Promise<AuthEmail | null> {
  switch (triggerSource) {
    case 'CustomMessage_SignUp':
    case 'CustomMessage_ResendCode': {
      const email = ConfirmEmail({ code });
      const html = await render(email);

      return { subject: confirmEmailSubject, html };
    }
    case 'CustomMessage_ForgotPassword': {
      const email = ForgotPassword({ code });
      const html = await render(email);

      return { subject: forgotPasswordSubject, html };
    }
    default:
      return null;
  }
}
