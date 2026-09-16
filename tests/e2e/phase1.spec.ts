import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  '/',
  '/about',
  '/artisans',
  '/students',
  '/login',
  '/register',
  '/missing-page',
];
const dashboardRoutes = {
  artisan: [
    '',
    'my-manager',
    'growth-requests',
    'contract',
    'milestones',
    'business-growth',
    'payments',
    'reviews',
    'get-help',
  ],
  student: [
    '',
    'current-artisan',
    'discovery',
    'contracts',
    'tasks',
    'progress-reports',
    'payments',
    'completed-projects',
    'portfolio',
    'reviews',
  ],
  admin: [
    '',
    'artisans',
    'assisted-registrations',
    'students',
    'growth-requests',
    'matching',
    'contracts',
    'payments',
    'disputes',
    'reviews',
  ],
};

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
}

test('every public page renders in English and Hindi without overflow or browser errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of publicRoutes) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    await noHorizontalOverflow(page);
    await page.getByRole('combobox', { name: 'Choose language' }).selectOption('hi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await noHorizontalOverflow(page);
    await page.getByRole('combobox', { name: 'भाषा चुनें' }).selectOption('en');
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Artisans create.');
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
  await page.screenshot({ path: testInfo.outputPath('landing-viewport.png') });
  expect(errors).toEqual([]);
});

test('language selection persists and the role-selection journey works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Choose language' }).selectOption('hi');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('कारीगर रचते हैं।');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await page.getByRole('combobox', { name: 'भाषा चुनें' }).selectOption('en');
  await page.goto('/register');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'I’m a student' }) })
    .click();
  await expect(page.getByRole('radio', { name: 'Student Growth Manager' })).toBeChecked();
  await expect(page.getByLabel('Email address')).toBeDisabled();
  await expect(page.getByLabel('Password', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Open demo dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard\/student$/);
});

for (const role of ['artisan', 'student', 'admin'] as const) {
  test(`${role} route protection, navigation, placeholders and sign-out`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/dashboard/${role}/payments`);
    await expect(page).toHaveURL(new RegExp(`/login\\?role=${role}$`));
    await page.getByRole('button', { name: 'Open demo dashboard' }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${role}/payments$`));
    await expect(
      page.getByText('This area will record payments made outside Bharat Bazaar.'),
    ).toBeVisible();
    for (const slug of dashboardRoutes[role]) {
      const mobile = testInfo.project.name !== 'desktop';
      if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click();
      const nav = mobile
        ? page.getByRole('dialog').getByRole('navigation')
        : page.locator('.dashboard-sidebar nav');
      const href = `/dashboard/${role}${slug ? `/${slug}` : ''}`;
      await nav.locator(`a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.locator('main h1')).toBeVisible();
      await expect(
        page.getByText(
          'Demo workspace · All names, numbers and activities below are fictional. No changes are saved.',
        ),
      ).toBeVisible();
      await noHorizontalOverflow(page);
    }
    await page.getByRole('button', { name: 'Notifications', exact: true }).click();
    await expect(page.getByText('You’re all caught up')).toBeVisible();
    await page.getByRole('button', { name: 'Notifications', exact: true }).click();
    await page.getByRole('button', { name: 'Open user options' }).click();
    await page.getByRole('button', { name: 'Leave preview' }).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?role=${role}$`));
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
  });
}

test('wrong-role navigation is redirected and refresh ends the mock session', async ({ page }) => {
  await page.goto('/login?role=artisan');
  await page.getByRole('button', { name: 'Open demo dashboard' }).click();
  // SPA navigation preserves the in-memory preview while exercising the route guard.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/dashboard/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/dashboard\/artisan$/);
  await page.reload();
  await expect(page).toHaveURL(/\/login\?role=artisan$/);
});

test('public pages and each overview pass automated accessibility checks', async ({
  page,
}, testInfo) => {
  for (const route of publicRoutes) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect
      .soft(
        results.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
        })),
        `Accessibility on ${route}`,
      )
      .toEqual([]);
  }
  for (const role of ['artisan', 'student', 'admin']) {
    await page.goto(`/login?role=${role}`);
    await page.getByRole('button', { name: 'Open demo dashboard' }).click();
    await page.screenshot({ path: testInfo.outputPath(`${role}-dashboard.png`), fullPage: true });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect
      .soft(
        results.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
        })),
        `Accessibility on ${role} overview`,
      )
      .toEqual([]);
  }
});

test('keyboard skip link and mobile drawer focus work', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (testInfo.project.name !== 'desktop') {
    const trigger = page.getByRole('button', { name: 'Open navigation' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});

test('narrow 320px viewport stays within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await noHorizontalOverflow(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Open demo dashboard' }).click();
  await noHorizontalOverflow(page);
  await page.getByRole('combobox', { name: 'Choose language' }).selectOption('hi');
  await noHorizontalOverflow(page);
});
