import { execFileSync } from 'node:child_process';
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const composition = path.join(out, 'composition');
const lines = [
  { id: 'hook', start: 0.35, window: 3.65, text: "Your five-minute break shouldn't become an endless scroll." },
  { id: 'drop', start: 4.35, window: 5.65, text: "Meet Meme Capsule. Tap Hit Me, and a random meme drops. That's it." },
  { id: 'keep', start: 10.35, window: 6.65, text: 'Found a keeper? Save it to your Vault. Build Mood Boards for every kind of chaos.' },
  { id: 'share', start: 17.35, window: 6.65, text: 'Then send the good stuff straight to the group chat. No hunting for that screenshot.' },
  { id: 'close', start: 24.35, window: 5.65, text: 'One tap. One meme. Zero algorithms. Meme Capsule.' },
];
for (const line of lines) {
  const relative = `assets/voice/${line.id}.wav`;
  const target = path.join(composition, relative);
  try { await access(target); }
  catch {
    execFileSync('npx', ['--yes', 'hyperframes@0.8.116', 'tts', line.text, '--voice', 'af_heart', '--output', relative], {
      cwd: composition, stdio: 'inherit', timeout: 180000,
    });
  }
  line.path = relative;
  line.duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', target], { encoding: 'utf8' }).trim());
  console.log(`${line.id}: ${line.duration.toFixed(3)}s / ${line.window}s available`);
}
await writeFile(path.join(out, 'voice-timing.json'), JSON.stringify({ provider: 'Kokoro-82M', voice: 'af_heart', lines }, null, 2));
if (lines.some(line => line.duration > line.window)) throw new Error('Narration exceeds a scene: revise copy or timing before composition.');
