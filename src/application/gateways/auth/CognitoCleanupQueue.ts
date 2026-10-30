import type { AuthGateway } from '@application/gateways/auth/AuthGateway';

export interface CognitoCleanupQueue {
  enqueue: (signUps: AuthGateway.ExpiredSignUp[]) => Promise<void>;
}
