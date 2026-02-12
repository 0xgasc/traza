import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should render the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/traza/i);
  });
});

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create/i })).toBeVisible();
  });

  test('should reject login with empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    // Form validation should prevent submission
    await expect(page.locator('input:invalid')).toHaveCount(1);
  });
});

test.describe('Signing Flow', () => {
  test('should show error for invalid signing token', async ({ page }) => {
    await page.goto('/sign/invalid-token');
    // Should show an error state for invalid token
    await expect(
      page.getByText(/invalid|expired|not found/i),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
