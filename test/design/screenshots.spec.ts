import path from 'node:path';
import { test } from '@playwright/test';

const mockupsDir = path.resolve(import.meta.dirname, '../../docs/design/mockups');
const screensDir = path.resolve(import.meta.dirname, '../../docs/design/screens');

const overviewUrl = `file://${path.join(mockupsDir, 'overview.html')}`;
const tourUrl = `file://${path.join(mockupsDir, 'tour.html')}`;

test.describe('overview mockup, mobile', () => {
  test.use({ viewport: { width: 375, height: 1200 } });

  test('renders the overview at 375px', async ({ page }) => {
    await page.goto(overviewUrl);
    await page.screenshot({
      path: path.join(screensDir, 'overview-375.png'),
      fullPage: true,
    });
  });
});

test.describe('overview mockup, desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('renders the overview at 1280px', async ({ page }) => {
    await page.goto(overviewUrl);
    await page.screenshot({
      path: path.join(screensDir, 'overview-1280.png'),
      fullPage: true,
    });
  });
});

test.describe('tour mockup, mobile', () => {
  test.use({ viewport: { width: 375, height: 1200 } });

  test('renders the tour page at 375px', async ({ page }) => {
    await page.goto(tourUrl);
    await page.screenshot({
      path: path.join(screensDir, 'tour-375.png'),
      fullPage: true,
    });
  });
});

test.describe('tour mockup, desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('renders the tour page at 1280px', async ({ page }) => {
    await page.goto(tourUrl);
    await page.screenshot({
      path: path.join(screensDir, 'tour-1280.png'),
      fullPage: true,
    });
  });
});
