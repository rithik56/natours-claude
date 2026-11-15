// The empty state and the skeleton variants, in a real browser (U4, R4).
// R4: a skeleton is the size of the real content, so streaming it in shifts nothing (CLS under 0.1).
import { expect, test, type Locator } from '@playwright/test';

// Sub-pixel rounding differs between two layouts of the same box, so heights match within 1px.
async function heightOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('The element has no box on the page');
  return box.height;
}

for (const width of [375, 1280]) {
  test.describe(`empty state and skeleton at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U4] every empty state states the fact and then links to one action', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Empty state' });
      const items = section.getByRole('listitem');

      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toContainText(
        'No tours match these filters. Clear filters',
      );
      await expect(
        items.nth(0).getByRole('link', { name: 'Clear filters' }),
      ).toHaveAttribute('href', '/');
      await expect(items.nth(1)).toContainText(
        'No upcoming tours yet. See all tours',
      );
      await expect(items.nth(2)).toContainText(
        'No past tours yet. See all tours',
      );
      for (let index = 0; index < 3; index += 1) {
        await expect(items.nth(index).getByRole('link')).toHaveCount(1);
      }
    });

    test('[R4] the plain skeleton is one line of text, and takes an explicit width and height', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const plain = page.getByTestId('skeleton-text').locator('> span');
      const sized = page.getByTestId('skeleton-sized').locator('> span');

      expect(await heightOf(plain)).toBeCloseTo(24.8, 0);
      const sizedBox = await sized.boundingBox();
      expect(sizedBox?.width).toBeCloseTo(192, 0);
      expect(sizedBox?.height).toBeCloseTo(48, 0);
    });

    test('[R4] a skeleton is hidden from assistive technology and plays no animation', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const skeletons = page.locator(
        '[data-testid^="skeleton-"] > [aria-hidden="true"]',
      );

      await expect(skeletons).toHaveCount(5);
      // U25 allows one self-playing motion on the site, and it is the route line.
      for (const noMotion of [true, false]) {
        await page.emulateMedia({
          reducedMotion: noMotion ? 'reduce' : 'no-preference',
        });
        const animations = await skeletons.evaluateAll((elements) =>
          elements.flatMap((element) =>
            [element, ...element.querySelectorAll('*')].map(
              (node) => getComputedStyle(node).animationName,
            ),
          ),
        );
        expect(new Set(animations)).toEqual(new Set(['none']));
      }
    });

    test('[R4] the review item skeleton is the height of a review of the median seed length, and no taller than the longest', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const reviews = page
        .getByRole('list', { name: 'Reviews by other travellers' })
        .getByRole('listitem');
      const longest = await heightOf(reviews.nth(0));
      const median = await heightOf(reviews.nth(1));
      const skeleton = await heightOf(
        page.getByTestId('skeleton-review-item').locator('> div'),
      );

      expect(Math.abs(skeleton - median)).toBeLessThanOrEqual(1);
      expect(skeleton).toBeLessThanOrEqual(longest);
    });

    test('[R4] the guide item skeleton is exactly the height of a guide item', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const real = await heightOf(
        page
          .getByRole('list', { name: 'Your guides' })
          .getByRole('listitem')
          .first(),
      );
      const skeleton = await heightOf(
        page.getByTestId('skeleton-guide-item').locator('> div'),
      );

      expect(Math.abs(skeleton - real)).toBeLessThanOrEqual(1);
    });

    test('[R4] the booking panel skeleton is exactly the height of the bookable booking panel', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const real = await heightOf(page.getByRole('complementary').first());
      const skeleton = await heightOf(
        page.getByTestId('skeleton-booking-panel').locator('> div'),
      );

      expect(Math.abs(skeleton - real)).toBeLessThanOrEqual(1);
    });
  });
}
