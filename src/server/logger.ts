import 'server-only';
import pino, { type DestinationStream, type Logger } from 'pino';
import { getConfig } from './config';

const SECRET_KEYS = [
  'password',
  'passwordConfirm',
  'currentPassword',
  'token',
  'sessionToken',
  'passwordResetToken',
];

// SEC-11: values of these paths never reach the log sink. A wildcard covers one level of nesting.
const REDACT_PATHS = [
  ...SECRET_KEYS,
  ...SECRET_KEYS.map((key) => `*.${key}`),
  'cookie',
  'authorization',
  'headers.cookie',
  'headers.authorization',
  'headers["stripe-signature"]',
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["stripe-signature"]',
];

const RESET_TOKEN_SEGMENT = /(reset-password\/)[^/?#]+/;

/** Builds a JSON logger. Tests pass a destination to capture the lines. */
export function createLogger(
  options: { level?: string; destination?: DestinationStream } = {},
): Logger {
  return pino(
    {
      level: options.level ?? 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    },
    options.destination,
  );
}

let root: Logger | undefined;

/** The shared root logger, at the level from LOG_LEVEL. */
export function getLogger(): Logger {
  root ??= createLogger({ level: getConfig().LOG_LEVEL });
  return root;
}

/** A child logger that puts the request ID on every line (D7). Holds no state of its own. */
export function requestLogger(
  requestId: string,
  base: Logger = getLogger(),
): Logger {
  return base.child({ requestId });
}

/** Hides the password-reset token in a URL before it is logged (SEC-11). */
export function redactUrl(url: string): string {
  return url.replace(RESET_TOKEN_SEGMENT, '$1[redacted]');
}
