import { notFound } from 'next/navigation';
import type { AppConfig } from '@/server/config-schema';

// S2: the styleguide is a development and test surface. Only the literal
// production value closes it; NODE_ENV is production in every build (ADR 0016).
export function loadStyleguidePage(appEnv: AppConfig['APP_ENV']): void {
  if (appEnv === 'production') notFound();
}
