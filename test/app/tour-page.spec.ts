// U11, R4, D-06, D-07, D-09: `/tour/[slug]` renders the tour in its first response, 404s a missing slug, and
// keeps the layout the design contract asks for on a phone.
import { expect, test } from '@playwright/test';

test('[U11] /tour/ladakh-high-passes has one h1, the cover with its credited caption, and a facts strip', async ({
  page,
}) => {
  await page.goto('/tour/ladakh-high-passes');

  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ladakh High Passes' }),
  ).toBeVisible();

  // The cover is the first figure on the page; the gallery figures come later in the document.
  const coverFigure = page.locator('figure').first();
  await expect(coverFigure.locator('img')).toHaveAttribute(
    'src',
    /\/_next\/image\?url=%2Fmedia%2Ftours%2Fladakh-high-passes-cover\.jpg/,
  );
  await expect(coverFigure.locator('figcaption')).toContainText('Photo:');
  await expect(coverFigure.locator('figcaption a')).toHaveAttribute(
    'target',
    '_blank',
  );
});

test('[R4] /tour/does-not-exist shows the not-found page with a 404 status', async ({
  page,
}) => {
  const response = await page.goto('/tour/does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: "We couldn't find that page.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Back to the tours' }),
  ).toBeVisible();
});

test('[DES-18] Kedarkantha Winter Trek lists Day 1, 3, 4, 5 and 6, and no Day 2', async ({
  page,
}) => {
  await page.goto('/tour/kedarkantha-winter-trek');

  await expect(page.getByText('Day 2', { exact: true })).toHaveCount(0);
  for (const day of [1, 3, 4, 5, 6]) {
    await expect(page.getByText(`Day ${day}`, { exact: true })).toHaveCount(1);
  }
});

test.describe('[D-07] the static route holds its slot with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('[D-07] the route keeps the same box when it scrolls into view, so nothing jumps', async ({
    page,
  }) => {
    await page.goto('/tour/ladakh-high-passes');
    const route = page.getByRole('img', { name: /^Route map/ });

    const before = await route.boundingBox();
    await route.scrollIntoViewIfNeeded();
    const after = await route.boundingBox();

    // The page scrolls, so the viewport offset changes; the box itself must not.
    expect(before).not.toBeNull();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
  });
});

test.describe('[D-06] the phone order', () => {
  test.use({ viewport: { width: 375, height: 900 } });

  test('[D-06] the headings read cover and name, then itinerary, description, photos, guides, reviews and photo credits', async ({
    page,
  }) => {
    await page.goto('/tour/ladakh-high-passes');

    const headings = await page.locator('main h1, main h2').allTextContents();
    expect(headings).toEqual([
      'Ladakh High Passes',
      'Itinerary',
      'About this tour',
      'Photos',
      'Your guides',
      'Reviews',
      'Photo credits',
    ]);
  });
});

test('[D-09] the three gallery photos follow the description, each captioned "Photo: {author}, {licence}"', async ({
  page,
}) => {
  await page.goto('/tour/ladakh-high-passes');

  const gallery = page.locator('section', {
    has: page.getByRole('heading', { level: 2, name: 'Photos' }),
  });
  await expect(gallery.locator('figure')).toHaveCount(3);
  for (const caption of await gallery.locator('figcaption').allTextContents()) {
    expect(caption).toMatch(/^Photo: .+, .+/);
  }
});

test('[U27] the photo credits list has all four photos, each with its author and licence, and links to /credits', async ({
  page,
}) => {
  await page.goto('/tour/ladakh-high-passes');

  const credits = page.locator('section', {
    has: page.getByRole('heading', { level: 2, name: 'Photo credits' }),
  });
  await expect(credits.locator('li')).toHaveCount(4);
  for (const line of await credits.locator('li').allTextContents()) {
    expect(line).toMatch(/^Photo by .+, .+/);
  }
  await expect(
    credits.getByRole('link', { name: 'Read the photo credits' }),
  ).toHaveAttribute('href', '/credits');
});

// U11, B12, R4, R11, D-08: the booking panel, guides and reviews with JavaScript off, where the server's
// HTML is all a visitor gets. The page awaits these sections rather than streaming them, so their real
// content is in the first response (ADR 0039). A streamed Suspense boundary would show only skeletons here.
test.describe('[U11] the tour page sections with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('[U11] the booking panel shows the dates, the price and a Log in to book link to this tour', async ({
    page,
  }) => {
    await page.goto('/tour/ladakh-high-passes');
    const panel = page.getByRole('complementary', { name: 'Book this tour' });

    await expect(
      panel.getByRole('combobox', { name: 'Start date' }),
    ).toBeVisible();
    await expect(panel.getByText('₹42,999 per person')).toBeVisible();
    await expect(
      panel.getByRole('link', { name: 'Log in to book' }),
    ).toHaveAttribute('href', '/login?next=%2Ftour%2Fladakh-high-passes');
  });

  test('[B12] Your guides lists two guides, the lead guide first', async ({
    page,
  }) => {
    await page.goto('/tour/ladakh-high-passes');
    const guides = page.locator('section', {
      has: page.getByRole('heading', { level: 2, name: 'Your guides' }),
    });

    const items = guides.getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('Tsering Dorjay');
    await expect(items.nth(0)).toContainText('Lead guide');
    await expect(items.nth(1)).toContainText('Rigzin Angmo');
    await expect(items.nth(1)).toContainText('Guide');
  });

  test('[D-08] Reviews lists the four reviews, with no Review pagination nav', async ({
    page,
  }) => {
    await page.goto('/tour/ladakh-high-passes');
    const reviews = page.locator('#reviews');

    for (const name of [
      'Farhan Siddiqui',
      'Nandini Reddy',
      'Vivek Agarwal',
      'Lakshmi Subramanian',
    ]) {
      await expect(reviews.getByText(name)).toBeVisible();
    }
    await expect(
      reviews.getByRole('navigation', { name: 'Review pagination' }),
    ).toHaveCount(0);
  });
});

// R4: the sections do not move the page once they have loaded. The 375px check is held: the site header
// changes height when its mobile menu hydrates, which shifts the page on every route, including
// /styleguide (0.139 there too; see deferred-items.md).
for (const width of [375, 1280]) {
  const check = width === 375 ? test.fixme : test;
  check(
    `[R4] at ${width}px the layout shift after load is under 0.1`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // Recorded from the first paint, so a shift caused by any section that loads late is counted.
      await page.addInitScript(() => {
        const shifted = window as Window & { __layoutShift?: number };
        shifted.__layoutShift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            };
            if (!shift.hadRecentInput) {
              shifted.__layoutShift =
                (shifted.__layoutShift ?? 0) + shift.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });

      await page.goto('/tour/ladakh-high-passes');
      await page.waitForLoadState('networkidle');

      const total = await page.evaluate(
        () =>
          (window as Window & { __layoutShift?: number }).__layoutShift ?? 0,
      );
      expect(total).toBeLessThan(0.1);
    },
  );
}

// D-08: a page number past the end is clamped and the Reviews heading still renders (T-04-22).
test('[D-08] /tour/ladakh-high-passes?reviewPage=999999#reviews renders the Reviews heading with no error', async ({
  page,
}) => {
  const response = await page.goto(
    '/tour/ladakh-high-passes?reviewPage=999999#reviews',
  );

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Reviews' }),
  ).toBeVisible();
  // The page is clamped to the one page the four reviews fill, so the real review text shows.
  await expect(
    page
      .locator('#reviews')
      .getByText('Two full days in Leh before going higher'),
  ).toBeVisible();
});
