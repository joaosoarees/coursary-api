import type { CustomMessageTriggerEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import { cognitoCustomMessageAdapter } from '@main/adapters/cognitoCustomMessageAdapter';

const makeEvent = (triggerSource: string) =>
  ({
    triggerSource,
    request: { codeParameter: '{####}' },
    response: {},
  }) as unknown as CustomMessageTriggerEvent;

describe('cognitoCustomMessageAdapter', () => {
  it('should put the rendered subject and body in the response', async () => {
    const render = vi
      .fn()
      .mockResolvedValue({ subject: 'S', html: '<p>H</p>' });

    const event = await cognitoCustomMessageAdapter(render)(
      makeEvent('CustomMessage_SignUp'),
    );

    expect(render).toHaveBeenCalledWith('CustomMessage_SignUp', '{####}');
    expect(event.response).toEqual({
      emailSubject: 'S',
      emailMessage: '<p>H</p>',
    });
  });

  it('should return the event untouched when there is no e-mail of ours', async () => {
    const event = await cognitoCustomMessageAdapter(
      vi.fn().mockResolvedValue(null),
    )(makeEvent('CustomMessage_AdminCreateUser'));

    expect(event.response).toEqual({});
  });
});
