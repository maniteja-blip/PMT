import { test, expect } from '@playwright/test';

test.describe('Role Based Access Control', () => {

    test('Admin should see delete options', async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@pmt.local');
        await page.press('input[name="password"]', 'Enter');
        await expect(page).toHaveURL(/\/dashboard/);

        // Go to Projects
        await page.goto('/projects');
        // Open first project
        await page.locator('a[href^="/projects/"]').first().click();

        // Check for Project Actions Dropdown
        // Click the button with the 3 dots icon
        await page.getByTestId('project-actions-trigger').click();

        // Expect "Delete" item to be visible
        await expect(page.getByText('Delete')).toBeVisible();
    });

    test('Member should NOT see delete options', async ({ page }) => {
        // Login as Member
        await page.goto('/login');
        await page.fill('input[name="email"]', 'member@pmt.local'); // Created in seed
        await page.press('input[name="password"]', 'Enter');
        await expect(page).toHaveURL(/\/dashboard/);

        // Go to Projects
        await page.goto('/projects');

        // Open first project (assuming member can view public projects)
        await page.locator('a[href^="/projects/"]').first().click();

        // Click Project Actions
        await page.getByTestId('project-actions-trigger').click();

        // Expect "No permission" text or absence of Delete
        await expect(page.getByText('No permission')).toBeVisible();
        await expect(page.getByText('Delete')).not.toBeVisible();
    });
});
