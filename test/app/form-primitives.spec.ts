// The form and navigation primitives on the real /styleguide route, in a real browser (U4, U16).
import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test.describe(`form primitives at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U4] an internal link goes to its route and an external link opens in a new tab', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Link', exact: true });

      await expect(
        section.getByRole('link', { name: 'Read the photo credits' }),
      ).toHaveAttribute('href', '/credits');

      const external = section.getByRole('link', { name: 'CC BY-SA 3.0' });
      await expect(external).toHaveAttribute(
        'href',
        'https://creativecommons.org/licenses/by-sa/3.0',
      );
      await expect(external).toHaveAttribute('target', '_blank');
      await expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('[U16] a text field with no errorMessage has no invalid or described state', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', {
        name: 'Text field',
        exact: true,
      });

      const field = section.getByLabel('Full name', { exact: true });
      await expect(field).toBeVisible();
      await expect(field).not.toHaveAttribute('aria-invalid');
      await expect(field).not.toHaveAttribute('aria-describedby');
    });

    test('[U16] a text field with an errorMessage is invalid and described by its visible error', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', {
        name: 'Text field',
        exact: true,
      });

      const field = section.getByLabel('Email address', { exact: true });
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toHaveAttribute('aria-describedby', 'email-error');
      await expect(field).toHaveAccessibleDescription(
        'Enter a valid email address.',
      );

      const error = section.locator('#email-error');
      await expect(error).toHaveText('Enter a valid email address.');
      await expect(error).toBeVisible();
      await expect(error).toHaveAttribute('role', 'alert');
    });

    test('[U4] a checkbox is a native checkbox that its label toggles', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', {
        name: 'Checkbox',
        exact: true,
      });

      const box = section.getByRole('checkbox', {
        name: 'Show only Himalayan tours',
        exact: true,
      });
      await expect(box).not.toBeChecked();
      // The native input covers the whole label, so a click on the label reaches it.
      await section
        .locator('label', { hasText: 'Show only Himalayan tours' })
        .click();
      await expect(box).toBeChecked();
    });

    test('[U4] a checkbox starts checked or disabled as its example shows', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', {
        name: 'Checkbox',
        exact: true,
      });

      await expect(
        section.getByRole('checkbox', {
          name: 'Show tours with seats left',
          exact: true,
        }),
      ).toBeChecked();
      await expect(
        section.getByRole('checkbox', {
          name: 'Show only tours in Ladakh',
          exact: true,
        }),
      ).toBeDisabled();
    });

    test('[U4] the checkbox label is at least 44 pixels square', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', {
        name: 'Checkbox',
        exact: true,
      });

      const label = section.locator('label', {
        hasText: 'Show only Himalayan tours',
      });
      const box = await label.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    });

    test('[U4] a select lists the seed tours and takes a choice', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', {
        name: 'Select',
        exact: true,
      });

      const select = section.getByLabel('Tour', { exact: true });
      await expect(select.locator('option')).toHaveText([
        'Valley of Flowers Trek',
        'Kedarkantha Winter Trek',
        'Ladakh High Passes',
        'Spiti Valley Star Gazer',
      ]);
      await select.selectOption({ label: 'Ladakh High Passes' });
      await expect(select).toHaveValue('ladakh-high-passes');
    });

    test('[U16] a select with an errorMessage is invalid and described by its visible error', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', {
        name: 'Select',
        exact: true,
      });

      const select = section.getByLabel('Tour to book', { exact: true });
      await expect(select).toHaveAttribute('aria-invalid', 'true');
      await expect(select).toHaveAttribute(
        'aria-describedby',
        'booking-tour-error',
      );
      await expect(select).toHaveAccessibleDescription('Tour is required.');

      const error = section.locator('#booking-tour-error');
      await expect(error).toHaveText('Tour is required.');
      await expect(error).toBeVisible();
      await expect(error).toHaveAttribute('role', 'alert');
    });
  });
}
