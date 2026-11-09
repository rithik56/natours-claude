import 'server-only';
import { parseConfig, type AppConfig } from './config-schema';

export type Config = AppConfig & {
  appOrigin: string;
  corsOrigins: string[];
  isProductionLike: boolean;
};

let cached: Config | undefined;

/** Reads and validates the environment on first use. Never call at module scope. */
export function getConfig(): Config {
  if (!cached) {
    const parsed = parseConfig(process.env);
    cached = {
      ...parsed,
      appOrigin: new URL(parsed.APP_URL).origin,
      corsOrigins: parsed.CORS_ORIGINS,
      isProductionLike:
        parsed.APP_ENV === 'staging' || parsed.APP_ENV === 'production',
    };
  }
  return cached;
}
