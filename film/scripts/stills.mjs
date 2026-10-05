// Review tool: bundle once, render full-resolution stills at the given times (seconds), and a
// contact sheet. Usage: npm run stills -- 1.5 3.2 14.4   (add --comp=StackLaunchLandscape)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const film = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const comp = args.find((a) => a.startsWith('--comp='))?.slice(7) ?? 'StackLaunch';
const times = args.filter((a) => !a.startsWith('--')).map(Number);
const out = join(film, 'out/stills');
await mkdir(out, { recursive: true });

const { enableConfig } = await import('./webpack-override.mjs');
const serveUrl = await bundle({ entryPoint: join(film, 'src/index.ts'), webpackOverride: enableConfig });
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions: { gl: 'angle' } });
const files = [];
for (const time of times) {
  const file = join(out, `${comp}-${time.toFixed(2)}.png`);
  await renderStill({ serveUrl, composition, output: file, frame: Math.round(time * composition.fps), chromiumOptions: { gl: 'angle' }, overwrite: true });
  files.push(file);
  console.log(file);
}
if (files.length > 1) {
  // Contact sheet: four across, in time order.
  const width = composition.width > composition.height ? 960 : 540;
  const height = Math.round((width * composition.height) / composition.width);
  const layout = files.map((_, i) => `${(i % 4) * width}_${Math.floor(i / 4) * height}`).join('|');
  const sheet = join(out, `${comp}-sheet.png`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex',
    `${files.map((_, i) => `[${i}]scale=${width}:${height}[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=0x333333`,
    sheet]);
  console.log(sheet);
}
