import 'server-only';
import { parseConfig, type AppConfig } from './config-schema';

let cached: AppConfig | undefined;

/** Reads and validates the environment on first use. Never call at module scope. */
export function getConfig(): AppConfig {
  cached ??= parseConfig(process.env);
  return cached;
}
