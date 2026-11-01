/**
 * Custom application error class with HTTP status code support.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Pre-built error factories for common cases
export const Errors = {
  notFound: (resource: string, id?: string) =>
    new AppError(404, id ? `${resource} with id '${id}' not found` : `${resource} not found`, 'NOT_FOUND'),

  badRequest: (message: string) =>
    new AppError(400, message, 'BAD_REQUEST'),

  conflict: (message: string) =>
    new AppError(409, message, 'CONFLICT'),

  insufficientBalance: (accountId: string, available: number, requested: number) =>
    new AppError(422, `Insufficient balance for account '${accountId}'. Available: ${available}, Requested: ${requested}`, 'INSUFFICIENT_BALANCE'),

  duplicateTransaction: (referenceId: string, accountId: string) =>
    new AppError(409, `Transaction with reference_id '${referenceId}' already exists for account '${accountId}'`, 'DUPLICATE_TRANSACTION'),

  validationError: (message: string) =>
    new AppError(422, message, 'VALIDATION_ERROR'),

  internal: (message?: string) =>
    new AppError(500, message || 'An unexpected error occurred', 'INTERNAL_ERROR'),
};

