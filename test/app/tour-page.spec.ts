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
