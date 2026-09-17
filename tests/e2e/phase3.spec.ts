import { expect, test } from '@playwright/test';

// These route-level checks deliberately do not create trial data. Functional trial
// authorization and state transitions remain covered by the server integration suite.
test('Phase 3 workspace routes remain protected and reachable through login', async ({ page }) => {
  for (const route of [
    '/dashboard/artisan/my-manager',
    '/dashboard/artisan/find-manager',
    '/dashboard/artisan/my-growth',
    '/dashboard/admin/growth-requests',
    '/dashboard/student/my-artisan',
    '/dashboard/student/opportunities',
    '/dashboard/artisan/contract/example/tasks',
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  }
});
