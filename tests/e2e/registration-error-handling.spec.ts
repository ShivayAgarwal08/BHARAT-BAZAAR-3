import { expect, test, type Page } from '@playwright/test';

const registrationUrl = '**/api/v1/auth/register/artisan';

async function registrationFields(page: Page) {
  await page.locator('[name="fullName"]').fill('Registration Test Artisan');
  await page.locator('[name="email"]').fill('registration-test@example.test');
  await page.locator('[name="phone"]').fill('9876543210');
  await page.locator('[name="password"]').fill('Registration9Test');
}

test('artisan registration surfaces duplicate contact errors instead of a network error', async ({
  page,
}) => {
  await page.route(registrationUrl, (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'CONTACT_EXISTS' },
      }),
    }),
  );
  await page.goto('/register/artisan');
  await registrationFields(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'An account already uses these contact details. Try logging in.',
  );
  await expect(page.getByRole('alert')).not.toContainText('We could not reach the server');
});

test('artisan registration reserves the connection error for a genuine network failure', async ({
  page,
}) => {
  await page.route(registrationUrl, (route) => route.abort('failed'));
  await page.goto('/register/artisan');
  await registrationFields(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'We could not reach the server. Check your connection and try again. Nothing has been confirmed.',
  );
});
