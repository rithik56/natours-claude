// The not-found page on a real unknown URL, in a real browser: the new design, a 404 status and a way back (U18).
// The error boundaries are unit-tested in test/examples/error-pages.test.ts, because no route throws on purpose.
import { expect, test } from '@playwright/test';

test('[U18] an unknown URL renders the new not-found page with a link back to the tours', async ({
  page,
}) => {
  const response = await page.goto('/no-such-page-for-u18');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: "We couldn't find that page.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Back to the tours' }),
  ).toHaveAttribute('href', '/');
});

test('[U18] the link on the not-found page goes back to the home page', async ({
  page,
}) => {
  await page.goto('/no-such-page-for-u18');

  await page.getByRole('link', { name: 'Back to the tours' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});
