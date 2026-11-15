// The tour page's facts strip, measured in a real browser (U4, U5). Below 64em the facts sit in
// two aligned columns and the location never stands alone before the stars. From 64em they
// sit in one row. The DOM order is difficulty, length, group size, location, rating.
import { expect, test } from '@playwright/test';

type Box = { left: number; right: number; top: number; bottom: number };
type StripGeometry = {
  strip: Box;
  items: Box[];
  scrollWidth: number;
  clientWidth: number;
};

const LOCATION = 3;

// One evaluate per strip, so every box comes from the same layout pass.
async function measureStrips(
  page: import('@playwright/test').Page,
): Promise<StripGeometry[]> {
  const region = page.getByRole('region', { name: 'Facts strip' });
  return region.locator('ul').evaluateAll((lists) =>
    lists.map((list) => {
      const toBox = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      };
      return {
        strip: toBox(list),
        items: Array.from(list.children).map(toBox),
        scrollWidth: list.scrollWidth,
        clientWidth: list.clientWidth,
      };
    }),
  );
}

function overlapsVertically(a: Box, b: Box): boolean {
  return a.top < b.bottom && b.top < a.bottom;
}

for (const width of [360, 375, 414, 768]) {
  test.describe(`facts strip at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U4, U5] nothing passes the strip edge or scrolls sideways', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const strips = await measureStrips(page);

      expect(strips).toHaveLength(2);
      for (const { strip, items, scrollWidth, clientWidth } of strips) {
        expect(items).toHaveLength(5);
        for (const item of items) {
          expect(item.right).toBeLessThanOrEqual(strip.right + 1);
        }
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      }
    });

    test('[U4, U5] the location shares a line with another fact', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const strips = await measureStrips(page);

      for (const { items } of strips) {
        const location = items[LOCATION];
        if (!location) throw new Error('The strip has no location fact');
        const neighbours = items.filter((_, index) => index !== LOCATION);
        expect(
          neighbours.some((item) => overlapsVertically(location, item)),
        ).toBe(true);
      }
    });

    test('[U4, U5] the facts line up in at most two columns', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const strips = await measureStrips(page);

      for (const { items } of strips) {
        const leftEdges = new Set(items.map((item) => Math.round(item.left)));
        expect(leftEdges.size).toBeLessThanOrEqual(2);
      }
    });
  });
}

test.describe('facts strip at 1280px wide', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('[U4, U5] all five facts share one row', async ({ page }) => {
    await page.goto('/styleguide');
    const strips = await measureStrips(page);

    expect(strips).toHaveLength(2);
    for (const { items } of strips) {
      const tops = new Set(items.map((item) => Math.round(item.top)));
      expect(tops.size).toBe(1);
    }
  });
});
