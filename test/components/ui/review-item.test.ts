// U4 and B19: a review shows its stars, its author, its date through formatDate and its comment.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReviewItem } from '@/components/ui/review-item';

const review = {
  authorName: 'Nandini Reddy',
  rating: 4,
  comment:
    'Spectacular landscapes and a careful, safety-first team. Worth every rupee.',
  createdAt: '2026-07-30T20:15:00+05:30',
};

const render = (props: Parameters<typeof ReviewItem>[0]) =>
  renderToStaticMarkup(createElement(ReviewItem, props));

describe('[U4] ReviewItem', () => {
  it('shows the comment, the author and the rating through StarRating', () => {
    const markup = render(review);
    expect(markup).toContain(review.comment);
    expect(markup).toContain('Nandini Reddy');
    expect(markup).toContain('Rated 4 out of 5');
  });

  it('shows the author through Avatar, with initials when there is no photo', () => {
    const markup = render(review);
    expect(markup).toContain('>NR<');
    expect(markup).not.toContain('<img');
  });

  it('formats the date in India Standard Time through formatDate', () => {
    // 20:15 IST on 30 July is 14:45 UTC on the same day, and the test process runs in UTC.
    expect(render(review)).toContain('30 Jul 2026');
    // 19:30 UTC on 30 July is already 31 July in India.
    expect(
      render({ ...review, createdAt: new Date('2026-07-30T19:30:00Z') }),
    ).toContain('31 Jul 2026');
  });

  it('puts a machine-readable instant on the time element', () => {
    expect(render(review)).toContain('dateTime="2026-07-30T20:15:00+05:30"');
  });

  it('offers no edit or delete controls unless canEdit is true', () => {
    const markup = render(review);
    expect(markup).not.toContain('Edit review');
    expect(markup).not.toContain('Delete review');
    expect(markup).not.toContain('<dialog');
  });

  it('with canEdit shows an edit link and a delete trigger that opens a confirm dialog', () => {
    const markup = render({
      ...review,
      canEdit: true,
      editHref: '/tour/ladakh-high-passes/review',
      onDelete: () => undefined,
    });
    expect(markup).toContain('href="/tour/ladakh-high-passes/review"');
    expect(markup).toContain('Edit review');
    expect(markup).toContain('Delete review');
    expect(markup).toContain('<dialog');
    expect(markup).toContain('Delete my review');
  });

  it('rejects a rating outside 0 to 5, as StarRating does', () => {
    expect(() => render({ ...review, rating: 6 })).toThrow(RangeError);
  });
});
