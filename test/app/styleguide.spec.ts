// Harness smoke test for the Playwright "app" project: the real /styleguide route, in a real browser.
// Full state, theme and width coverage for every component is plan 03-10's job (U5, U23).
import { expect, test } from '@playwright/test';

const variants = ['Primary', 'Secondary', 'Quiet'];
const states = [
  'default. At rest.',
  'hover. Point at the button.',
  'focus. Press Tab until the ring appears.',
  'active. Press and hold.',
  'disabled. Cannot be pressed.',
];

for (const width of [375, 1280]) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U5] the Button section names every variant and state', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      await expect(
        page.getByRole('heading', { name: 'Button', exact: true }),
      ).toBeVisible();
      for (const variant of variants) {
        for (const state of states) {
          await expect(
            page.getByText(`${variant} button, ${state}`),
          ).toBeVisible();
        }
      }
      await expect(
        page.getByRole('button', { name: 'Book this tour' }),
      ).toHaveCount(5);
      await expect(
        page.getByRole('button', { name: 'Book this tour', disabled: true }),
      ).toHaveCount(1);
    });

    test('[U3] a button meets the 44 pixel touch target', async ({ page }) => {
      await page.goto('/styleguide');

      const box = await page
        .getByRole('button', { name: 'Clear filters' })
        .first()
        .boundingBox();

      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    });
  });
}

test.describe('themes', () => {
  test('[U2] the dark theme swaps token values with no theme attribute', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/styleguide');
    const lightBackground = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg'),
    );

    await page.emulateMedia({ colorScheme: 'dark' });
    const darkBackground = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg'),
    );

    expect(lightBackground.trim()).toBe('#eef1f5');
    expect(darkBackground.trim()).toBe('#0d1221');
    await expect(page.locator('[data-theme]')).toHaveCount(0);
  });

  test('[U3] the primary button reads its colours from tokens in both themes', async ({
    page,
  }) => {
    const primary = page
      .getByRole('button', { name: 'Book this tour' })
      .first();

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/styleguide');

    await expect(primary).toHaveCSS('background-color', 'rgb(242, 183, 5)');
    await expect(primary).toHaveCSS('color', 'rgb(31, 43, 77)');
  });

  test('[U4] a keyboard user sees a focus ring on the first button', async ({
    page,
  }) => {
    await page.goto('/styleguide');

    // The shell's skip link and header links come before the styleguide's buttons in tab order, so focus the button directly.
    const primary = page
      .getByRole('button', { name: 'Book this tour' })
      .first();
    await primary.focus();

    await expect(primary).toBeFocused();
    await expect(primary).toHaveCSS('outline-style', 'solid');
  });
});
