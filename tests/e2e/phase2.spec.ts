import { randomBytes, randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function account() {
  const suffix = randomUUID().slice(0, 8);
  return {
    fullName: 'Browser Test ' + suffix,
    email: 'browser-' + randomUUID() + '@example.test',
    phone:
      '+91' + String((BigInt('0x' + randomBytes(6).toString('hex')) % 9000000000n) + 1000000000n),
    password: randomBytes(20).toString('hex') + 'Aa1',
  };
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
async function register(
  page: Page,
  role: 'artisan' | 'student',
  person: ReturnType<typeof account>,
) {
  await page.goto('/register/' + role);
  for (const [name, value] of Object.entries(person))
    await page.locator('[name="' + name + '"]').fill(value);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/onboarding/' + role + '$'));
}
async function onboard(page: Page, role: 'artisan' | 'student') {
  const first =
    role === 'artisan'
      ? {
          businessName: 'Browser Craft Studio',
          craftCategory: 'Pottery',
          city: 'Jaipur',
          state: 'Rajasthan',
          languages: 'Hindi, English',
        }
      : {
          college: 'Browser Test College',
          course: 'Design',
          studyYear: '2',
          city: 'Jaipur',
          state: 'Rajasthan',
          languages: 'Hindi, English',
        };
  for (const [name, value] of Object.entries(first))
    await page.locator('[name="' + name + '"]').fill(value);
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await expect(page.getByText('Progress saved. You can return later to continue.')).toBeVisible();
  if (role === 'artisan') {
    await page.reload();
    await expect(page.locator('[name="businessName"]')).toHaveValue('Browser Craft Studio');
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await expect(page.getByText('Progress saved. You can return later to continue.')).toBeVisible();
  }
  if (role === 'artisan') {
    await page.locator('[name="onlinePresence"]').fill('None yet');
    await page.locator('[name="businessProblems"]').fill('Need a clear product catalogue');
    await page.locator('[name="currentMonthlyRevenue"]').fill('4500');
  } else {
    await page
      .locator('[name="biography"]')
      .fill('I enjoy making product catalogues and photography.');
    await page.locator('[name="weeklyAvailabilityHours"]').fill('8');
    await page.getByRole('checkbox', { name: 'Canva Design', exact: true }).check();
    await page.getByLabel('Proficiency: Canva Design').selectOption('INTERMEDIATE');
  }
  await page
    .getByRole('button', {
      name: role === 'artisan' ? 'Complete my profile' : 'Submit for verification',
      exact: true,
    })
    .click();
  await expect(page.getByRole('heading', { name: 'Profile complete', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('link', { name: 'Go to my workspace', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/dashboard/' + role + '$'));
}
test('artisan registration, draft restoration, Hindi onboarding, session restoration and logout', async ({
  page,
}, info) => {
  const person = account();
  await register(page, 'artisan', person);
  await page.getByRole('combobox', { name: 'Choose language' }).selectOption('hi');
  await expect(page.getByLabel('व्यवसाय का नाम')).toBeVisible();
  await noOverflow(page);
  await page.getByRole('combobox', { name: 'भाषा चुनें' }).selectOption('en');
  await onboard(page, 'artisan');
  await page.reload();
  await expect(page.locator('main h1')).toContainText(person.fullName);
  await page.screenshot({ path: info.outputPath('artisan-dashboard.png'), fullPage: true });
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(
    page.getByRole('heading', { name: 'This page is not available for your role.' }),
  ).toBeVisible();
  await page.goto('/dashboard/artisan');
  await page.getByRole('button', { name: 'Open user options' }).click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard/artisan');
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('[name="identifier"]').fill(person.phone);
  await page.locator('[name="password"]').fill(person.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/artisan$/);
});
test('student registration, skill selection and pending verification', async ({ page }, info) => {
  await register(page, 'student', account());
  await onboard(page, 'student');
  await expect(page.getByText('Pending', { exact: true })).toBeVisible();
  await noOverflow(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map(({ id }) => id)).toEqual([]);
  await page.screenshot({ path: info.outputPath('student-dashboard.png'), fullPage: true });
});
test('login failure is generic and does not create a session', async ({ page }) => {
  await page.goto('/login');
  await page.locator('[name="identifier"]').fill(account().email);
  await page.locator('[name="password"]').fill('Wrong-password1');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Email, phone or password is incorrect.');
  expect(await page.evaluate(() => localStorage.getItem('bharat-bazaar-token'))).toBeNull();
});
test('assisted registration submits successfully and is administered privately', async ({
  page,
  request,
}, info) => {
  const person = account();
  await page.goto('/help-register');
  for (const [name, value] of Object.entries({
    name: person.fullName,
    phone: person.phone,
    city: 'Jaipur',
    state: 'Rajasthan',
    preferredCallTime: '4–6 pm IST',
    notes: 'Browser test request',
  }))
    await page.locator('[name="' + name + '"]').fill(value);
  await page.getByRole('button', { name: 'Request a call', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your request has been received.' }),
  ).toBeVisible();
  const session = await (await request.get('http://127.0.0.1:5101/__test__/admin-session')).json();
  await page.evaluate(
    (token: string) => localStorage.setItem('bharat-bazaar-token', token),
    session.token,
  );
  await page.goto('/dashboard/admin/assisted-registrations');
  const card = page
    .locator('.record-list .card')
    .filter({ has: page.getByRole('heading', { name: person.fullName }) });
  await expect(card.getByRole('link', { name: person.phone })).toBeVisible();
  await card.getByRole('combobox').selectOption('CONTACTED');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByText('Status updated successfully.')).toBeVisible();
  await page.getByLabel('Filter by status').selectOption('CONTACTED');
  await expect(card).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('admin-assistance.png'), fullPage: true });
});
test('admin views full student details and confirms verification and rejection', async ({
  page,
  request,
}, info) => {
  const person = account();
  await register(page, 'student', person);
  await onboard(page, 'student');
  const session = await (await request.get('http://127.0.0.1:5101/__test__/admin-session')).json();
  await page.evaluate(
    (token: string) => localStorage.setItem('bharat-bazaar-token', token),
    session.token,
  );
  await page.goto('/dashboard/admin/students');
  const card = page
    .locator('.record-card')
    .filter({ has: page.getByRole('heading', { name: person.fullName }) });
  await card.getByRole('link', { name: 'View profile' }).click();
  await expect(page.getByText('Canva Design · Intermediate')).toBeVisible();
  await page.getByRole('button', { name: 'Verify student', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reject student', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Admin review notes')
    .fill('Please add more portfolio detail.');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByText('Rejected', { exact: true }).first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Choose language' }).selectOption('hi');
  await expect(
    page.getByRole('button', { name: 'छात्र सत्यापित करें', exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('admin-student-review.png'), fullPage: true });
});
test('320px forms and Hindi skill selection stay inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await register(page, 'student', account());
  await page.getByRole('combobox', { name: 'Choose language' }).selectOption('hi');
  for (const [name, value] of Object.entries({
    college: 'Test College',
    course: 'Design',
    studyYear: '2',
    city: 'Jaipur',
    state: 'Rajasthan',
    languages: 'हिन्दी, अंग्रेज़ी',
  }))
    await page.locator('[name="' + name + '"]').fill(value);
  await page.getByRole('button', { name: 'सहेजें और आगे बढ़ें' }).click();
  await expect(page.getByRole('checkbox', { name: 'कैनवा डिज़ाइन' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'कैनवा डिज़ाइन' }).check();
  await noOverflow(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map(({ id }) => id)).toEqual([]);
});
