import type { PreTokenGenerationV2TriggerEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';

import { IssueTokenClaimsUseCase } from '@application/usecases/auth/IssueTokenClaimsUseCase';
import { cognitoPreTokenAdapter } from '@main/adapters/cognitoPreTokenAdapter';

const makeEvent = (internalId?: string) =>
  ({
    triggerSource: 'TokenGeneration_Authentication',
    request: {
      userAttributes: internalId ? { 'custom:internalId': internalId } : {},
    },
    response: { claimsAndScopeOverrideDetails: {} },
  }) as unknown as PreTokenGenerationV2TriggerEvent;

let world: ReturnType<typeof accountWorld>;
let handler: ReturnType<typeof cognitoPreTokenAdapter>;

beforeEach(() => {
  world = accountWorld();
  handler = cognitoPreTokenAdapter(new IssueTokenClaimsUseCase(world.accounts));
});

describe('cognitoPreTokenAdapter', () => {
  it('should add the internal id and the role to the access token', async () => {
    const account = await world.addAccount();

    const event = await handler(makeEvent(account.id));

    expect(event.response.claimsAndScopeOverrideDetails).toEqual({
      accessTokenGeneration: {
        claimsToAddOrOverride: { internalId: account.id, role: 'student' },
      },
    });
  });

  it('should fail the token issue with a recognisable error for an unavailable account', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(handler(makeEvent('missing'))).rejects.toThrow(
      'ACCOUNT_UNAVAILABLE',
    );
  });

  it('should fail for a user without an internal id', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(handler(makeEvent())).rejects.toThrow('ACCOUNT_UNAVAILABLE');
  });
});
