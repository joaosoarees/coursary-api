import type {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from 'aws-lambda';

import type { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';

interface ConsumeTicket {
  execute: (input: { token: string }) => Promise<RealtimeTicket | null>;
}

// WebSocket authorizers have no simple response: the answer is a policy on the $connect route.
const policy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  methodArn: string,
): APIGatewayAuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      { Action: 'execute-api:Invoke', Effect: effect, Resource: methodArn },
    ],
  },
});

export function websocketAuthorizerAdapter(consumeTicket: ConsumeTicket) {
  return async (
    event: APIGatewayRequestAuthorizerEvent,
  ): Promise<APIGatewayAuthorizerResult> => {
    const token = event.queryStringParameters?.ticket;
    const ticket = token ? await consumeTicket.execute({ token }) : null;

    if (!ticket) {
      return policy('anonymous', 'Deny', event.methodArn);
    }

    return {
      ...policy(ticket.accountId, 'Allow', event.methodArn),
      context: { accountId: ticket.accountId, lessonId: ticket.lessonId },
    };
  };
}
