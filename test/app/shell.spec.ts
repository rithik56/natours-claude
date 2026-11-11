// The app shell on the real home page, in a real browser (U4, U9, U19).
import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test.describe(`shell at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('[U9] the home page has one h1 and the header, main and footer landmarks', async ({
      page,
    }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      await expect(page.getByRole('navigation')).toHaveCount(2);
    });

    test('[U9] the skip link is the first focusable element and moves focus to main', async ({
      page,
    }) => {
      await page.goto('/');

      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('link', { name: 'Skip to main content' }),
      ).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
    });

    test('[U19] the header nav lists Tours, My tours, Log in and Sign up', async ({
      page,
    }) => {
      await page.goto('/');

      const nav = page.getByRole('navigation', { name: 'Main' });
      await expect(
        nav.getByRole('link', { name: 'Tours', exact: true }),
      ).toHaveAttribute('href', '/');
      await expect(nav.getByRole('link', { name: 'My tours' })).toHaveAttribute(
        'href',
        '/my-tours',
      );
      await expect(nav.getByRole('link', { name: 'Log in' })).toHaveAttribute(
        'href',
        '/login',
      );
      await expect(nav.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
        'href',
        '/signup',
      );
    });

    test('[U4] the footer repeats the header nav and links to the photo credits', async ({
      page,
    }) => {
      await page.goto('/');

      const footer = page.getByRole('contentinfo');
      await expect(
        footer.getByRole('link', { name: 'Log in' }),
      ).toHaveAttribute('href', '/login');
      await expect(
        footer.getByRole('link', { name: 'Photo credits' }),
      ).toHaveAttribute('href', '/credits');
      await expect(
        footer.getByText(`© ${new Date().getFullYear()} Natours.`),
      ).toBeVisible();
    });
  });
}

test.describe('menu at 375px', () => {
  test.use({ viewport: { width: 375, height: 900 } });

  test('[U19] the menu button toggles aria-expanded and shows the nav', async ({
    page,
  }) => {
    await page.goto('/');

    const menu = page.getByRole('button', { name: 'Menu' });
    const nav = page.getByRole('navigation', { name: 'Main' });

    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();

    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();

    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
  });
});

test.describe('without JavaScript at 375px', () => {
  test.use({ viewport: { width: 375, height: 900 }, javaScriptEnabled: false });

  test('[U19] the nav links render as a plain list with no menu button', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'My tours' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Log in' })).toBeVisible();
  });
});
