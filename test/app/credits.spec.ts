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
