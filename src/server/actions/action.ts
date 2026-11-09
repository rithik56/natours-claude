import 'server-only';
import type { Logger } from 'pino';
import type { Access } from '@/server/access';
import type { RateLimitRule } from '@/server/adapters/rate-limit';
import type { SelfUser } from '@/server/modules/users/dto';
import type { z } from '@/server/validation';
import type { ActionResult, ActionState } from './action-state';

type ActionContext = { user: SelfUser | null; requestId: string; log: Logger };

type ActionOptions<S extends z.ZodType> = {
  access: Access;
  rateLimit?: { rule: RateLimitRule; key: (input: z.infer<S>) => string };
};

// RED stub: accepts everything and does nothing, so the tests fail on their assertions.
export function action<S extends z.ZodType, T = void>(
  schema: S,
  handler: (
    input: z.infer<S>,
    context: ActionContext,
  ) => Promise<ActionResult<T> | void>,
  options: ActionOptions<S>,
): (prev: ActionState<T>, formData: FormData) => Promise<ActionState<T>> {
  void schema;
  void handler;
  void options;
  return async () => ({ ok: true });
}
