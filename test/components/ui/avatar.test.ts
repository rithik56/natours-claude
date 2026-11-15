// U4 and U7: the avatar shows a photo when given one, and initials otherwise, never a broken image.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Avatar } from '@/components/ui/avatar';

const render = (props: { name: string; photoUrl?: string; size?: 'sm' | 'md' }) =>
  renderToStaticMarkup(createElement(Avatar, props));

describe('[U4] Avatar', () => {
  it('shows the first letter of the first two words when there is no photo', () => {
    const markup = render({ name: 'Tsering Dorjay' });
    expect(markup).toContain('>TD<');
    expect(markup).not.toContain('<img');
  });

  it('shows one letter for a single-word name', () => {
    expect(render({ name: 'Anjali' })).toContain('>A<');
  });

  it('treats a blank photoUrl as no photo, so it never renders a broken image', () => {
    const markup = render({ name: 'Gaurav Bisht', photoUrl: '   ' });
    expect(markup).toContain('>GB<');
    expect(markup).not.toContain('<img');
  });

  it('renders the photo through next/image when a photoUrl is given, without initials', () => {
    const markup = render({ name: 'Gaurav Bisht', photoUrl: '/photos/gaurav-bisht.jpg' });
    expect(markup).toContain('<img');
    expect(markup).toContain('gaurav-bisht.jpg');
    expect(markup).not.toContain('>GB<');
  });

  it('labels the whole avatar with the person name, so the initials need no name of their own', () => {
    expect(render({ name: 'Anjali Menon' })).toContain('role="img"');
    expect(render({ name: 'Anjali Menon' })).toContain('aria-label="Anjali Menon"');
  });
});
