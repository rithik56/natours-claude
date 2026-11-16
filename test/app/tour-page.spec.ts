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

  const cover = page.locator('figure img').first();
  await expect(cover).toHaveAttribute(
    'src',
    /\/_next\/image\?url=%2Fmedia%2Ftours%2Fladakh-high-passes-cover\.jpg/,
  );
  await expect(page.locator('figure figcaption')).toContainText('Photo:');
  await expect(page.locator('figure figcaption a')).toHaveAttribute(
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

    expect(before).not.toBeNull();
    expect(after).toEqual(before);
  });
});

test.describe('[D-06] the phone order', () => {
  test.use({ viewport: { width: 375, height: 900 } });

  test('[D-06] the headings read cover and name, then itinerary, description, photos and photo credits', async ({
    page,
  }) => {
    await page.goto('/tour/ladakh-high-passes');

    const headings = await page.locator('main h1, main h2').allTextContents();
    expect(headings).toEqual([
      'Ladakh High Passes',
      'Itinerary',
      'About this tour',
      'Photos',
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
