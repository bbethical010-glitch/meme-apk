import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('privacy_policy_agreed_version', '1.1');
    localStorage.setItem('has_seen_onboarding', 'true');
    localStorage.setItem('meme_mood_boards', JSON.stringify([1, 2, 3].map(id => ({
      id: `board-${id}`, title: `BOARD ${id}`, color: 'primary', memeUrls: [], createdAt: 1,
    }))));
  });
  await page.goto('/');
});

test('free home has opt-in packs and no unsolicited purchase prompt', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'HIT ME', exact: true })).toBeVisible();
  await expect(page.getByText('UNLOCK 24H — WATCH AD', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'GO PRO', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'GET', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Meme Capsule Store' })).toHaveCount(0);
});

test('board cap only shows its purchase prompt after a creation attempt', async ({ page }) => {
  await page.getByTitle('Moodboards', { exact: true }).click();
  await expect(page.getByRole('button', { name: '🔒 WATCH AD FOR +1 SLOT', exact: true })).toBeVisible();
  await expect(page.getByText('BOARD LIMIT REACHED → UNLOCK UNLIMITED BOARDS')).toHaveCount(0);
  await page.getByRole('button', { name: 'NEW BOARD', exact: true }).click();
  await expect(page.getByText('BOARD LIMIT REACHED → UNLOCK UNLIMITED BOARDS')).toBeVisible();
  await expect(page.getByRole('button', { name: 'GET', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meme_mood_boards')!).length)).toBe(3);
});

test('Settings Store survives 20 open/close cycles and shows no fake web prices', async ({ page }) => {
  await page.getByRole('button', { name: 'Open App Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'RESTORE PURCHASES', exact: true })).toBeVisible();
  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'GO AD-FREE', exact: true }).click();
    const store = page.getByRole('region', { name: 'Meme Capsule Store' });
    await expect(store).toBeVisible();
    await expect(store.getByRole('button', { name: 'GET', exact: true })).toHaveCount(5);
    if (i === 0) {
      await expect(store.getByText('UNAVAILABLE', { exact: true })).toHaveCount(5);
      await page.screenshot({ path: 'test-results/store-mobile.png' });
    }
    await page.getByRole('button', { name: 'Close Store', exact: true }).click();
    await expect(store).toHaveCount(0);
    await expect(page.getByText('APP SETTINGS', { exact: true })).toBeVisible();
  }
});

test('locked theme tap opens only that specific offer; browser purchase cannot unlock it', async ({ page }) => {
  await page.getByRole('button', { name: 'Open App Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'GET', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '🔒 CYBERPUNK CYAN', exact: true }).click();
  await expect(page.getByText('Electric cyan accents across your capsule.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'GET', exact: true })).toBeDisabled();
  expect(await page.locator('.app-container').getAttribute('data-theme')).toBe('classic');
  await page.getByRole('button', { name: 'Close theme offer' }).click();
  await expect(page.getByRole('button', { name: 'GET', exact: true })).toHaveCount(0);
});
