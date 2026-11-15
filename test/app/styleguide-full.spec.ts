// The assembled /styleguide: every section present, in both themes and at both widths (U4, U5).
// The four screenshots are the evidence for the design gate (plan.md §9.7), so they are written to docs/design/screens.
import path from 'node:path';
import { expect, test } from '@playwright/test';

const screensDir = path.resolve(
  import.meta.dirname,
  '../../docs/design/screens',
);

// One id per section heading, listed here by hand so the test checks the page against an independent list.
const sectionIds = [
  'styleguide-button',
  'styleguide-link',
  'styleguide-text-field',
  'styleguide-checkbox',
  'styleguide-select',
  'styleguide-price',
  'styleguide-difficulty',
  'styleguide-avatar',
  'styleguide-alert',
  'styleguide-toast',
  'styleguide-tour-row',
  'styleguide-facts-strip',
  'styleguide-itinerary',
  'styleguide-pagination',
  'styleguide-photo-credits',
  'styleguide-map-frame',
  'styleguide-booking-panel',
  'styleguide-confirm-dialog',
  'styleguide-shell',
  'styleguide-file-input',
  'styleguide-start-date-select',
  'styleguide-star-rating',
  'styleguide-review-item',
  'styleguide-review-form',
  'styleguide-guide-item',
  'styleguide-empty-state',
  'styleguide-skeleton',
];

for (const width of [375, 1280]) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`at ${width}px wide, ${theme} theme`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme: theme });

      test(`[U4, U5] every section is present and the page is captured`, async ({
        page,
      }) => {
        await page.goto('/styleguide');

        for (const id of sectionIds) {
          await expect(
            page.locator(`h2#${id}`),
            `section heading ${id}`,
          ).toBeVisible();
        }
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

        // Swapped by the colour-scheme media query alone, never by an attribute (U2).
        const background = await page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue('--color-bg')
            .trim(),
        );
        expect(background).toBe(theme === 'light' ? '#eef1f5' : '#0d1221');

        // Photos load lazily, so scroll the page through once and wait for each to finish before the full-page capture.
        await page.evaluate(async () => {
          for (const img of document.images) {
            img.loading = 'eager';
          }
          await Promise.all(
            [...document.images].map((img) =>
              img.complete
                ? undefined
                : new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                  }),
            ),
          );
        });

        await page.screenshot({
          path: path.join(screensDir, `styleguide-${width}-${theme}.png`),
          fullPage: true,
        });
      });
    });
  }
}

test.describe('in-page navigation', () => {
  test('[U5] the nav lists every section and each link targets a real heading', async ({
    page,
  }) => {
    await page.goto('/styleguide');

    const nav = page.getByRole('navigation', { name: 'Styleguide sections' });
    const hrefs = await nav
      .getByRole('link')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('href') ?? ''),
      );

    expect(hrefs).toEqual(sectionIds.map((id) => `#${id}`));
    for (const id of sectionIds) {
      await expect(page.locator(`h2#${id}`)).toHaveCount(1);
    }
  });

  test.describe('without JavaScript', () => {
    test.use({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 900 },
    });

    test('[U5] a nav link moves to its section with no script running', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      const nav = page.getByRole('navigation', { name: 'Styleguide sections' });
      await nav.getByRole('link', { name: 'Skeleton', exact: true }).click();

      await expect(page).toHaveURL(/#styleguide-skeleton$/);
      await expect(page.locator('h2#styleguide-skeleton')).toBeInViewport();
    });
  });
});
