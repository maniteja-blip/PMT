import { test, expect } from '@playwright/test';

test.describe('Project Lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@pmt.local');
        await page.fill('input[name="password"]', 'pmt');
        await page.press('input[name="password"]', 'Enter');
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should create a new project', async ({ page }) => {
        await page.goto('/projects');

        // Open Create Modal
        await page.getByRole('button', { name: "New project" }).click();

        // Fill Form
        const projectName = `E2E Project ${Date.now()}`;
        await page.getByLabel("Name").fill(projectName);
        await page.getByLabel("Description").fill("Created by automated test");

        // Submit
        await page.getByRole("button", { name: "Create" }).click();

        // Verify Redirect
        await expect(page).toHaveURL(/\/projects\//);

        // Verify Title
        await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

        // --- Test Deletion (Full Lifecycle) ---
        // Click Actions
        await page.getByTestId('project-actions-trigger').click();

        // Handle Dialog/Confirm
        page.on('dialog', dialog => dialog.accept());
        await page.getByText('Delete').click();

        // Wait for redirect to /projects (deletion logic roughly redirects usually)
        // Or check toast.
        await expect(page).toHaveURL(/\/projects$/);

        // Verify it's gone
        await expect(page.getByText(projectName)).not.toBeVisible();
    });
});
