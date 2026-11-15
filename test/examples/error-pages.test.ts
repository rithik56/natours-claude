// The error pages render the approved design with copy.md's exact wording, and never leak an error message (U18, S19).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import NotFound from '@/app/not-found';

describe('not-found page', () => {
  it('[U18] renders copy.md NOT_FOUND wording and a link back to the tours', () => {
    // React escapes the apostrophe as &#x27;; the visitor reads a plain ' in the browser.
    const html = renderToStaticMarkup(NotFound()).replaceAll('&#x27;', "'");

    expect(html).toContain("We couldn't find that page.");
    expect(html).toContain('Back to the tours');
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>Back to the tours<\/a>/);
  });
});
