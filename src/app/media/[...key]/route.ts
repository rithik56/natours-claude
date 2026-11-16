import { withApi } from '@/server/api/with-api';
import { getDeps } from '@/server/deps';
import { AppError } from '@/server/errors';
import { z } from '@/server/validation';

// ADR 0029: the same segment shape the disk adapter accepts. A malformed path is refused here, before storage is read.
const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;

const params = z.strictObject({
  key: z.array(z.string().regex(SEGMENT)).min(1).max(4),
});

// Stored photos are public and same-origin, so next/image can optimise them (images.localPatterns).
export const GET = withApi(
  async ({ params: { key } }) => {
    const file = await getDeps().storage.get(key.join('/'));
    if (file === null) throw new AppError('NOT_FOUND');
    return new Response(new Uint8Array(file.body), {
      headers: {
        'content-type': file.contentType,
        'cache-control': 'public, max-age=86400',
      },
    });
  },
  { access: 'public', params },
);
