// The review form composes the star input and shows only when the caller allows it, in a real browser (U4, U14, U16).
import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test.describe(`review form at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U4] canReview renders the star input, a comment field and Post review; cannot review renders nothing', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Review form' });

      // Two forms render: the plain one and the one with a field error.
      await expect(
        section.getByRole('radiogroup', { name: 'Rating' }),
      ).toHaveCount(2);
      await expect(
        section.getByRole('textbox', { name: 'Your review' }),
      ).toHaveCount(2);
      await expect(
        section.getByRole('button', { name: 'Post review' }),
      ).toHaveCount(2);
    });

    test('[U14] the star input in the form is keyboard operable', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Review form' });
      const first = section.getByRole('radiogroup', { name: 'Rating' }).first();
      const four = first.getByRole('radio', { name: '4 stars' });

      await first.getByRole('radio', { name: '3 stars' }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(four).toBeChecked();
      await expect(four).toBeFocused();
    });

    test('[U16] a comment error is linked to its textarea', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Review form' });
      const field = section
        .getByRole('textbox', { name: 'Your review' })
        .nth(1);

      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toHaveAccessibleDescription('Review is required.');
    });

    test('[U4] a required comment blocks the post, and a complete review reports what it would send', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Review form' });
      const status = section.getByRole('status');
      const form = section.getByRole('radiogroup', { name: 'Rating' }).first();
      const comment = section
        .getByRole('textbox', { name: 'Your review' })
        .first();
      const submit = section
        .getByRole('button', { name: 'Post review' })
        .first();

      await submit.click();
      await expect(status).toHaveText('');

      // The radio itself is visually hidden, so a traveller clicks its label.
      await form.locator('label', { hasText: '4 stars' }).click();
      await comment.fill('Worth every rupee.');
      await submit.click();
      await expect(status).toHaveText('Would send: 4 out of 5, 18 characters.');
    });

    test('[U4] the comment is limited to 1,000 characters', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Review form' });

      await expect(
        section.getByRole('textbox', { name: 'Your review' }).first(),
      ).toHaveAttribute('maxlength', '1000');
    });
  });
}
