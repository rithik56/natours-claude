import 'server-only';
import { headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import type { Logger } from 'pino';
import { messages } from '@/lib/messages';
import { resolveAccess, type Access } from '@/server/access';
import type { RateLimitRule } from '@/server/adapters/rate-limit';
import { getDeps } from '@/server/deps';
import { AppError, type ErrorDetail } from '@/server/errors';
import { toAppError } from '@/server/error-mapper';
import { requestLogger } from '@/server/logger';
import type { SelfUser } from '@/server/modules/users/dto';
import { issuesToFieldErrors, type z } from '@/server/validation';
import type { ActionResult, ActionState } from './action-state';

type ActionContext = {
  user: SelfUser | null;
  requestId: string;
  log: Logger;
};

type ActionOptions<S extends z.ZodType> = {
  /** Required. An action that declares nothing is refused as FORBIDDEN (SEC-15). */
  access: Access;
  rateLimit?: { rule: RateLimitRule; key: (input: z.infer<S>) => string };
};

const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// proxy.ts sets x-request-id for page and action requests. It is reused only when it
// is a UUID, so a header can never forge or flood a log line (T-01-45).
async function currentRequestId(): Promise<string> {
  const incoming = (await headers()).get('x-request-id');
  return incoming !== null && REQUEST_ID.test(incoming)
    ? incoming
    : crypto.randomUUID();
}

// Next adds $ACTION_* fields to every progressively enhanced form post. They are not
// the caller's input, so a strict schema must never see them. The object has no
// prototype, so a field named __proto__ is an ordinary key and the schema refuses it.
function formDataToInput(formData: FormData): Record<string, unknown> {
  const input: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of new Set(formData.keys())) {
    if (key.startsWith('$ACTION')) continue;
    const values = formData.getAll(key);
    input[key] = values.length === 1 ? values[0] : values;
  }
  return input;
}

function detailsToFieldErrors(
  details: ErrorDetail[] | undefined,
): Record<string, string> | undefined {
  if (!details) return undefined;
  const fields: Record<string, string> = {};
  for (const detail of details) {
    const field = detail.path.split('.')[0];
    if (!field || Object.hasOwn(fields, field)) continue;
    fields[field] = detail.message;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

// Returns the path of the first value that is not plain data, or null. Plain data is
// what survives a trip to the browser unchanged: primitives, arrays and objects with
// no class. A Date is not plain, DTOs carry ISO strings (R6, SEC-11). Only the path is
// reported, never a value.
function findNonPlain(
  value: unknown,
  path: string,
  ancestors: object[],
): string | null {
  if (value === null || value === undefined) return null;
  const kind = typeof value;
  if (kind === 'string' || kind === 'number' || kind === 'boolean') return null;
  if (kind !== 'object') return path;
  const node = value as object;
  if (ancestors.includes(node)) return path;
  const isArray = Array.isArray(node);
  if (!isArray) {
    const prototype: unknown = Object.getPrototypeOf(node);
    if (prototype !== Object.prototype && prototype !== null) return path;
  }
  const children: [string, unknown][] = isArray
    ? (node as unknown[]).map((item, index) => [`${path}[${index}]`, item])
    : Object.entries(node).map(([key, item]) => [`${path}.${key}`, item]);
  ancestors.push(node);
  try {
    for (const [childPath, child] of children) {
      const found = findNonPlain(child, childPath, ancestors);
      if (found !== null) return found;
    }
    return null;
  } finally {
    ancestors.pop();
  }
}

/**
 * Builds a Server Action in the fixed pipeline (plan.md 4.3, ADR 0017):
 *
 * 1. request ID, 2. access (S1), 3. FormData parsed with Zod, 4. rate limit,
 * 5. the handler, 6. its `data` checked as plain data (R6).
 *
 * Expected errors come back as an `ActionState`. `redirect()`, `notFound()` and the
 * other Next control-flow errors are rethrown first (B18). Unexpected errors are
 * logged with the request ID and rethrown, so they reach `error.tsx` (B9).
 * Origin checking is Next's own for Server Actions, so it is not repeated here (S9).
 * Business rules live in services, never here (B13).
 *
 * @param schema - Parses the FormData. Use `z.strictObject` so extra fields are refused.
 * A field sent once is a string and a field sent more than once is an array.
 * @param handler - Receives the validated input, the user and a request logger.
 * Returns `{ data, message }`; `data` must be a DTO or other plain data.
 * @param options - `access` is required; an action without it answers FORBIDDEN.
 * @returns A function with the `useActionState` shape, `(prev, formData) => state`.
 */
export function action<S extends z.ZodType, T = void>(
  schema: S,
  handler: (
    input: z.infer<S>,
    context: ActionContext,
  ) => Promise<ActionResult<T> | void>,
  options: ActionOptions<S>,
): (previous: ActionState<T>, formData: FormData) => Promise<ActionState<T>> {
  return async (_previous, formData) => {
    const requestId = await currentRequestId();
    const log = requestLogger(requestId);
    let retryAfterSeconds: number | undefined;

    try {
      // options is read defensively: an action built without it must fail closed, not crash.
      const user = await resolveAccess(
        (options as ActionOptions<S> | undefined)?.access,
      );

      const parsed = await schema.safeParseAsync(formDataToInput(formData));
      if (!parsed.success) {
        log.warn({ code: 'VALIDATION_ERROR' }, 'action refused');
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: messages.errors.VALIDATION_ERROR,
            fieldErrors: issuesToFieldErrors(parsed.error),
          },
        };
      }
      const input: z.infer<S> = parsed.data;

      if (options.rateLimit) {
        const result = await getDeps().rateLimiter.consume(
          options.rateLimit.key(input),
          options.rateLimit.rule,
        );
        if (!result.allowed) {
          retryAfterSeconds = Math.max(1, result.retryAfterSeconds);
          throw new AppError('RATE_LIMITED');
        }
      }

      const result = await handler(input, { user, requestId, log });
      const state: Extract<ActionState<T>, { ok: true }> = { ok: true };
      if (result) {
        const offender = findNonPlain(result.data, 'data', []);
        if (offender !== null) {
          throw new Error(
            `An action returned data that is not plain: ${offender}`,
          );
        }
        if (result.data !== undefined) state.data = result.data;
        if (result.message !== undefined) state.message = result.message;
      }
      return state;
    } catch (error) {
      unstable_rethrow(error);
      const appError = toAppError(error);
      if (appError.code === 'INTERNAL') {
        log.error(
          { code: appError.code, err: appError.cause ?? error },
          'action failed',
        );
        throw error;
      }
      const fields = { code: appError.code, status: appError.status };
      if (appError.status >= 500) {
        log.error(
          { ...fields, err: appError.cause ?? appError },
          'action failed',
        );
      } else {
        log.warn(fields, 'action refused');
      }
      const fieldErrors = detailsToFieldErrors(appError.details);
      return {
        ok: false,
        error: {
          code: appError.code,
          message: appError.message,
          ...(fieldErrors !== undefined && { fieldErrors }),
          ...(retryAfterSeconds !== undefined && { retryAfterSeconds }),
        },
      };
    }
  };
}
