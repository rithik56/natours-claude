// The route map's one self-playing motion, in a real browser (U25).
// The Playwright app project sets reducedMotion: 'reduce' by default, so the
// first block below is the reduced-motion path; the second opts back in.
import { expect, test } from '@playwright/test';

const routeMap = (page: import('@playwright/test').Page) =>
  page.getByRole('img', { name: /^Route map/ });

test.describe('[U25] the route line with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('draws once, in 1.2 seconds or less', async ({ page }) => {
    await page.goto('/styleguide');

    const line = routeMap(page).locator('path').last();
    await expect(line).not.toHaveCSS('animation-name', 'none');
    await expect(line).toHaveCSS('animation-iteration-count', '1');
    await expect(line).toHaveCSS('animation-duration', '1.2s');
  });
});

for (const width of [375, 1280]) {
  test.describe(`map-frame at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U25] under reduced motion the route line is already drawn and never animates', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      const line = routeMap(page).locator('path').last();
      await expect(line).toHaveCSS('animation-name', 'none');
      await expect(line).toHaveCSS('stroke-dashoffset', '0px');
    });

    test('[U25] each day stop carries its day number, from 1 to 8', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      const labels = routeMap(page).locator('text');
      await expect(labels).toHaveCount(8);
      for (let day = 1; day <= 8; day += 1) {
        await expect(labels.nth(day - 1)).toHaveText(String(day));
      }
    });
  });
}
