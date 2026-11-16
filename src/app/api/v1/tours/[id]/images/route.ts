import { handlePreflight } from '@/server/api/origin';
import { ok } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { parseImagesForm } from '@/server/modules/tours/schemas';
import { replaceImages } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// A tour id is 24 hex characters. Anything else is a 400 before any read (B12, contracts 2.3).
const tourParams = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i),
});

// 21 MB: four files of 5 MB each, plus the multipart overhead (S16, SEC-17).
const IMAGES_UPLOAD_LIMIT = 22_020_096;

// PUT /api/v1/tours/[id]/images (plan.md 4.1, B4, S16, D-14): lead guides and admins only. The
// body is multipart: `imageCover` (0 or 1 file), `images` (0 to 3 files) and a JSON `credits`
// part. Any subset may be sent, and a gallery file replaces the slot at its position.
export const PUT = withApi(
  async ({ params, form }) => {
    const input = await parseImagesForm(form ?? new FormData());
    return ok({ tour: await replaceImages(params.id, input) });
  },
  {
    access: { roles: ['lead-guide', 'admin'] },
    params: tourParams,
    query: z.strictObject({}),
    upload: { maxBytes: IMAGES_UPLOAD_LIMIT },
    // 20 uploads per signed-in user per hour (SEC-05). Each user has a window of their own. The key
    // needs only the user, so the limit is checked before the 22 MB upload is read (WR-04).
    rateLimitBeforeBody: {
      rule: { name: 'tour-images', points: 20, durationSeconds: 3600 },
      key: ({ user }) => `tour-images:${user?.id ?? ''}`,
    },
  },
);

// CORS preflight (S10, contracts 2.3): an allowlisted browser origin asks before this multipart PUT.
export const OPTIONS = handlePreflight;
