import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(out, 'composition/assets');
const crops = {
  home: '860:800:0:200', drop: '784:1090:38:340',
  vault: '820:1440:20:160', boards: '840:1040:10:155', share: '850:925:5:720',
};
for (const [name, crop] of Object.entries(crops)) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(assets, `captures/${name}.png`), '-vf', `crop=${crop}`, '-frames:v', '1', path.join(assets, `captures/${name}-detail.png`)]);
}
const data = JSON.parse(await readFile(path.join(assets, 'music/energy.json'), 'utf8'));
const trimmed = { fps: data.fps, totalFrames: 900, frames: data.frames.slice(0, 900).map(f => ({ rms: f.rms, bands: [f.bands[0]] })) };
await writeFile(path.join(assets, 'music/energy.js'), `window.MEME_AUDIO_DATA = ${JSON.stringify(trimmed)};\n`);
console.log('Five UI detail crops and deterministic 30-second music-energy data prepared.');
