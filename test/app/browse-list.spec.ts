// D-03 and U10: `/` lists the first twelve seeded tours in rating order, and their photos load through next/image.
import { expect, test } from '@playwright/test';

test('[B1] / shows the heading, twelve tour rows, and a first photo that loads through /_next/image', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Find your next trip' }),
  ).toBeVisible();
  const rows = page.locator('h1 + ul > li');
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
