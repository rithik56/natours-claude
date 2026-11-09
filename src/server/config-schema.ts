import { z } from 'zod';

const configSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'ci', 'staging', 'production']),
  MONGODB_URI: z
    .string()
    .refine(
      (uri) => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'),
      {
        error: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
      },
    ),
  DB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30000)
    .default(5000),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Parses a record of environment strings. Empty strings count as missing. */
export function parseConfig(
  env: Record<string, string | undefined>,
): AppConfig {
  const cleaned: Record<string, string> = {};
  for (const key of Object.keys(configSchema.shape)) {
    const value = env[key];
    if (value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }
  return configSchema.parse(cleaned);
}
