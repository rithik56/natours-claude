// U4: an empty state states the fact, then names the one action that resolves it (copy.md).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/components/ui/empty-state';

const render = (props: Parameters<typeof EmptyState>[0]) =>
  renderToStaticMarkup(createElement(EmptyState, props));

describe('[U4] EmptyState', () => {
  it('renders the fact and then a link to the action, in that order', () => {
    const markup = render({
      message: 'No tours match these filters.',
      action: { label: 'Clear filters', href: '/' },
    });
    expect(markup).toContain('No tours match these filters.');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('>Clear filters<');
    expect(markup.indexOf('No tours match')).toBeLessThan(
      markup.indexOf('Clear filters'),
    );
  });

  it('adds no copy of its own around the caller’s message and action', () => {
    const markup = render({
      message: 'No upcoming tours yet.',
      action: { label: 'See all tours', href: '/' },
    });
    const text = markup
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text).toBe('No upcoming tours yet. See all tours');
  });

  it('refuses a blank action, so an empty state never lacks a next step', () => {
    expect(() =>
      render({ message: 'Nothing here.', action: { label: ' ', href: '/' } }),
    ).toThrow(RangeError);
    expect(() =>
      render({ message: 'Nothing here.', action: { label: 'Go', href: '' } }),
    ).toThrow(RangeError);
  });

  it('refuses a blank message', () => {
    expect(() =>
      render({ message: '  ', action: { label: 'Clear filters', href: '/' } }),
    ).toThrow(RangeError);
  });
});
