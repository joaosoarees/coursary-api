import type { APIGatewayProxyResultV2 } from 'aws-lambda';

// The socket only pushes; the client sends nothing but the keep-alive.
export function handler(): Promise<APIGatewayProxyResultV2> {
  return Promise.resolve({
    statusCode: 200,
    body: JSON.stringify({
      type: 'error',
      message: 'Unknown action. The only one is {"action":"ping"}.',
    }),
  });
}
