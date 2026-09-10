/**
 * The single failure shape, matching `docs/api.md`.
 *
 * Handlers throw these; one error hook renders them. Nothing builds an error
 * body by hand, so the envelope cannot drift between endpoints.
 */

export class ApiError extends Error {
  /*
   * Fields are declared and assigned rather than written as constructor
   * parameter properties: those emit runtime code, which Node's type stripping
   * cannot do. `erasableSyntaxOnly` in tsconfig is what makes that a compile
   * error here instead of a crash on first import.
   */
  readonly status: number;
  /** Stable, machine-readable. The app renders its own copy from this. */
  readonly code: string;
  readonly details: Record<string, string> | undefined;

  constructor(
    status: number,
    code: string,
    /** For developers and logs. Never shown to an athlete. */
    message: string,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, message: string, details?: Record<string, string>) =>
  new ApiError(400, code, message, details);

export const unauthorized = (code: string, message: string) => new ApiError(401, code, message);

export const forbidden = (message: string) => new ApiError(403, 'forbidden', message);

export const notFound = (code: string, message: string) => new ApiError(404, code, message);

export const conflict = (code: string, message: string) => new ApiError(409, code, message);
