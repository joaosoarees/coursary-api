import type { APIGatewayProxyResultV2 } from 'aws-lambda';

// The keep-alive only resets API Gateway's ten-minute idle timer: no frame goes back.
export function handler(): Promise<APIGatewayProxyResultV2> {
  return Promise.resolve({ statusCode: 200 });
}
