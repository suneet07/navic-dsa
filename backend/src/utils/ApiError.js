// Error type carrying an HTTP status and a stable machine-readable code.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Wraps async route handlers so rejected promises reach the error middleware.
export const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
