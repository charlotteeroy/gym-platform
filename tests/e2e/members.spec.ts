import { test, expect } from '@playwright/test';

test.describe('Members Management', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a test user
    const timestamp = Date.now();
    const email = `member-test-${timestamp}@example.com`;

    await page.goto('/register');
    await page.getByLabel('First name').fill('Member');
    await page.getByLabel('Last name').fill('Tester');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Navigate to members page
    await page.getByRole('link', { name: 'Members' }).click();
    await expect(page).toHaveURL('/members');
  });

  test('should display empty members state', async ({ page }) => {
    await expect(page.getByText('No members yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Your First Member' })).toBeVisible();
  });

  test('should open add member dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Add.*Member/ }).first().click();

    // Dialog should appear
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('should show validation on empty member form', async ({ page }) => {
    await page.getByRole('button', { name: /Add.*Member/ }).first().click();

    // Try to submit empty form
    await page.getByRole('button', { name: 'Add Member' }).click();

    // Should show validation errors
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /Add.*Member/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should be closed
    await expect(page.getByRole('heading', { name: 'Add New Member' })).not.toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search members...');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
  });
});
