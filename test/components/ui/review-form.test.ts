// U4, U16: the review form composes the star input, and renders nothing unless the caller says the user can review.
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReviewForm } from '@/components/ui/review-form';

const render = (props: Parameters<typeof ReviewForm>[0]) =>
  renderToStaticMarkup(createElement(ReviewForm, props));

describe('[U4] ReviewForm', () => {
  it('renders nothing when canReview is false', () => {
    expect(render({ canReview: false })).toBe('');
  });

  it('renders a form with the star input, a comment field and a submit button when canReview is true', () => {
    const markup = render({ canReview: true });
    expect(markup).toContain('<form');
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('name="rating"');
    expect(markup).toContain('<textarea');
    expect(markup).toContain('name="comment"');
    expect(markup).toContain('type="submit"');
  });

  it('uses the star input once, not a second rating input', () => {
    const markup = render({ canReview: true });
    expect(markup.match(/role="radiogroup"/g)).toHaveLength(1);
    expect(markup.match(/type="radio"/g)).toHaveLength(5);
  });

  it('limits the comment to the 1 to 1,000 characters plan.md allows', () => {
    const markup = render({ canReview: true });
    expect(markup).toContain('maxLength="1000"');
    expect(markup).toContain('required');
  });

  it('posts to the given action', () => {
    expect(render({ canReview: true, action: '/reviews' })).toContain(
      'action="/reviews"',
    );
  });

  it('links a comment error to the textarea', () => {
    const markup = render({
      canReview: true,
      commentError: 'Review is required.',
    });
    const errorId = /id="([^"]+-comment-error)"/.exec(markup)?.[1];
    expect(errorId).toBeDefined();
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain(`aria-describedby="${errorId}"`);
    expect(markup).toContain('Review is required.');
  });

  it('gives each form its own comment field id', () => {
    // One render tree, as on a page: separate renders would each restart the id counter.
    const markup = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(ReviewForm, { canReview: true }),
        createElement(ReviewForm, { canReview: true }),
      ),
    );
    const ids = [...markup.matchAll(/<textarea[^>]* id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
