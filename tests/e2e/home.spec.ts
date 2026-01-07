import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the landing page', async ({ page }) => {
    await page.goto('/');

    // Check header
    await expect(page.getByText('GymPlatform', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();

    // Check hero section
    await expect(
      page.getByRole('heading', { name: 'The Modern Gym Management Platform' })
    ).toBeVisible();

    // Check feature cards
    await expect(page.getByText('Member Management')).toBeVisible();
    await expect(page.getByText('Class Scheduling')).toBeVisible();
    await expect(page.getByText('Analytics & Insights')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('should have responsive layout', async ({ page }) => {
    await page.goto('/');

    // Desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    // Page should still be functional
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Gym Platform/);
  });
});
