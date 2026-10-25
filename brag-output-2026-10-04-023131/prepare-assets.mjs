import { mkdir, copyFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(out);
const assets = path.join(out, 'composition/assets');
const bundled = path.join(repo, '.claude/skills/brag/assets');
for (const dir of ['fonts', 'music', 'sfx', 'vendor', 'content', 'captures', 'voice']) {
  await mkdir(path.join(assets, dir), { recursive: true });
}
const copies = [
  [path.join(repo, 'public/assets/meme_capsule_app_icon_512x512.png'), 'icon.png'],
  [path.join(out, 'composition/node_modules/gsap/dist/gsap.min.js'), 'vendor/gsap.min.js'],
  [path.join(bundled, 'music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3'), 'music/bed.mp3'],
  [path.join(bundled, 'sfx/impact/impactSoft_medium_001.ogg'), 'sfx/land.ogg'],
  [path.join(bundled, 'sfx/interface/click_003.ogg'), 'sfx/tap.ogg'],
  [path.join(bundled, 'sfx/casino/card-slide-1.ogg'), 'sfx/card.ogg'],
];
for (const [from, to] of copies) await copyFile(from, path.join(assets, to));
for (const font of ['anton', 'oswald']) {
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/${font}/files/${font}-latin-400-normal.woff2`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  await writeFile(path.join(assets, `fonts/${font}.woff2`), Buffer.from(await response.arrayBuffer()));
}
const manifest = path.join(assets, 'content/source.json');
try {
  await access(manifest);
  console.log('Preserved existing frozen content manifest.');
} catch {
  const api = 'https://meme-capsule-eww.pages.dev/api/random-meme';
  const entries = [];
  for (let i = 0; i < 3; i++) {
    const response = await fetch(api, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Content endpoint: ${response.status}`);
    const payload = await response.json();
    const meme = payload.meme;
    if (!meme?.url || meme.media_type !== 'image') throw new Error('Expected an approved image meme.');
    const image = await fetch(meme.url);
    if (!image.ok) throw new Error(`Image: ${image.status}`);
    const local = `meme-${i + 1}.jpg`;
    await writeFile(path.join(assets, 'content', local), Buffer.from(await image.arrayBuffer()));
    entries.push({ endpoint: api, source: meme, local });
  }
  await writeFile(manifest, JSON.stringify(entries, null, 2));
}
console.log('Local fonts, runtime, icon, music, SFX and frozen content prepared.');
