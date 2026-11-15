// U4: the Link keeps its own look and adds the caller's class, so a row, a control or a brand can style the anchor it renders.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Link } from '@/components/ui/link';

const render = (props: Parameters<typeof Link>[0]) =>
  renderToStaticMarkup(createElement(Link, props));

const classesOf = (markup: string) =>
  /class="([^"]*)"/.exec(markup)?.[1]?.split(' ') ?? [];

describe('[U4] Link', () => {
  it('keeps the caller’s class beside its own on an internal link', () => {
    const classes = classesOf(
      render({ href: '/tours/valley-of-flowers-trek', className: 'row' }),
    );
    expect(classes).toContain('row');
    expect(classes.some((name) => name.includes('link'))).toBe(true);
  });

  it('keeps the caller’s class beside its own on an external link', () => {
    const markup = render({
      href: 'https://commons.wikimedia.org/wiki/User:Kanthi_Kiran',
      className: 'credit',
    });
    const classes = classesOf(markup);
    expect(classes).toContain('credit');
    expect(classes.some((name) => name.includes('link'))).toBe(true);
    expect(markup).toContain('target="_blank"');
  });

  it('renders its own class alone when the caller passes none', () => {
    const classes = classesOf(render({ href: '/' }));
    expect(classes).toHaveLength(1);
  });
});
