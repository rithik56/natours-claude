// U4: a guide is shown by name, role and photo, with no review affordances.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GuideItem } from '@/components/ui/guide-item';

const render = (props: Parameters<typeof GuideItem>[0]) =>
  renderToStaticMarkup(createElement(GuideItem, props));

describe('[U4] GuideItem', () => {
  it('shows the name and role as plain text', () => {
    const markup = render({ name: 'Tsering Dorjay', role: 'Lead guide' });
    expect(markup).toContain('Tsering Dorjay');
    expect(markup).toContain('Lead guide');
  });

  it('shows initials through Avatar when there is no photo', () => {
    const markup = render({ name: 'Rigzin Angmo', role: 'Guide' });
    expect(markup).toContain('>RA<');
    expect(markup).not.toContain('<img');
  });

  it('has no rating, link or button', () => {
    const markup = render({ name: 'Tsering Dorjay', role: 'Lead guide' });
    expect(markup).not.toContain('Rated');
    expect(markup).not.toContain('<a ');
    expect(markup).not.toContain('<button');
  });
});
