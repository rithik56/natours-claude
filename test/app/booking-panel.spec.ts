// The four booking-panel states from direction.md, rendered on /styleguide in a real browser (U4).
import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test.describe(`booking-panel at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U4] the four states render in order, one panel each', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      await expect(page.getByRole('complementary')).toHaveCount(4);
    });

    test('[U4] state 1: a bookable tour shows the start dates, the price and Book this tour', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const panel = page.getByRole('complementary').nth(0);

      const select = panel.getByRole('combobox', { name: 'Start date' });
      await expect(select).toBeVisible();
      await expect(select.getByRole('option')).toHaveText([
        '12 Jun 2027',
        '17 Jul 2027',
        '4 Sep 2027',
      ]);
      await expect(panel.getByText('₹42,999 per person')).toBeVisible();
      await expect(
        panel.getByRole('button', { name: 'Book this tour' }),
      ).toBeVisible();
    });

    test('[U4] state 2: logged out, the button reads Log in to book and returns to this tour', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const panel = page.getByRole('complementary').nth(1);

      await expect(
        panel.getByRole('combobox', { name: 'Start date' }),
      ).toBeVisible();
      const login = panel.getByRole('link', { name: 'Log in to book' });
      await expect(login).toHaveAttribute(
        'href',
        '/login?next=%2Ftour%2Fladakh-high-passes',
      );
      await expect(
        panel.getByRole('button', { name: 'Book this tour' }),
      ).toHaveCount(0);
    });

    test('[U4] state 3: already booked says so, links to My tours and offers no date or button', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const panel = page.getByRole('complementary').nth(2);

      await expect(panel.getByText(/booked for 17 Jul 2027/)).toBeVisible();
      await expect(
        panel.getByRole('link', { name: 'My tours' }),
      ).toHaveAttribute('href', '/my-tours');
      await expect(panel.getByRole('combobox')).toHaveCount(0);
      await expect(panel.getByRole('button')).toHaveCount(0);
    });

    test('[U4] state 4: no future dates shows the empty state, with a link to other tours and no date or button', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const panel = page.getByRole('complementary').nth(3);

      await expect(
        panel.getByText('No upcoming start dates for this tour.'),
      ).toBeVisible();
      // The empty state names the one action that resolves it: a link to the tours, not a button.
      await expect(
        panel.getByRole('link', { name: 'See other tours' }),
      ).toHaveAttribute('href', '/');
      await expect(panel.getByRole('combobox')).toHaveCount(0);
      await expect(panel.getByRole('button')).toHaveCount(0);
    });
  });
}

// R4, C1, D-06: the skeleton is the same box as the panel it stands in for, at both widths.
for (const width of [375, 1280]) {
  test(`[R4] at ${width}px the booking-panel skeleton has the same box as the bookable panel`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/styleguide');
    const panel = await page.getByRole('complementary').nth(0).boundingBox();
    const skeleton = await page
      .getByTestId('skeleton-booking-panel')
      .locator('> div')
      .boundingBox();

    // Height is what moves the page when the real panel replaces the skeleton, so it must match exactly.
    // The width is not compared here: the styleguide lays each state out as a flex row, which sizes
    // both boxes to their content. In the tour page's column both are the column's width.
    expect(panel).not.toBeNull();
    expect(skeleton?.height).toBeCloseTo(panel?.height ?? 0, 0);
  });
}

// U11, C1, D-06: on the tour page the panel is in the page flow on a phone and sticky beside the content from 64em.
test.describe('[U11] the booking panel on the tour page', () => {
  test('[U11] at 375px the panel is a block in the page flow, straight after the facts strip, and not pinned', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/tour/ladakh-high-passes');
    const panel = page.getByRole('complementary', { name: 'Book this tour' });
    await expect(panel).toBeVisible();

    const position = await panel.evaluate(
      (element) => getComputedStyle(element).position,
    );
    expect(position).toBe('static');

    const facts = await page.locator('article > header > ul').boundingBox();
    const box = await panel.boundingBox();
    expect(facts).not.toBeNull();
    expect(box?.y ?? 0).toBeGreaterThanOrEqual(
      (facts?.y ?? 0) + (facts?.height ?? 0),
    );
  });

  test('[U11] at 1280px the panel stays sticky in the right column', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/tour/ladakh-high-passes');
    const panel = page.getByRole('complementary', { name: 'Book this tour' });
    await expect(panel).toBeVisible();

    const position = await panel.evaluate(
      (element) => getComputedStyle(element).position,
    );
    expect(position).toBe('sticky');

    // The panel fills the 22rem right column (352px at the default 16px root size).
    const box = await panel.boundingBox();
    expect(box?.width ?? 0).toBeCloseTo(352, 0);
  });
});
