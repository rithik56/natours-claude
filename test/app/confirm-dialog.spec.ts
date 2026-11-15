// The native confirm dialog's safe default and its close paths, in a real browser (U4, T-03-11).
import { expect, test } from '@playwright/test';

const TRIGGER = 'Deactivate account';
const CONFIRM = 'Deactivate my account';
const DONE = 'Deactivation confirmed.';

for (const width of [375, 1280]) {
  test.describe(`confirm-dialog at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U4] opening the dialog focuses Cancel, not the destructive action', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      await page.getByRole('button', { name: TRIGGER, exact: true }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'Cancel' }),
      ).toBeFocused();
    });

    test('[T-03-11] pressing Enter right after opening activates Cancel, never the destructive action', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      await page.getByRole('button', { name: TRIGGER, exact: true }).click();
      // Checked first, so the hidden assertion below cannot pass on a dialog that never opened.
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Enter');

      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page.getByText(DONE)).toHaveCount(0);
    });

    test('[U4] clicking the backdrop leaves the dialog open', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      await page.getByRole('button', { name: TRIGGER, exact: true }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // The top-left corner of the viewport is outside the centred dialog box, so it is the backdrop.
      await page.mouse.click(4, 4);
      await expect(dialog).toBeVisible();
    });

    test('[U4] Escape closes the dialog without confirming', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      await page.getByRole('button', { name: TRIGGER, exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');

      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page.getByText(DONE)).toHaveCount(0);
    });

    test('[U4] the confirm button runs the destructive action and closes the dialog', async ({
      page,
    }) => {
      await page.goto('/styleguide');
      await page.getByRole('button', { name: TRIGGER, exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: CONFIRM })
        .click();

      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page.getByText(DONE)).toBeVisible();
    });
  });
}
