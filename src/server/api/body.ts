import 'server-only';
import { AppError } from '@/server/errors';

/**
 * Reads a request body into memory, refusing it past `maxBytes` (S16, SEC-17). A declared
 * Content-Length above the limit is refused before any byte is read. A body with no length
 * is counted while it streams, and reading stops the moment it passes the limit.
 *
 * @param request - The request whose body is read.
 * @param maxBytes - The most bytes the body may have.
 * @returns The whole body as bytes; an empty array when there is no body.
 * @throws AppError PAYLOAD_TOO_LARGE when the body is over the limit.
 */
export async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get('content-length');
  if (declared !== null && Number(declared) > maxBytes) {
    throw new AppError('PAYLOAD_TOO_LARGE');
  }
  if (request.body === null) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      // Release the reader rather than cancel the stream: on Node 24, cancelling a FormData-backed
      // body makes undici raise an unhandled rejection. Nothing more is buffered either way.
      reader.releaseLock();
      throw new AppError('PAYLOAD_TOO_LARGE');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Parses bytes already read from a multipart request into its form parts. The original
 * content type carries the boundary, so the parser is the platform's own (S16).
 *
 * @param bytes - The whole body, as read by `readBodyLimited`.
 * @param contentType - The request's Content-Type header, with its boundary.
 * @returns The form parts, with files as `File` objects.
 * @throws AppError VALIDATION_ERROR when the body is not well-formed multipart.
 */
export async function parseMultipart(
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
): Promise<FormData> {
  try {
    return await new Response(bytes, {
      headers: { 'content-type': contentType },
    }).formData();
  } catch {
    throw new AppError('VALIDATION_ERROR');
  }
}
