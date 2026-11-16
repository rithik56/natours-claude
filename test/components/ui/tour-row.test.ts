// C8 (DES-17): a row without an upcoming departure says so in the date cell and keeps the rest of the row.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TourRow } from '@/components/ui/tour-row';

const base = {
  name: 'Valley of Flowers Trek',
  location: 'Rishikesh, Uttarakhand',
  photoUrl: '/media/tours/valley-of-flowers-trek-cover.jpg',
  lengthDays: 6,
  difficulty: 'medium' as const,
  priceRupees: 18999,
  href: '/tour/valley-of-flowers-trek',
};

const render = (props: Partial<typeof base> & { startDate?: string }) =>
  renderToStaticMarkup(createElement(TourRow, { ...base, ...props }));

describe('[U10] TourRow', () => {
  it('shows the next start date through formatDate when one is given', () => {
    const html = render({ startDate: '2027-07-10' });

    expect(html).toContain('10 Jul 2027');
    expect(html).toContain('<time');
    expect(html).not.toContain('No upcoming dates');
  });

  it('shows "No upcoming dates" in the date cell when there is no start date (C8)', () => {
    const html = render({});

    expect(html).toContain('No upcoming dates');
    expect(html).not.toContain('<time');
  });

  it('keeps the price and the link when there is no start date (C8)', () => {
    const html = render({});

    expect(html).toContain('₹18,999');
    expect(html).toContain('href="/tour/valley-of-flowers-trek"');
  });
});
