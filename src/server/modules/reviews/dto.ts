import 'server-only';

export type ReviewDto = Record<string, unknown>;

export function toReview(review: object): ReviewDto {
  return { ...review };
}
