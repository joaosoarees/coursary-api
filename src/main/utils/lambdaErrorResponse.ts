import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import type { ErrorCode } from '@application/errors/shared/ErrorCode';

export function lambdaErrorResponse(
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      error: { code, message, ...(details === undefined ? {} : { details }) },
    }),
  };
}
