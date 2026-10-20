import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import { CognitoAuthGateway } from '@infra/gateways/auth/CognitoAuthGateway';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeAuthGateway(): AuthGateway {
  const appConfig = makeAppConfig();

  return new CognitoAuthGateway(appConfig);
}
