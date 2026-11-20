/** Categories of failure that may cross a layer boundary (STYLE.md §8). */
export type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'http'
  | 'parse'
  | 'validation'
  | 'storage'
  | 'unknown';

/**
 * The only error type that crosses a layer boundary.
 * `message` is for developers and logs. ViewModels derive user-facing text
 * from `kind` and never show `message` to the user.
 *
 * A class rather than a type alias because it is thrown: extending `Error`
 * keeps stack traces, and `instanceof AppError` narrows `unknown` in `catch`.
 */
export class AppError extends Error {
  readonly kind: AppErrorKind;

  constructor(kind: AppErrorKind, message: string) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    // Keeps `instanceof AppError` working if Babel down-compiles classes,
    // where subclasses of built-ins like Error otherwise lose their prototype.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Turns anything caught in a `catch` block into an AppError, so a ViewModel
 * can always put an AppError in its `error` state (STYLE.md §8).
 * AppErrors pass through unchanged; anything else becomes kind 'unknown'.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new AppError('unknown', `Unexpected error: ${message}`);
}
