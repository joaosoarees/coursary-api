import { ApplicationError } from '@application/errors/shared/ApplicationError';
import type { ErrorCode } from '@application/errors/shared/ErrorCode';

export function defineError(
  name: string,
  code: ErrorCode,
  statusCode: number,
  message: string,
) {
  return class extends ApplicationError {
    readonly code = code;
    readonly statusCode = statusCode;

    constructor() {
      super(message);
      this.name = name;
    }
  };
}
