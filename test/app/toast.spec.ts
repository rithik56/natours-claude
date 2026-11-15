// The toast in the styleguide, in a real browser: timed dismissal, early close, a polite live region and reduced motion (U4, U25).
import { expect, test } from '@playwright/test';

const message = 'Review posted for Kerala Backwaters and Hills.';
const region = (page: import('@playwright/test').Page) =>
  page.locator('[aria-live="polite"]', { hasText: message });

test.describe('toast', () => {
  test('[U25] the toast auto-dismisses after its duration', async ({
    page,
  }) => {
    await page.goto('/styleguide');

    await expect(region(page)).toBeVisible();
    // The default duration is 5 seconds; the wait allows for hydration.
    await expect(region(page)).toHaveCount(0, { timeout: 10_000 });
  });

  test('[U25] the close button dismisses the toast before its duration ends', async ({
    page,
  }) => {
    await page.goto('/styleguide');

    await expect(region(page)).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(region(page)).toHaveCount(0);
  });

  test('[U25] the toast lives in an aria-live polite region, not an assertive one', async ({
    page,
  }) => {
    await page.goto('/styleguide');

    await expect(region(page)).toHaveAttribute('aria-live', 'polite');
    await expect(
      page.locator('[aria-live="assertive"]', { hasText: message }),
    ).toHaveCount(0);
  });

  test('[U25] under reduced motion the toast has no entrance animation', async ({
    page,
  }) => {
    await page.goto('/styleguide');

    const animationName = await region(page).evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    expect(animationName).toBe('none');
  });
});

test.describe('toast motion without reduced motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('[U25] the entrance animation lasts at most 200 milliseconds', async ({
    page,
  }) => {
    await page.goto('/styleguide');

    const { name, seconds } = await region(page).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        name: style.animationName,
        seconds: Number.parseFloat(style.animationDuration),
      };
    });
    expect(name).not.toBe('none');
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(0.2);
  });
});
