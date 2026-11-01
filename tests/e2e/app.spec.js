import { test, expect } from '@playwright/test';

test('reload returns to welcome without persisting an identity in browser storage', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('welcome-screen')).toBeVisible();
  await expect(page.locator('button', { hasText: 'Start FlirtMate' })).toBeDisabled();
  await page.getByRole('radio', { name: 'English', exact: true }).check();
  await page.getByRole('button', { name: 'Start FlirtMate' }).click();
  await page.reload();
  await expect(page.getByTestId('welcome-screen')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('supports the core journey at 320px and without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await page.getByRole('radio', { name: 'English', exact: true }).check();
  await page.getByRole('button', { name: 'Start FlirtMate' }).click();
  await page.getByLabel('What did they say?').fill('A message from someone interesting');
  await page.getByRole('button', { name: 'Generate All Vibes' }).click();
  await expect(page.getByRole('heading', { name: 'Cute', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await page.getByRole('button', { name: 'Favorites' }).click();
  await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible();
});
