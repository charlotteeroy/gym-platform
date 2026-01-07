import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a test user
    const timestamp = Date.now();
    const email = `dashboard-test-${timestamp}@example.com`;

    await page.goto('/register');
    await page.getByLabel('First name').fill('Dashboard');
    await page.getByLabel('Last name').fill('Tester');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard with stats', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check for stat cards
    await expect(page.getByText('Total Members')).toBeVisible();
    await expect(page.getByText('Active Subscriptions')).toBeVisible();
    await expect(page.getByText('Classes This Week')).toBeVisible();
    await expect(page.getByText('Monthly Revenue')).toBeVisible();
  });

  test('should have working sidebar navigation', async ({ page }) => {
    // Check sidebar links are visible
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Classes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should navigate to members page', async ({ page }) => {
    await page.getByRole('link', { name: 'Members' }).click();
    await expect(page).toHaveURL('/members');
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
  });

  test('should navigate to classes page', async ({ page }) => {
    await page.getByRole('link', { name: 'Classes' }).click();
    await expect(page).toHaveURL('/classes');
    await expect(page.getByRole('heading', { name: 'Classes', exact: true })).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  });

  test('should be able to sign out', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign out' }).click();

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
