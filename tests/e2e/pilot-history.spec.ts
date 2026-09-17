import { expect, test } from '@playwright/test';

// Browser-only fixtures isolate routing/presentation. The trial integration suite
// separately verifies these relationships and ownership against the real database.
test('completed pilot opens from My Growth history and survives direct refresh', async ({
  page,
}) => {
  const requestId = '11111111-1111-4111-8111-111111111111';
  const contractId = '22222222-2222-4222-8222-222222222222';
  const request = {
    id: requestId,
    title: 'Completed pilot fixture',
    status: 'COMPLETED',
    problemDescription: 'Catalogue support',
  };
  const contract = {
    id: contractId,
    title: 'Sponsored pilot fixture',
    contractType: 'FREE_TRIAL',
    status: 'COMPLETED',
    artisanPaymentAmount: '0.00',
    platformStudentStipend: '3000.00',
    deliverables: 'Approved catalogue',
  };
  const current = {
    assignment: { id: 'paid-assignment', type: 'PAID', status: 'ACTIVE' },
    artisan: { fullName: 'Fixture artisan' },
    student: { fullName: 'Fixture manager' },
    contract: {
      ...contract,
      id: 'paid-contract',
      contractType: 'PAID',
      status: 'ACTIVE',
      artisanPaymentAmount: '2500.00',
    },
    discovery: { recommendedServices: 'Current paid work' },
    request: null,
    milestones: [],
    metrics: [{ id: 'paid-progress', type: 'PROGRESS', monthlyRevenue: '42000.00' }],
  };
  const responses: Record<string, unknown> = {
    '/auth/me': {
      id: 'fixture-user',
      role: 'ARTISAN',
      fullName: 'Fixture artisan',
      onboardingCompleted: true,
    },
    '/artisans/me/current-engagement': current,
    '/artisans/me/growth-requests': { items: [request], total: 1, page: 1, limit: 20 },
    ['/artisans/me/growth-requests/' + requestId]: {
      request,
      assignment: { status: 'COMPLETED' },
      discovery: { status: 'REVIEWED' },
      skills: [],
      contract,
    },
    ['/artisans/me/contracts/' + contractId]: contract,
  };
  await page.addInitScript(() =>
    localStorage.setItem('bharat-bazaar-token', 'browser-fixture-only'),
  );
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (route.request().method() !== 'GET') throw new Error('History must not mutate data');
    if (!(path in responses)) throw new Error('Unexpected history API: ' + path);
    await route.fulfill({ json: { success: true, data: responses[path] } });
  });
  await page.goto('/dashboard/artisan/my-growth');
  await expect(page.getByText('₹42000.00', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View pilot history', exact: true }).click();
  await expect(page).toHaveURL(/my-growth\?history=1$/);
  await expect(page.getByRole('heading', { name: request.title })).toBeVisible();
  await page.reload();
  const open = page.getByRole('link', { name: 'Open', exact: true });
  await expect(open).toHaveAttribute('href', '/dashboard/artisan/growth-requests/' + requestId);
  await open.click();
  await expect(page.getByRole('heading', { name: '404', exact: true })).toHaveCount(0);
  const viewContract = page.getByRole('link', { name: 'View contract', exact: true });
  await expect(viewContract).toHaveAttribute('href', '/dashboard/artisan/contract/' + contractId);
  await page.reload();
  await viewContract.click();
  await expect(page.getByText('Platform-sponsored pilot', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Your cost: ₹0. The student stipend is sponsored by Bharat Bazaar.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('main button, main form, main input')).toHaveCount(0);
  await expect(page.getByText(/payment due|paid directly by the artisan/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '404', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Your cost: ₹0.', { exact: false })).toBeVisible();
  await page.goto('/dashboard/artisan/my-growth');
  await expect(page).toHaveURL(/\/dashboard\/artisan\/my-growth$/);
  await expect(page.getByRole('heading', { name: request.title })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View pilot history', exact: true })).toBeVisible();
  await page.goto('/dashboard/artisan/my-manager');
  await expect(page.getByText('Artisan-paid engagement', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Monthly rate: ₹2500.00. Payment is made directly to the student.', {
      exact: true,
    }),
  ).toBeVisible();
});
