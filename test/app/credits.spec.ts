// U27, D-10: `/credits` lists every photo's author and licence, grouped by tour, and works with JavaScript off.
import { expect, test } from '@playwright/test';

test.describe('[U27] /credits with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('[U27] has one h1 and 13 tour groups, each heading linked to its tour page', async ({
    page,
  }) => {
    await page.goto('/credits');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Photo credits',
    );
    await expect(page.locator('main h2 a[href^="/tour/"]')).toHaveCount(13);
  });

  test('[U27] shows 52 credit rows, each with its photo title linked to Wikimedia Commons', async ({
    page,
  }) => {
    await page.goto('/credits');

    await expect(page.locator('main li')).toHaveCount(52);
    await expect(
      page.locator('main li a[href^="https://commons.wikimedia.org/"]'),
    ).toHaveCount(52);
  });

  test('[U27] each row names its author as text, and links the licence to a licence page', async ({
    page,
  }) => {
    await page.goto('/credits');

    await expect(
      page.locator('main li a[href^="https://creativecommons.org/"]'),
    ).toHaveCount(52);
    await expect(page.locator('main li').first()).toContainText('Photo by ');
  });
});

// U7: exactly one image per page is preloaded with high priority: the first list row on `/`,
// the cover on a tour page, and none on `/credits`, whose thumbnails are all lazy.
test.describe('[U7] preloaded images', () => {
  const preloaded = 'img[fetchpriority="high"]';

  test('[U7] / preloads exactly one image, the first list row', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator(preloaded)).toHaveCount(1);
    await expect(page.locator(`main li ${preloaded}`)).toHaveCount(1);
    await expect(page.locator('main li img').first()).toHaveAttribute(
      'fetchpriority',
      'high',
    );
  });

  test('[U7] a tour page preloads exactly one image, its cover', async ({
    page,
  }) => {
    await page.goto('/tour/ladakh-high-passes');

    await expect(page.locator(preloaded)).toHaveCount(1);
    await expect(page.locator(`main header ${preloaded}`)).toHaveCount(1);
  });

  test('[U7] /credits preloads no image, and every thumbnail is lazy', async ({
    page,
  }) => {
    await page.goto('/credits');

    await expect(page.locator('main li img')).toHaveCount(52);
    await expect(page.locator(preloaded)).toHaveCount(0);
    await expect(page.locator('main li img[loading="lazy"]')).toHaveCount(52);
  });
});

test.describe('[U27] /credits at 375px', () => {
  test.use({ viewport: { width: 375, height: 900 } });

  test('[U27] the page does not scroll sideways, so long titles and authors wrap', async ({
    page,
  }) => {
    await page.goto('/credits');

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
