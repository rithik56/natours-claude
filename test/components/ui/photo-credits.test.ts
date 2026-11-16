// U27 (C7): every photo's credit is listed, two photos by the same author under the same licence are two rows,
// and an author without a link is plain text while the licence still links out.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoCredits } from '@/components/ui/photo-credits';

const LICENCE_URL = 'https://creativecommons.org/licenses/by-sa/4.0';

const sameAuthorAndLicence = [
  {
    authorName: 'Rohit Sharma',
    licenceName: 'CC BY-SA 4.0',
    licenceUrl: LICENCE_URL,
  },
  {
    authorName: 'Rohit Sharma',
    licenceName: 'CC BY-SA 4.0',
    licenceUrl: LICENCE_URL,
  },
];

type Credit = {
  authorName: string;
  authorUrl?: string;
  licenceName: string;
  licenceUrl: string;
};

const render = (credits: Credit[]) =>
  renderToStaticMarkup(createElement(PhotoCredits, { credits }));

describe('[U27] PhotoCredits', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[U27] two credits with the same author and licence render as two rows', () => {
    const html = render(sameAuthorAndLicence);

    expect(html.match(/<li\b/g)).toHaveLength(2);
  });

  it('[U27] two credits with the same author and licence log no duplicate-key warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(sameAuthorAndLicence);

    const keyWarnings = error.mock.calls.filter((args) =>
      String(args[0]).includes('unique "key" prop'),
    );
    expect(keyWarnings).toEqual([]);
  });

  it('[U27] an author with no link renders as plain text, and the licence still links out', () => {
    const html = render([
      {
        authorName: 'Kanthi Kiran',
        licenceName: 'CC BY-SA 4.0',
        licenceUrl: LICENCE_URL,
      },
    ]);

    expect(html).toContain('Photo by Kanthi Kiran');
    expect(html).not.toMatch(/<a[^>]*>Kanthi Kiran<\/a>/);
    expect(html).toContain(`href="${LICENCE_URL}"`);
    expect(html).toContain('>CC BY-SA 4.0</a>');
  });

  it('[U27] an author with a link renders as a link that opens in a new tab', () => {
    const html = render([
      {
        authorName: 'Vishal Akki',
        authorUrl: 'https://commons.wikimedia.org/wiki/File:Pangong_Tso_VM.JPG',
        licenceName: 'CC BY-SA 3.0',
        licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      },
    ]);

    expect(html).toMatch(
      /<a[^>]*href="https:\/\/commons\.wikimedia\.org[^"]*"[^>]*>Vishal Akki<\/a>/,
    );
    expect(html).toContain('target="_blank"');
  });
});
