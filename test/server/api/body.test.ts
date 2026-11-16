// Byte-counted body reading and multipart parsing (S16, SEC-17). The limit is checked against the
// declared length first, and against the bytes actually streamed when no length is declared.
import { describe, expect, it } from 'vitest';
import { parseMultipart, readBodyLimited } from '@/server/api/body';

/** A body stream that counts how many chunks were pulled from it. */
function countedStream(chunks: Uint8Array[]) {
  const counter = { pulled: 0, cancelled: false };
  let index = 0;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        counter.pulled += 1;
        if (index < chunks.length) {
          controller.enqueue(chunks[index]!);
          index += 1;
        } else {
          controller.close();
        }
      },
      cancel() {
        counter.cancelled = true;
      },
      // Zero high-water mark: a stream pulls ahead by default, which would count a read nobody made.
    },
    { highWaterMark: 0 },
  );
  return { stream, counter };
}

function bytes(length: number): Uint8Array {
  return new Uint8Array(length).fill(7);
}

describe('readBodyLimited (S16, SEC-17)', () => {
  it('[S16] reads a body that is within the limit, in full', async () => {
    const request = new Request('http://localhost/x', {
      method: 'PUT',
      body: bytes(1024),
      duplex: 'half',
    } as RequestInit);

    const read = await readBodyLimited(request, 4096);

    expect(read.byteLength).toBe(1024);
  });

  it('[S16] answers an empty body with no bytes', async () => {
    const request = new Request('http://localhost/x', { method: 'PUT' });

    expect((await readBodyLimited(request, 4096)).byteLength).toBe(0);
  });

  it('[S16] refuses a declared Content-Length above the limit before any byte is read', async () => {
    const { stream, counter } = countedStream([bytes(10)]);
    const request = new Request('http://localhost/x', {
      method: 'PUT',
      headers: { 'content-length': '5000' },
      body: stream,
      duplex: 'half',
    } as RequestInit);

    await expect(readBodyLimited(request, 4096)).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
    });
    expect(counter.pulled).toBe(0);
  });

  it('[S16] counts a streamed body that has no Content-Length, and cuts it off past the limit', async () => {
    const { stream, counter } = countedStream([
      bytes(3000),
      bytes(3000),
      bytes(3000),
    ]);
    const request = new Request('http://localhost/x', {
      method: 'PUT',
      body: stream,
      duplex: 'half',
    } as RequestInit);

    await expect(readBodyLimited(request, 4096)).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
    });
    expect(counter.cancelled).toBe(true);
  });
});

describe('parseMultipart (S16)', () => {
  it('[S16] reads the text and file parts of a multipart body', async () => {
    const form = new FormData();
    form.append('credits', '{"imageCover":{}}');
    form.append(
      'imageCover',
      new File([bytes(16)], 'cover.jpg', { type: 'image/jpeg' }),
    );
    const sent = new Request('http://localhost/x', {
      method: 'PUT',
      body: form,
    });
    const raw = await readBodyLimited(sent, 4096);

    const parsed = await parseMultipart(raw, sent.headers.get('content-type')!);

    expect(parsed.get('credits')).toBe('{"imageCover":{}}');
    expect((parsed.get('imageCover') as File).size).toBe(16);
  });

  it('[S16] a body that is not multipart is refused with VALIDATION_ERROR', async () => {
    await expect(
      parseMultipart(
        new TextEncoder().encode('not a form'),
        'multipart/form-data; boundary=x',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
  });
});
