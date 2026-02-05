import { test, expect } from "@playwright/test";

test("login and open tasks", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("admin@pmt.local");
  await page.getByLabel("Password").fill("pmt");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  // Create a project
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill("Smoke Project");
  await page.getByRole("button", { name: /^Create$/ }).click();

  // On project page, create a task
  await expect(page).toHaveURL(/\/projects\//);
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Title").fill("Smoke Task");
  await page.getByRole("button", { name: /^Create$/ }).click();

  // Open task modal from tasks list
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await page.getByRole("link", { name: "Smoke Task" }).click();
  await expect(page.getByText("Dependencies", { exact: true })).toBeVisible();
});
