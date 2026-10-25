import { chromium } from 'playwright';
import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(out);
const assets = path.join(out, 'composition/assets');
// Reviewed source images 1 and 2 are short, lighthearted cake memes.
const sources = JSON.parse(await readFile(path.join(assets, 'content/source.json'), 'utf8')).slice(0, 2);
const server = await createServer({ root: repo, server: { host: '127.0.0.1', port: 5184, strictPort: true }, clearScreen: false });
await server.listen();
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const context = await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
try {
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (route.request().method() !== 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (url.includes('/api/random-meme')) return route.fulfill({ json: { meme: sources[0].source } });
    const image = sources.find(s => s.source.url === url);
    if (image) return route.fulfill({ contentType: 'image/jpeg', body: await readFile(path.join(assets, 'content', image.local)) });
    if (url.includes('meme-api.com')) return route.fulfill({ status: 503, body: '{}' });
    return route.continue();
  });
  await page.addInitScript(({ seed }) => {
    localStorage.setItem('privacy_policy_agreed_version', '1.1');
    localStorage.setItem('has_seen_onboarding', 'true');
    localStorage.setItem('pref_prefetch_buffer', 'false');
    localStorage.setItem('pref_reddit_stream', 'false');
    localStorage.setItem('meme_favorites', JSON.stringify([{
      id: seed.id, url: seed.url, title: seed.title, author: seed.rights_note,
      source: 'Meme Capsule', mediaType: 'image', savedAt: 1,
    }]));
  }, { seed: sources[1].source });
  await page.goto('http://127.0.0.1:5184/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const snap = async name => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(assets, `captures/${name}.png`), animations: 'disabled' });
    console.log(`Captured ${name}`);
  };
  const button = page.getByRole('button', { name: 'HIT ME', exact: true });
  await button.waitFor();
  const hit = await button.boundingBox();
  await snap('home');
  await button.click();
  await page.locator('#ctaRow').waitFor({ timeout: 30000 });
  await snap('drop');
  await page.locator('#ctaRow').getByRole('button', { name: 'VAULT', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByTitle('Vault / Favorites', { exact: true }).click();
  await snap('vault');
  await page.getByTitle('Moodboards', { exact: true }).click();
  await page.getByRole('button', { name: 'NEW BOARD', exact: true }).click();
  await page.getByPlaceholder('E.G. 3 AM THOUGHTS, WORK PAIN...').fill('WORKPLACE CHAOS');
  await page.locator('form button[type="submit"]').click();
  await page.getByTitle('Home', { exact: true }).click();
  await page.locator('#ctaRow').getByRole('button', { name: 'PIN', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByTitle('Moodboards', { exact: true }).click();
  await snap('boards');
  await page.getByTitle('Home', { exact: true }).click();
  await page.getByRole('button', { name: 'More Options', exact: true }).click();
  await page.locator('#moreMenu').getByRole('button', { name: 'SHARE', exact: true }).click();
  await snap('share');
  await writeFile(path.join(out, 'capture-evidence.json'), JSON.stringify({
    viewport: { width: 430, height: 900, deviceScaleFactor: 2 }, hitButton: hit,
    sources: sources.map(s => ({ id: s.source.id, url: s.source.url })),
    method: 'Actual React UI in an isolated Playwright context; frozen API responses from public backend; external writes intercepted. Board created and current meme saved/pinned through UI.',
    buttons: await page.getByRole('button').allTextContents(),
  }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(assets, 'captures/capture-error.png') });
  console.error(await page.getByRole('button').allTextContents());
  throw error;
} finally {
  await browser.close();
  await server.close();
}
