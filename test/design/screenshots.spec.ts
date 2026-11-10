import path from 'node:path';
import { test } from '@playwright/test';

const mockupsDir = path.resolve(import.meta.dirname, '../../docs/design/mockups');
const screensDir = path.resolve(import.meta.dirname, '../../docs/design/screens');

const overviewUrl = `file://${path.join(mockupsDir, 'overview.html')}`;

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
