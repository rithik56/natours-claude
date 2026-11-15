// The keyboard-operable star input and the read-only star display, in a real browser (U4, U14).
// The input is a native radio group (W3C APG Rating Radio Group), so these assertions check
// native keyboard behaviour rather than any hand-rolled key handling.
import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test.describe(`star rating at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U14] the star input is a radio group of five labelled stars', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      await expect(
        page.getByRole('radiogroup', { name: 'Rating' }),
      ).toBeVisible();
      for (let stars = 1; stars <= 5; stars += 1) {
        const label = stars === 1 ? '1 star' : `${stars} stars`;
        await expect(page.getByRole('radio', { name: label })).toHaveCount(1);
      }
      await expect(page.getByRole('radio', { name: '3 stars' })).toBeChecked();
    });

    test('[U14] Tab leaves and re-enters the group on the checked star', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const checked = page.getByRole('radio', { name: '3 stars' });

      await checked.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(checked).not.toBeFocused();
      await page.keyboard.press('Tab');
      await expect(checked).toBeFocused();
    });

    test('[U14] Space checks the focused star', async ({ page }) => {
      await page.goto('/styleguide');
      const one = page.getByRole('radio', { name: '1 star' });

      await one.focus();
      await page.keyboard.press('Space');

      await expect(one).toBeChecked();
      await expect(one).toBeFocused();
    });

    test('[U14] Arrow keys move focus and selection, wrapping at the ends', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const one = page.getByRole('radio', { name: '1 star' });
      const two = page.getByRole('radio', { name: '2 stars' });
      const five = page.getByRole('radio', { name: '5 stars' });

      await one.focus();
      await page.keyboard.press('ArrowRight');
      await expect(two).toBeChecked();
      await expect(two).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(one).toBeChecked();
      await expect(one).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(five).toBeChecked();
      await expect(five).toBeFocused();
    });

    test('[U4] the display renders a labelled rating with no radio or radiogroup roles', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      await expect(
        page.getByRole('img', { name: 'Rated 4.5 out of 5' }),
      ).toBeVisible();
      await expect(page.getByText('4.5', { exact: true })).toHaveCount(1);
      // The display is not operable, so it contains no radio controls.
      await expect(
        page.getByRole('img', { name: 'Rated 4.5 out of 5' }).locator('input'),
      ).toHaveCount(0);
    });
  });
}
