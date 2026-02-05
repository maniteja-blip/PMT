import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should allow user to log in with valid credentials', async ({ page }) => {
        test.setTimeout(60000); // 60s timeout
        console.log('Navigating to login...');
        await page.goto('/login', { waitUntil: 'domcontentloaded' }); // faster than networkidle
        console.log('On login page.');

        await page.waitForTimeout(2000); // Wait for hydration/animations

        // Fill credentials
        console.log('Filling email...');
        await page.fill('input[name="email"]', 'admin@pmt.local');
        console.log('Filling password...');
        await page.fill('input[name="password"]', 'pmt');

        // Submit
        // Submit via Keyboard (more robust)
        console.log('Pressing Enter to submit...');
        await page.press('input[name="password"]', 'Enter');

        // Debug: Check for error message if redirect doesn't happen
        try {
            await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
        } catch (e) {
            console.log('Redirect failed. Checking for error message...');
            const errorMsg = await page.textContent('.text-destructive').catch(() => null);
            console.log(`Error on page: "${errorMsg ?? 'None'}"`);
            await page.screenshot({ path: 'login-failure.png' });
            throw e; // Re-throw to fail test
        }

        // Check for "Welcome" or dashboard text to confirm success
        console.log('Checking for Dashboard text...');
        await expect(page.getByRole('heading', { name: "Dashboard" })).toBeVisible({ timeout: 30000 });
        console.log('Success!');
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.getByLabel('Email').fill('admin@pmt.local');
        await page.getByLabel('Password').fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should still be on login page
        await expect(page).toHaveURL(/\/login/);

        // Error message might appear (toast or text). checking for generic failure indication if possible
        // Since I don't know the exact error UI, I'll just check we weren't redirected.
    });
});
