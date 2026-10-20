import type { PreTokenGenerationV2TriggerEvent } from 'aws-lambda';

import { AccountUnavailable } from '@application/errors/auth';
import type { IssueTokenClaimsUseCase } from '@application/usecases/auth/IssueTokenClaimsUseCase';

export function cognitoPreTokenAdapter(issueClaims: IssueTokenClaimsUseCase) {
  return async (
    event: PreTokenGenerationV2TriggerEvent,
  ): Promise<PreTokenGenerationV2TriggerEvent> => {
    const internalId = event.request.userAttributes['custom:internalId'] ?? '';

    try {
      const claims = await issueClaims.execute({ internalId });

      event.response = {
        claimsAndScopeOverrideDetails: {
          accessTokenGeneration: { claimsToAddOrOverride: { ...claims } },
        },
      };

      return event;
    } catch (error) {
      if (error instanceof AccountUnavailable) {
        console.warn(
          JSON.stringify({
            event: 'TokensRefused',
            internalId,
            triggerSource: event.triggerSource,
          }),
        );
        throw new Error(error.code, { cause: error });
      }

      throw error;
    }
  };
}
