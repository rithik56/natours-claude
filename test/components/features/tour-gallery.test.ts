// U7, D-09: the gallery shows the tour's extra photos in the order given, each with a "Photo: {author}, {licence}"
// caption, lazy images and no script; with no photos it renders nothing at all.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TourGallery } from '@/components/features/tour-gallery';

const photos = [
  {
    url: '/media/tours/ladakh-high-passes-1.jpg',
    alt: 'Prayer flags above a high pass',
    author: 'Vishal Akki',
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
  },
  {
    url: '/media/tours/ladakh-high-passes-2.jpg',
    alt: 'A glacial lake under snow peaks',
    author: 'Rohit Sharma',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  },
  {
    url: '/media/tours/ladakh-high-passes-3.jpg',
    alt: 'A monastery on a hill',
    author: 'Kanthi Kiran',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  },
];

const render = (list: typeof photos) =>
  renderToStaticMarkup(createElement(TourGallery, { photos: list }));

describe('[U7] TourGallery', () => {
  it('[U7] renders one figure per photo, in the order given', () => {
    const html = render(photos);

    expect(html.match(/<figure\b/g)).toHaveLength(3);
    const positions = [
      'ladakh-high-passes-1',
      'ladakh-high-passes-2',
      'ladakh-high-passes-3',
    ].map((name) => html.indexOf(name));
    expect(positions[0]).toBeGreaterThan(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('[D-09] captions each photo "Photo: {author}, {licence}" with the licence linked', () => {
    const html = render(photos);

    expect(html).toContain('Photo: Vishal Akki, ');
    expect(html).toContain('Photo: Rohit Sharma, ');
    expect(html).toContain(
      'href="https://creativecommons.org/licenses/by-sa/4.0"',
    );
  });

  it('[U7] every image is lazy and carries its own alt text', () => {
    const html = render(photos);

    expect(html.match(/loading="lazy"/g)).toHaveLength(3);
    expect(html).toContain('alt="Prayer flags above a high pass"');
    expect(html).toContain('alt="A monastery on a hill"');
  });

  it('[U7] with no photos it renders nothing', () => {
    expect(render([])).toBe('');
  });
});
