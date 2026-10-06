/** Typed errors thrown by harless-dining-api. All extend HarlessError. */

export class HarlessError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
  }
}

/** Bad date / meal argument. Never thrown for "no menu on this date" (that yields null meals). */
export class HarlessValidationError extends HarlessError {
  constructor(message: string) {
    super('VALIDATION', message);
  }
}

/** Network failure, timeout, or non-2xx from Sodexo. */
export class HarlessNetworkError extends HarlessError {
  readonly status?: number | undefined;
  constructor(message: string, status?: number, options?: ErrorOptions) {
    super('NETWORK', message, options);
    this.status = status;
  }
}

/** Sodexo answered but the payload was not the expected shape (site redesign?). */
export class HarlessParseError extends HarlessError {
  constructor(message: string) {
    super(
      'PARSE',
      `${message} (Sodexo may have changed their API — please file an issue: https://github.com/strayfade/harless-dining-api/issues)`,
    );
  }
}
