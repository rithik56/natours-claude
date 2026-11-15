// U4: the facts strip shows the rating once. The star display already prints the number beside the stars.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FactsStrip } from '@/components/ui/facts-strip';

const markup = renderToStaticMarkup(
  createElement(FactsStrip, {
    difficulty: 'medium',
    lengthDays: 6,
    groupSize: 14,
    location: 'Rishikesh, Uttarakhand',
    rating: 4.5,
  }),
);

describe('[U4] FactsStrip', () => {
  it('prints the rating number once', () => {
    expect(markup.match(/>4\.5</g)).toHaveLength(1);
  });

  it('lists the length, group size and location as facts', () => {
    expect(markup).toContain('6 days');
    expect(markup).toContain('Up to 14 people');
    expect(markup).toContain('Rishikesh, Uttarakhand');
  });
});
