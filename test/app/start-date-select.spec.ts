// The start-date select's option labels come from formatDate, in a real browser (B19).
import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test.describe(`start date select at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[B19] every option label is a formatted IST date, and the value is the IST day', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      // The booking panel section also renders a startDate select, so scope to this section.
      const section = page.getByRole('region', { name: 'Start date select' });
      const select = section.locator('select[name="startDate"]');

      await expect(section.getByLabel('Start date').first()).toBeVisible();
      await expect(select.locator('option')).toHaveText([
        '10 Jul 2027',
        '31 Jul 2027',
        '21 Aug 2027',
      ]);
      const values = await select
        .locator('option')
        .evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        );
      expect(values).toEqual(['2027-07-10', '2027-07-31', '2027-08-21']);
    });

    test('[B19] a field error is linked to the select', async ({ page }) => {
      await page.goto('/styleguide');
      const select = page.locator('select[name="startDateError"]');

      await expect(select).toHaveAttribute('aria-invalid', 'true');
      await expect(select).toHaveAccessibleDescription(
        'Start date is required.',
      );
    });

    test('[B19] an empty date list renders a disabled select with no options', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const select = page.locator('select[name="startDateEmpty"]');

      await expect(select).toBeDisabled();
      await expect(select.locator('option')).toHaveCount(0);
    });
  });
}
