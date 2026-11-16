// U11, B12, D-08: the reviews list shows "No reviews yet." when a tour has none, and pages five at a time
// with links that return to the Reviews heading. Pagination appears only when there is a second page.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ReviewList,
  type ReviewListItem,
} from '@/components/features/reviews-section';

const SLUG = 'ladakh-high-passes';

function item(index: number): ReviewListItem {
  return {
    id: `review-${index}`,
    authorName: `Traveller ${index}`,
    rating: 5,
    comment: `A comment number ${index}`,
    createdAt: '2026-07-28T00:00:00.000Z',
  };
}

const render = (props: Parameters<typeof ReviewList>[0]) =>
  renderToStaticMarkup(createElement(ReviewList, props));

describe('[U11] ReviewList', () => {
  it('[U11] with no reviews it says "No reviews yet." as a plain line, with no list and no navigation', () => {
    const html = render({ items: [], page: 1, totalPages: 1, slug: SLUG });

    expect(html).toContain('No reviews yet.');
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('<nav');
  });

  it('[D-08] with one page there is no Review pagination nav, even with five reviews on it', () => {
    const items = [1, 2, 3, 4, 5].map(item);

    const html = render({ items, page: 1, totalPages: 1, slug: SLUG });

    expect(html.match(/<li\b/g)).toHaveLength(5);
    expect(html).not.toContain('Review pagination');
  });

  it('[D-08] a tour with more than five reviews shows Review pagination, whose Next link carries reviewPage and returns to #reviews', () => {
    const html = render({
      items: [1, 2, 3, 4, 5].map(item),
      page: 1,
      totalPages: 2,
      slug: SLUG,
    });

    expect(html).toContain('aria-label="Review pagination"');
    expect(html).toContain(`href="/tour/${SLUG}?reviewPage=2#reviews"`);
    expect(html).toContain('Page 1 of 2');
    // The first page has no earlier page, so Previous is a disabled span and not a link.
    expect(html).not.toContain('reviewPage=0');
  });

  it('[D-08] on the second page, Previous links back to page 1 and returns to #reviews', () => {
    const html = render({
      items: [item(6)],
      page: 2,
      totalPages: 2,
      slug: SLUG,
    });

    expect(html).toContain(`href="/tour/${SLUG}?reviewPage=1#reviews"`);
    expect(html).toContain('Page 2 of 2');
  });

  it('[B12] each review shows its author name, the rating and the comment', () => {
    const html = render({
      items: [item(1)],
      page: 1,
      totalPages: 1,
      slug: SLUG,
    });

    expect(html).toContain('Traveller 1');
    expect(html).toContain('A comment number 1');
    expect(html).toContain('Rated 5 out of 5');
  });
});
