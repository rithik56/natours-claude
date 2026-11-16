import 'server-only';
import { z } from '@/server/validation';

/**
 * The tour page's reviews page parameter (D-08, UI-SPEC Open item 12). It reads leniently through
 * `parseQuery`: digits only and at least 1, with 1 as the default. Anything else falls back to the
 * first page (T-04-22). The service clamps a page past the end to the last page.
 */
export const reviewPageQuerySchema = z.object({
  reviewPage: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .default(1),
});
