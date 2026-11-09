import 'server-only';
import { ConfigError } from './config-schema';
import { getConfig } from './config';

/**
 * Validates configuration at server start. On failure it names each bad key and
 * its fixed message on stderr, never a value, then exits with code 1. A throw
 * from register() does not stop `next start`, so the exit is explicit.
 */
export function loadConfigOrExit(): void {
  try {
    getConfig();
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    const lines = error.issues.map(
      (issue) => `  - ${issue.key}: ${issue.message}\n`,
    );
    process.stderr.write(`Invalid configuration:\n${lines.join('')}`);
    process.exit(1);
  }
}
