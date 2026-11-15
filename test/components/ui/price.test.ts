// U4: Price renders through formatPrice, so every rupee amount uses Indian grouping (B20).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Price } from '@/components/ui/price';

const render = (props: { rupees: number; perPerson?: boolean }) =>
  renderToStaticMarkup(createElement(Price, props));

describe('[U4] Price', () => {
  it('renders the amount with Indian digit grouping through formatPrice', () => {
    expect(render({ rupees: 24999 })).toContain('₹24,999');
    expect(render({ rupees: 124999 })).toContain('₹1,24,999');
  });

  it('appends "per person" only when perPerson is true', () => {
    expect(render({ rupees: 18999, perPerson: true })).toContain(
      '₹18,999 per person',
    );
    expect(render({ rupees: 18999 })).not.toContain('per person');
  });
});
