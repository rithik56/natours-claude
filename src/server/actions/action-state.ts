import 'server-only';
import type { ErrorCode } from '@/server/errors';

/**
 * What a Server Action built with `action()` returns to the browser (plan.md 4.3).
 * It is serialised, so `data` is always a DTO or plain value, never a document.
 *
 * `fieldErrors` holds one message per top-level field. `retryAfterSeconds` is an
 * addition to the plan.md shape, set only with RATE_LIMITED, so a form can say how
 * long to wait.
 */
export type ActionState<T = void> =
  | { ok: true; data?: T; message?: string }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string>;
        retryAfterSeconds?: number;
      };
    };

/** What an action handler returns: the data for the form and an optional success message. */
export type ActionResult<T> = { data?: T; message?: string };
