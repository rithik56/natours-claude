import { describe, expect, it } from 'vitest';
import { parseQuery } from '@/server/api/parse-query';
import { AppError } from '@/server/errors';
import { z } from '@/server/validation';

const listing = z.object({
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(['-createdAt', 'price']).default('-createdAt'),
  difficulty: z.enum(['easy', 'medium', 'difficult']).optional(),
  tag: z.array(z.string()).optional(),
});

describe('parseQuery', () => {
  it('replaces invalid fields with their defaults and drops unknown keys', () => {
    const parsed = parseQuery(
      listing,
      new URLSearchParams('page=0&sort=bogus&x=1'),
    );

    expect(parsed).toEqual({ page: 1, sort: '-createdAt' });
  });

  it('keeps valid fields', () => {
    const parsed = parseQuery(
      listing,
      new URLSearchParams('page=3&sort=price&difficulty=easy'),
    );

    expect(parsed).toEqual({ page: 3, sort: 'price', difficulty: 'easy' });
  });

  it('drops an invalid optional field instead of failing', () => {
    const parsed = parseQuery(listing, new URLSearchParams('difficulty=hard'));

    expect(parsed.difficulty).toBeUndefined();
    expect('difficulty' in parsed).toBe(false);
  });

  it('accepts a Next searchParams record, including array values and undefined', () => {
    const parsed = parseQuery(listing, {
      page: '2',
      tag: ['trek', 'river'],
      sort: undefined,
    });

    expect(parsed).toEqual({
      page: 2,
      sort: '-createdAt',
      tag: ['trek', 'river'],
    });
  });

  it('collects repeated URLSearchParams keys into an array', () => {
    const parsed = parseQuery(
      listing,
      new URLSearchParams('tag=trek&tag=river'),
    );

    expect(parsed.tag).toEqual(['trek', 'river']);
  });

  it('treats a prototype-polluting key as an unknown key', () => {
    const parsed = parseQuery(
      listing,
      new URLSearchParams('__proto__=x&constructor=y'),
    );

    expect(parsed).toEqual({ page: 1, sort: '-createdAt' });
    expect(Object.getPrototypeOf(parsed) === Object.prototype).toBe(true);
  });

  it('throws VALIDATION_ERROR when a required field without a default is invalid', () => {
    const required = z.object({ id: z.string().min(1) });

    let thrown: unknown;
    try {
      parseQuery(required, new URLSearchParams(''));
    } catch (error) {
      thrown = error;
    }

    expect(thrown instanceof AppError).toBe(true);
    expect((thrown as AppError).code).toBe('VALIDATION_ERROR');
  });
});
