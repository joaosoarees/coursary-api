import type { ErrorCode } from '@application/errors/shared/ErrorCode';

export abstract class ApplicationError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;
}
