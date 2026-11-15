// The file input's preview and its object-URL lifecycle, in a real browser (U15, T-03-08).
// The photos are real seed images, so the test fixtures are content a person could see.
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const firstPhoto = fileURLToPath(
  new URL(
    '../../seed/img/tours/andaman-island-explorer-1.jpg',
    import.meta.url,
  ),
);
const secondPhoto = fileURLToPath(
  new URL(
    '../../seed/img/tours/andaman-island-explorer-2.jpg',
    import.meta.url,
  ),
);

type RecordingWindow = { revokedUrls: string[] };

for (const width of [375, 1280]) {
  test.describe(`file input at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U15] a placeholder shows until a photo is chosen', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      await expect(page.getByLabel('Tour photo')).toBeVisible();
      await expect(page.getByText('No photo chosen')).toBeVisible();
      await expect(
        page.getByRole('img', { name: 'Preview of the chosen photo' }),
      ).toHaveCount(0);
    });

    test('[U15] choosing a photo shows its preview before any upload', async ({
      page,
    }) => {
      await page.goto('/styleguide');

      await page.getByLabel('Tour photo').setInputFiles(firstPhoto);

      const preview = page.getByRole('img', {
        name: 'Preview of the chosen photo',
      });
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAttribute('src', /^blob:/);
      await expect(page.getByText('No photo chosen')).toHaveCount(0);
      await expect
        .poll(() =>
          preview.evaluate((img: HTMLImageElement) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
    });

    test('[U15] a second photo replaces the preview and revokes the first object URL', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const revoked: string[] = [];
        const revoke = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = (url: string) => {
          revoked.push(url);
          revoke(url);
        };
        (window as unknown as RecordingWindow).revokedUrls = revoked;
      });
      await page.goto('/styleguide');
      const input = page.getByLabel('Tour photo');
      const preview = page.getByRole('img', {
        name: 'Preview of the chosen photo',
      });

      await input.setInputFiles(firstPhoto);
      const firstSrc = await preview.getAttribute('src');
      expect(firstSrc).toMatch(/^blob:/);

      await input.setInputFiles(secondPhoto);
      await expect(preview).not.toHaveAttribute('src', firstSrc ?? '');

      const revoked = await page.evaluate(
        () => (window as unknown as RecordingWindow).revokedUrls,
      );
      expect(revoked).toContain(firstSrc);
    });
  });
}
