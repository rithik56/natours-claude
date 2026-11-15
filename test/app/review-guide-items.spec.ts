// The review item and the guide item composed from avatar, star rating and confirm dialog, in a real browser (U4).
import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test.describe(`review and guide items at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U4] a review shows its author, date, stars and comment', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Review item' });
      const reviews = section.getByRole('list', {
        name: 'Reviews by other travellers',
      });
      const first = reviews.getByRole('listitem').first();

      await expect(first.getByText('Farhan Siddiqui')).toBeVisible();
      await expect(first.getByText('28 Jul 2026')).toBeVisible();
      await expect(
        first.getByRole('img', { name: 'Rated 5 out of 5' }),
      ).toBeVisible();
      await expect(
        first.getByText(/Two full days in Leh before going higher/),
      ).toBeVisible();
      await expect(first.getByRole('link')).toHaveCount(0);
      await expect(first.getByRole('button')).toHaveCount(0);
    });

    test('[U4] the reviewer sees Edit review, and deleting asks first with Cancel focused', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Review item' });
      const own = section.getByRole('list', { name: 'Your review' });

      await expect(
        own.getByRole('link', { name: 'Edit review' }),
      ).toHaveAttribute('href', '/tour/ladakh-high-passes');

      await own.getByRole('button', { name: 'Delete review' }).click();
      const dialog = page.getByRole('dialog', { name: 'Delete your review?' });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'Cancel' }),
      ).toBeFocused();
      await expect(section.getByRole('status')).toHaveText('');

      await dialog.getByRole('button', { name: 'Delete my review' }).click();
      await expect(dialog).toBeHidden();
      await expect(section.getByRole('status')).toHaveText('Review deleted.');
    });

    test('[U4] a guide shows initials, name and role, with nothing to click', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      const section = page.getByRole('region', { name: 'Guide item' });
      const guides = section.getByRole('list', { name: 'Your guides' });

      await expect(guides.getByRole('listitem')).toHaveCount(2);
      await expect(guides.getByText('Tsering Dorjay')).toBeVisible();
      await expect(guides.getByText('Lead guide')).toBeVisible();
      await expect(guides.getByText('Rigzin Angmo')).toBeVisible();
      await expect(guides.getByText('Guide', { exact: true })).toBeVisible();
      await expect(guides.getByRole('link')).toHaveCount(0);
      await expect(guides.getByRole('button')).toHaveCount(0);
    });
  });
}
