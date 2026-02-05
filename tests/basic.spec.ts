import { test, expect } from '@playwright/test';

test('basic page load', async ({ page }) => {
    console.log('Navigating...');
    await page.goto('/login');
    console.log('Page loaded. Checking title...');
    // Check for the "PMT" text on the card
    await expect(page.locator('.font-display')).toContainText('PMT');
});
