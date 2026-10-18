import type { AuthGateway } from '@application/gateways/auth/AuthGateway';

// Asks for the Cognito user of an expired sign-up to be cleaned up (Q41, Q341).
export interface CognitoCleanupQueue {
  enqueue: (signUps: AuthGateway.ExpiredSignUp[]) => Promise<void>;
}
