import { z } from 'zod';

// Messages go to developers on stderr and never repeat the received value (D4).
function required(message: string) {
  return {
    error: (issue: { input?: unknown }) =>
      issue.input === undefined ? 'is required' : message,
  };
}

const ORIGIN_HINT =
  'must be an origin such as https://example.com, with no path';

function isOrigin(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.origin === value
  );
}

const corsOrigins = z
  .string()
  .default('')
  .transform((raw, ctx) => {
    const entries = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '');
    if (!entries.every(isOrigin)) {
      ctx.issues.push({
        code: 'custom',
        message: `every entry ${ORIGIN_HINT}`,
        input: raw,
      });
    }
    return entries;
  });

const configSchema = z
  .object({
    APP_ENV: z.enum(
      ['development', 'test', 'ci', 'staging', 'production'],
      required('must be development, test, ci, staging or production'),
    ),
    APP_URL: z
      .string(required('must be a string'))
      .refine(isOrigin, { error: ORIGIN_HINT }),
    MONGODB_URI: z
      .string(required('must be a string'))
      .refine(
        (uri) =>
          uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'),
        { error: 'must start with mongodb:// or mongodb+srv://' },
      ),
    DB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
      .number({ error: 'must be a number of milliseconds' })
      .int({ error: 'must be a whole number of milliseconds' })
      .min(100, { error: 'must be at least 100' })
      .max(30000, { error: 'must be at most 30000' })
      .default(5000),
    SESSION_SECRET: z
      .string(required('must be a string'))
      .min(32, { error: 'must be at least 32 characters' }),
    CORS_ORIGINS: corsOrigins,
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], {
        error: 'must be fatal, error, warn, info, debug, trace or silent',
      })
      .default('info'),
    APP_NOW: z
      .union([z.iso.date(), z.iso.datetime({ offset: true, local: true })], {
        error: 'must be an ISO date or date and time',
      })
      .optional(),
  })
  .superRefine((config, ctx) => {
    const productionLike =
      config.APP_ENV === 'staging' || config.APP_ENV === 'production';
    if (productionLike && !config.APP_URL.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'must be an https origin in staging and production',
      });
    }
    if (productionLike && config.APP_NOW !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_NOW'],
        message: 'is only allowed when APP_ENV is development, test or ci',
      });
    }
  });

export type AppConfig = z.infer<typeof configSchema>;

/** Every config key, in schema order. */
const configKeys: readonly string[] = Object.keys(configSchema.def.shape);

export type ConfigIssue = { key: string; message: string };

/** Thrown by parseConfig. Carries key names and fixed messages, never values. */
export class ConfigError extends Error {
  readonly issues: ConfigIssue[];

  constructor(issues: ConfigIssue[]) {
    super(
      `Invalid configuration: ${issues.map((issue) => issue.key).join(', ')}`,
    );
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

function orderOf(key: string): number {
  const index = configKeys.indexOf(key);
  return index === -1 ? configKeys.length : index;
}

/** Parses a record of environment strings. Empty strings count as missing. */
export function parseConfig(
  env: Record<string, string | undefined>,
): AppConfig {
  const cleaned: Record<string, string> = {};
  for (const key of configKeys) {
    const value = env[key];
    if (value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }
  const result = configSchema.safeParse(cleaned);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map((issue) => ({
      key: String(issue.path[0] ?? 'config'),
      message: issue.message,
    }))
    .sort((a, b) => orderOf(a.key) - orderOf(b.key));
  throw new ConfigError(issues);
}
