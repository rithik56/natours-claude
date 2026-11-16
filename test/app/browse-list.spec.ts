// D-03 and U10: `/` lists the first twelve seeded tours in rating order, and their photos load through next/image.
import { expect, test, type Page } from '@playwright/test';

// A tour row is an <li> whose direct child is the link to its tour page (the filter form and count sit above the list).
const TOUR_ROWS = 'li:has(> a[href^="/tour/"])';
const TOUR_PAGES = 'Tour pages';

// D-03: the default order is rating (highest first), then name. Seed order check against UI-SPEC "Filter options".
const PAGE_ONE = [
  'Andaman Island Explorer',
  'Kerala Backwaters and Hills',
  'Meghalaya Living Root Bridges',
  'Ranthambore Tiger Safari',
  'Darjeeling and Sikkim Tea Trails',
  'Golden Triangle Heritage',
  'Hampi Ruins and Boulders',
  'Ladakh High Passes',
  'Rishikesh Ganga Rafting',
  'Spiti Valley Star Gazer',
  'Thar Desert Camel Safari',
  'Valley of Flowers Trek',
];

async function rowNames(page: Page): Promise<string[]> {
  return page.locator(TOUR_ROWS).locator('h2').allTextContents();
}

async function showTours(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Show tours' }).click();
}

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

test.describe('[U10] with JavaScript off on a phone', () => {
  // D-01: at 375px the filters sit in a closed disclosure, so each block opens it first.
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });

  test('[U10] filters by difficulty through the GET form and a shareable URL', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('summary').click();
    await page.getByLabel('Difficulty').selectOption('easy');
    await showTours(page);

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

  test('[B11] page 1 holds twelve rows in rating order, and Next goes to page 2 with one tour', async ({
    page,
  }) => {
    await page.goto('/');
    expect(await rowNames(page)).toEqual(PAGE_ONE);
    await expect(page.getByText('13 tours', { exact: true })).toBeVisible();

    await page
      .getByRole('navigation', { name: TOUR_PAGES })
      .getByText('Next')
      .click();
    await expect(page).toHaveURL(/page=2/);
    expect(await rowNames(page)).toEqual(['Kedarkantha Winter Trek']);
    await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  });

  test('[U10] Length 7 to 8 days shows the three tours of that length', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('summary').click();
    await page.getByLabel('Length').selectOption({ label: '7 to 8 days' });
    await showTours(page);

    await expect(page).toHaveURL(/length=7-8/);
    expect(await rowNames(page)).toEqual([
      'Darjeeling and Sikkim Tea Trails',
      'Ladakh High Passes',
      'Spiti Valley Star Gazer',
    ]);
  });

  test('[U10] Month Dec 2026 shows the six tours with a December 2026 departure', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('summary').click();
    await page.getByLabel('Month').selectOption({ label: 'Dec 2026' });
    await showTours(page);

    await expect(page).toHaveURL(/month=2026-12/);
    expect(await rowNames(page)).toEqual([
      'Andaman Island Explorer',
      'Kerala Backwaters and Hills',
      'Ranthambore Tiger Safari',
      'Hampi Ruins and Boulders',
      'Thar Desert Camel Safari',
      'Kedarkantha Winter Trek',
    ]);
  });

  test('[U10] Max price Up to ₹20,000 shows the five tours at or under that price', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('summary').click();
    await page.getByLabel('Max price').selectOption({ label: 'Up to ₹20,000' });
    await showTours(page);

    await expect(page).toHaveURL(/maxPrice=20000/);
    expect(await rowNames(page)).toEqual([
      'Hampi Ruins and Boulders',
      'Rishikesh Ganga Rafting',
      'Thar Desert Camel Safari',
      'Valley of Flowers Trek',
      'Kedarkantha Winter Trek',
    ]);
  });

  test('[U10] each sort orders the list as its label says', async ({
    page,
  }) => {
    const cases: Array<{ label: string; first: string }> = [
      { label: 'Price, low to high', first: 'Rishikesh Ganga Rafting' },
      { label: 'Price, high to low', first: 'Ladakh High Passes' },
      { label: 'Length, shortest first', first: 'Ranthambore Tiger Safari' },
      { label: 'Length, longest first', first: 'Ladakh High Passes' },
    ];
    for (const sort of cases) {
      await page.goto('/');
      await page.locator('summary').click();
      await page.getByLabel('Sort').selectOption({ label: sort.label });
      await showTours(page);
      await expect(page).toHaveURL(/sort=/);
      await expect(page.locator(TOUR_ROWS).first()).toBeVisible();
      const names = await rowNames(page);
      expect(names[0], sort.label).toBe(sort.first);
    }
  });

  test('[U10] pagination links keep every other query parameter', async ({
    page,
  }) => {
    await page.goto('/?sort=price');
    const next = page
      .getByRole('navigation', { name: TOUR_PAGES })
      .getByRole('link', { name: 'Next' });
    await expect(next).toHaveAttribute('href', '/?sort=price&page=2');

    await next.click();
    await expect(page).toHaveURL(/sort=price/);
    expect(await rowNames(page)).toEqual(['Ladakh High Passes']);
  });

  test('[U10] a combination with no match shows 0 tours, the empty state and Clear filters, with no list or pagination', async ({
    page,
  }) => {
    await page.goto('/?difficulty=difficult&length=3-4');

    await expect(page.getByText('0 tours', { exact: true })).toBeVisible();
    await expect(
      page.getByText('No tours match these filters.', { exact: false }),
    ).toBeVisible();
    // Two Clear filters links: one beside Show tours (a filter is active) and one in the empty state. Both go to /.
    const clear = page.getByRole('link', { name: 'Clear filters' });
    await expect(clear).toHaveCount(2);
    for (const link of await clear.all()) {
      await expect(link).toHaveAttribute('href', '/');
    }
    await expect(page.locator(TOUR_ROWS)).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: TOUR_PAGES }),
    ).toHaveCount(0);
    // The form keeps the submitted values.
    await expect(page.getByLabel('Difficulty')).toHaveValue('difficult');
    await expect(page.getByLabel('Length')).toHaveValue('3-4');
  });

  test('[U10] invalid sort, page, limit and filter values fall back to the default list with no message', async ({
    page,
  }) => {
    await page.goto('/?sort=Price&page=0&limit=500&difficulty=hard');

    expect(await rowNames(page)).toEqual(PAGE_ONE);
    await expect(page.getByText('13 tours', { exact: true })).toBeVisible();
  });

  test('[B11] a page past the end shows the last page', async ({ page }) => {
    await page.goto('/?page=99');

    expect(await rowNames(page)).toEqual(['Kedarkantha Winter Trek']);
    await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  });

  test('[U10] the disclosure is closed on /, and open when a filter or a non-default sort is set (D-01)', async ({
    page,
  }) => {
    const disclosure = page.locator('details');

    await page.goto('/');
    await expect(disclosure).not.toHaveAttribute('open');

    await page.goto('/?difficulty=easy');
    await expect(disclosure).toHaveAttribute('open', '');

    await page.goto('/?sort=price');
    await expect(disclosure).toHaveAttribute('open', '');
  });

  test('[U23] the page does not scroll sideways at 375px', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.width);
  });

  test('[U7] exactly one image on / is preloaded with high fetch priority, and it is the first row photo (C2)', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1);
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(
      1,
    );
    const first = page.locator(TOUR_ROWS).first().locator('img');
    await expect(first).toHaveAttribute('fetchpriority', 'high');
  });
});

test.describe('[U10] with JavaScript off on the desktop', () => {
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 800 },
  });

  test('[U10] from 64em the selects are visible without opening anything', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByLabel('Difficulty')).toBeVisible();
    await expect(page.getByLabel('Length')).toBeVisible();
    await expect(page.getByLabel('Month')).toBeVisible();
    await expect(page.getByLabel('Max price')).toBeVisible();
    await expect(page.getByLabel('Sort')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Show tours' }),
    ).toBeVisible();
  });
});

test('[R10] / has the approved title and description, and a canonical of the origin plus / whatever the query', async ({
  page,
}) => {
  await page.goto('/?difficulty=easy');

  await expect(page).toHaveTitle('Small-group tours across India');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Small-group tours across India, from the high passes of Ladakh to the backwaters of Kerala.',
  );
  const origin = new URL(page.url()).origin;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `${origin}/`,
  );
});
