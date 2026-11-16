// D-03 and U10: `/` lists the first twelve seeded tours in rating order, and their photos load through next/image.
import { expect, test } from '@playwright/test';

// A tour row is an <li> whose direct child is the link to its tour page (the filter form and count sit above the list).
const TOUR_ROWS = 'li:has(> a[href^="/tour/"])';

test('[B1] / shows the heading, twelve tour rows, and a first photo that loads through /_next/image', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Find your next trip' }),
  ).toBeVisible();
  const rows = page.locator(TOUR_ROWS);
  await expect(rows).toHaveCount(12);

  const image = rows.first().locator('img');
  await expect(image).toHaveAttribute(
    'src',
    /\/_next\/image\?url=%2Fmedia%2Ftours%2F/,
  );
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
});

test.describe('[U10] with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('[U10] filters by difficulty through the GET form and a shareable URL', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('summary').click();
    await page.getByLabel('Difficulty').selectOption('easy');
    await page.getByRole('button', { name: 'Show tours' }).click();

    await expect(page).toHaveURL(/difficulty=easy/);
    const rows = page.locator(TOUR_ROWS);
    const shown = await rows.count();
    expect(shown).toBeGreaterThan(0);
    for (let index = 0; index < shown; index += 1) {
      await expect(rows.nth(index)).toContainText('Easy');
    }
    const label = shown === 1 ? '1 tour' : `${shown} tours`;
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  });
});
