export class AppError extends Error {
  public readonly code?: string;
  public readonly userMessage: string;

  constructor(userMessage: string, code?: string, internalMessage?: string) {
    super(internalMessage || userMessage);
    this.name = 'AppError';
    this.userMessage = userMessage;
    this.code = code;
  }
}

export function toAppError(error: unknown, fallbackMessage = 'An unexpected error occurred'): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    // If it's a JSON string from handleFirestoreError, parse nicely
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        return new AppError(parsed.error, parsed.operationType, error.message);
      }
    } catch {
      // not a json string
    }
    return new AppError(error.message, undefined, error.message);
  }
  return new AppError(fallbackMessage);
}
