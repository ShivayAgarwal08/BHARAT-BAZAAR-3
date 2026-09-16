import { expect, test } from '@playwright/test';

// Marketplace, payments, reviews and disputes require an authenticated contract
// participant. Keep this smoke test non-mutating; their ownership/state rules are
// exercised in the server suite with isolated records.
test('Phase 4 marketplace and payment routes remain role-protected', async ({ page }) => {
  for (const route of [
    '/dashboard/artisan/marketplace',
    '/dashboard/student/marketplace-requests',
    '/dashboard/artisan/payments',
    '/dashboard/artisan/reviews',
    '/dashboard/admin/disputes',
    '/dashboard/admin/payments',
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  }
});
