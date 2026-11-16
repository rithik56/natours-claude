# 0038. Uploads are multipart with byte limits, and images are replaced by position

Status: Accepted; amends 0017 (bodies and uploads)
Date: 16 Nov 2026
Requirements: S16, B4, F6, U27, D2
Plan review: SEC-17, SEC-05, DES-07, ARC-14, ARC-18

## Context

ADR 0017 said that bodies are JSON only and that no size limit applies until Phase 4 adds uploads. Phase 4 adds uploads, so the limits and the multipart shape have to be decided here. The tour photos need four things at once:

- A request is limited before the server buffers it, and an anonymous caller is refused before any byte is read (SEC-17).
- A file is judged by its bytes, not by the type its part declares, and it is re-encoded so that a decompression bomb or hidden metadata never reaches storage (S16, SEC-17).
- A staff member can replace any subset of a tour's photos, and each photo keeps the credit it needs (B4, U27, D-14).
- Uploads are rate limited per user, so one account cannot fill storage (SEC-05).

The user settled the replace-by-position rule (D-14) on 16 Nov 2026. It is reversible only at a cost, because it fixes the request shape that API clients use.

## Decision

1. **Byte-counted bodies in `withApi` (SEC-17).** `withApi` takes an `upload: { maxBytes }` option. A route with it requires `multipart/form-data` (any other type is 415, before a byte is read), reads the body through `readBodyLimited`, parses it with `parseMultipart`, and gives the handler the result as `form`. A declared Content-Length above the limit is refused with 413 before reading. A body with no length is counted as it streams, and reading stops at the chunk that passes the limit, which answers 413. A JSON body goes through the same counter with a limit of 1,048,576 bytes, before `JSON.parse`. The pipeline order is unchanged: access, then params, query and body, then the rate limit, then the handler. Access comes first, so an anonymous caller is refused (401) before any body is read.
2. **The request.** `PUT /api/v1/tours/[id]/images` takes a multipart body with three parts:
   - `imageCover`: 0 or 1 file.
   - `images`: 0 to 3 files.
   - `credits`: a JSON part with one credit per uploaded file, `{ "imageCover": Credit, "images": [Credit, ...] }`. The cover needs its credit when a cover file is sent, and the gallery credits match the gallery files in count and order.

   At least one file is required. Any other part is a 400 that names it. Each credit has a title, an author, a licence, and https links to the licence and the source. `alt` is optional, up to 150 characters, and no other key is accepted.
3. **Replace by position (D-14).** `imageCover` replaces the cover. Gallery file n replaces slot n; a slot past the current end is appended, and the other slots keep their keys and credits. The credit of every replaced key is dropped, and each key left in the cover and gallery keeps exactly one credit. The save is one write, so the images and the credits change together (U27).
4. **Normalising each file (S16, T-04-37, T-04-38).** A file over 5 MB is 413. Its type is decided by its magic bytes: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, or WebP `RIFF....WEBP`. Anything else, including a file that sharp cannot decode, is 415, and the declared type is never consulted. Then sharp runs with `limitInputPixels: 40,000,000`, `failOn: 'error'` and `pages: 1`, applies `rotate()` for the EXIF orientation, resizes to at most 2,000 px wide without enlarging, and encodes WebP at quality 80. That strips the metadata. An image over 40,000,000 input pixels is 413, and `sharp.concurrency(1)` is set on first use.
5. **Storage keys (T-04-40).** Each stored file gets `tours/<uuid>.webp` from `randomImageKey`, with the content type `image/webp`. The client's file name is never used.
6. **Limits.** 5 MB per file. 22,020,096 bytes (21 MB) per request, which covers four files of 5 MB plus the multipart overhead. 1 MB per JSON body. 40,000,000 input pixels.
7. **Rate limit (SEC-05).** The rule is `tour-images`, 20 uploads per hour, keyed by the signed-in user's id. `withApi`'s `rateLimit.key` receives the user. The twenty-first upload answers 429 with `retry-after`.
8. **After a successful save.** The tags `tours` and `tour:<id>` are cleared. The replaced keys are then deleted from storage best effort. A failed delete is logged with the tour id and the key, and the request still answers 200. If the save fails, the keys this request stored are deleted instead.
9. **Errors.** Every refusal uses the standard error body (ADR 0017). The approved messages in `docs/design/copy.md` "Tour API messages" are used for the no-file, two-covers, four-gallery-images, missing-credit and credits-not-JSON cases. Copy for an extra credit and for an unknown part is not yet approved, so both use the existing "This field isn't recognised" message. Approving wording for them is open.

## Consequences

- An admin or lead guide can replace any subset of a tour's photos in one request, and every photo keeps its credit. A cover can be added to a tour that has none, and the tour then appears in the public catalogue (D-13).
- Stored photos are WebP at most 2,000 px wide, with their metadata removed and their orientation applied. The original files are not kept.
- The rate limit is per user, and each user has a window of their own. In staging and production the limiter adapter throws until Phase 5 adds Redis (ADR 0016), so an upload answers 500 there. That is the intended failure mode for this phase.
- Two uploads to the same tour at the same moment: the later save wins. The earlier request's stored file can be left unreferenced in storage. Phase 4 accepts this because the endpoint is staff-only and rate limited. A storage sweep can be added later.
- The reader releases the body at the limit rather than cancelling it. On Node 24, cancelling a body built from `FormData` raises an unhandled rejection inside undici. The request still answers 413 at the same point, and no more bytes are read. This is a small difference from the wording of the plan task, and the behaviour is the same.
- Routes that take JSON are now limited to 1 MB. `PATCH /api/v1/tours/[id]` is the only one so far, and a body over that size is a 413.
- A replaced photo's old key is deleted only after the new state is saved, so a crash between the two leaves a stored file with no reference, never a reference to a missing file.
