// The error pages render the approved design with copy.md's exact wording, and never leak an error message (U18, S19).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ErrorPage from '@/app/error';
import GlobalError from '@/app/global-error';
import NotFound from '@/app/not-found';

// A sentinel stands in for an error message a developer would never want shown to a visitor.
const LEAKED_MESSAGE = 'database password is hunter2';

describe('not-found page', () => {
  it('[U18] renders copy.md NOT_FOUND wording and a link back to the tours', () => {
    // React escapes the apostrophe as &#x27;; the visitor reads a plain ' in the browser.
    const html = renderToStaticMarkup(NotFound()).replaceAll('&#x27;', "'");

    expect(html).toContain("We couldn't find that page.");
    expect(html).toContain('Back to the tours');
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>Back to the tours<\/a>/);
  });
});

describe('error pages', () => {
  const fakeError = Object.assign(new Error(LEAKED_MESSAGE), {
    digest: 'test-digest-123',
  });

  it('[S19] error.tsx renders the fixed INTERNAL copy and the digest, never the message', () => {
    const html = renderToStaticMarkup(
      ErrorPage({ error: fakeError, retry: () => {} }),
    );

    expect(html).toContain(
      'Something went wrong on our side. Try again in a moment.',
    );
    expect(html).toContain('test-digest-123');
    expect(html).not.toContain(LEAKED_MESSAGE);
  });

  it('[S19] error.tsx omits the reference line when there is no digest', () => {
    const html = renderToStaticMarkup(
      ErrorPage({ error: new Error(LEAKED_MESSAGE), retry: () => {} }),
    );

    expect(html).not.toContain('Reference:');
    expect(html).not.toContain(LEAKED_MESSAGE);
  });

  it('[S19] global-error.tsx renders its own document with the same fixed copy and digest only', () => {
    const html = renderToStaticMarkup(
      GlobalError({ error: fakeError, retry: () => {} }),
    );

    expect(html).toContain('<html');
    expect(html).toContain('<body');
    expect(html).toContain(
      'Something went wrong on our side. Try again in a moment.',
    );
    expect(html).toContain('test-digest-123');
    expect(html).not.toContain(LEAKED_MESSAGE);
  });
});
