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
  });
}
