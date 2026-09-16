import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  '/',
  '/about',
  '/artisans',
  '/students',
  '/login',
  '/register',
  '/register/artisan',
  '/register/student',
  '/help-register',
  '/unauthorized',
  '/missing-page',
];
async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
test('Phase 1 public pages remain responsive in English and Hindi', async ({ page }, info) => {
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
  await page.screenshot({ path: info.outputPath('landing.png'), fullPage: true });
  expect(errors).toEqual([]);
});
test('language persists, registration selection opens real forms, and all roles are protected', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Choose language' }).selectOption('hi');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await page.getByRole('combobox', { name: 'भाषा चुनें' }).selectOption('en');
  await page.goto('/register');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'I’m a student' }) })
    .click();
  await expect(page).toHaveURL(/\/register\/student$/);
  await expect(page.getByLabel('Email address')).toBeEnabled();
  for (const role of ['artisan', 'student', 'admin']) {
    await page.goto('/dashboard/' + role + '/payments');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Open demo dashboard' })).toHaveCount(0);
  }
});
test('public pages pass automated accessibility checks', async ({ page }) => {
  test.setTimeout(180000);
  for (const route of publicRoutes) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect
      .soft(
        result.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map(({ target }) => target),
        })),
        route,
      )
      .toEqual([]);
  }
});
test('keyboard skip link and mobile drawer focus are preserved', async ({ page }, info) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (info.project.name !== 'desktop') {
    const trigger = page.getByRole('button', { name: 'Open navigation' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});
