import type { CustomMessageTriggerEvent } from 'aws-lambda';

import type { AuthEmail } from '@infra/emails/renderAuthEmail';

type RenderEmail = (
  triggerSource: CustomMessageTriggerEvent['triggerSource'],
  code: string,
) => Promise<AuthEmail | null>;

export function cognitoCustomMessageAdapter(renderEmail: RenderEmail) {
  return async (
    event: CustomMessageTriggerEvent,
  ): Promise<CustomMessageTriggerEvent> => {
    const email = await renderEmail(
      event.triggerSource,
      event.request.codeParameter,
    );

    if (email) {
      event.response.emailSubject = email.subject;
      event.response.emailMessage = email.html;
    }

    return event;
  };
}
