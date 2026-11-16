// R8, D-07, DES-11, U25: the Leaflet route map loads only on a tour page, only once its slot nears the viewport,
// and replaces the static route in the same box. The itinerary list is never hidden, moved or re-rendered.
import { expect, type Page, test } from '@playwright/test';

const SLOT = '[data-testid="route-map-slot"]';
const TOUR = '/tour/ladakh-high-passes';

const routeImage = (page: Page) =>
  page.getByRole('img', { name: /^Route map/ });

/** The number of "Day N" labels on the page, for days 1 to 8, in order. */
async function itineraryLabels(page: Page): Promise<string[]> {
  const labels: string[] = [];
  for (let day = 1; day <= 8; day += 1) {
    labels.push(
      String(await page.getByText(`Day ${day}`, { exact: true }).count()),
    );
  }
  return labels;
}

/** The slot's size and its place in the document, so a scroll does not change the comparison. */
async function slotBox(page: Page) {
  return page.locator(SLOT).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top + window.scrollY,
    };
  });
}

test.describe('[R8] the route map on pages without a map', () => {
  test('[R8] / never loads Leaflet, its CSS or the boundary', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => typeof (window as unknown as { L?: unknown }).L,
      ),
    ).toBe('undefined');
  });

  test('[R8] /credits never loads Leaflet', async ({ page }) => {
    await page.goto('/credits');

    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => typeof (window as unknown as { L?: unknown }).L,
      ),
    ).toBe('undefined');
  });
});

// A 480px-high viewport puts the slot (about 735px down the page) well beyond its 12rem margin at load,
// so the observer has not fired before a test scrolls. A 900px viewport would already be inside the margin.
test.describe('[R8] the route map on a tour page', () => {
  test.use({ viewport: { width: 1280, height: 480 } });

  test('[R8] before the slot nears the viewport, Leaflet is not loaded', async ({
    page,
  }) => {
    await page.goto(TOUR);

    await expect(routeImage(page)).toBeVisible();
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => typeof (window as unknown as { L?: unknown }).L,
      ),
    ).toBe('undefined');
  });

  test('[R8] once the slot scrolls in, Leaflet replaces the static route in the same box and the itinerary is unchanged', async ({
    page,
  }) => {
    await page.goto(TOUR);
    const before = await slotBox(page);
    const itineraryBefore = await itineraryLabels(page);

    await page.locator(SLOT).scrollIntoViewIfNeeded();
    const map = page.locator(SLOT).locator('.leaflet-container');
    await expect(map).toBeVisible();

    const after = await slotBox(page);
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1);
    expect(await itineraryLabels(page)).toEqual(itineraryBefore);
    expect(itineraryBefore).toEqual(['1', '1', '1', '1', '1', '1', '1', '1']);
  });

  test('[R8] the map has role img and the MapFrame label, and nothing inside it can take focus', async ({
    page,
  }) => {
    await page.goto(TOUR);
    await page.locator(SLOT).scrollIntoViewIfNeeded();
    const map = page.locator(SLOT).locator('.leaflet-container');
    await expect(map).toBeVisible();

    await expect(map).toHaveAttribute('role', 'img');
    await expect(map).toHaveAttribute(
      'aria-label',
      'Route map: 8 stops, days 1 to 8',
    );
    const focusable = await map.evaluate(
      (element) =>
        element.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ).length,
    );
    expect(focusable).toBe(0);
  });

  test('[U25] under reduced motion the route line is already drawn', async ({
    page,
  }) => {
    await page.goto(TOUR);
    await page.locator(SLOT).scrollIntoViewIfNeeded();
    const line = page.locator(`${SLOT} .leaflet-overlay-pane path`).last();

    await expect(line).toHaveCSS('animation-name', 'none');
    await expect(line).toHaveCSS('stroke-dashoffset', '0px');
  });
});

test.describe('[U25] the Leaflet route line with motion allowed', () => {
  test.use({
    viewport: { width: 1280, height: 480 },
    reducedMotion: 'no-preference',
  });

  test('[U25] the route line draws once, in 1.2 seconds', async ({ page }) => {
    await page.goto(TOUR);
    await page.locator(SLOT).scrollIntoViewIfNeeded();
    const line = page.locator(`${SLOT} .leaflet-overlay-pane path`).last();

    await expect(line).not.toHaveCSS('animation-name', 'none');
    await expect(line).toHaveCSS('animation-iteration-count', '1');
    await expect(line).toHaveCSS('animation-duration', '1.2s');
  });
});

test.describe('[R8] the route map with JavaScript off', () => {
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 900 },
  });

  test('[R8] the slot holds the static SVG, the itinerary is present, and no Leaflet loads', async ({
    page,
  }) => {
    await page.goto(TOUR);

    await expect(
      page.locator(SLOT).getByRole('img', { name: /^Route map/ }),
    ).toHaveCount(1);
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    expect(await itineraryLabels(page)).toEqual([
      '1',
      '1',
      '1',
      '1',
      '1',
      '1',
      '1',
      '1',
    ]);
  });
});
