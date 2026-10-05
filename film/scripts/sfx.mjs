// Writes the cue sheet (out/cues.json) and synthesises a temp SFX mix (public/sfx/temp-sfx.wav)
// from src/sound/cues.ts, the same timeline the picture uses. The mix is a timing guide for
// review, not the final sound design: tactile, soft, never aggressive.
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const film = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundled = await build({
  entryPoints: [join(film, 'src/sound/cues.ts')], bundle: true, write: false, format: 'esm', platform: 'node',
  nodePaths: [join(film, 'node_modules')], logLevel: 'error',
});
const { buildCues } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const { DURATION } = await import(`data:text/javascript;base64,${Buffer.from((await build({
  entryPoints: [join(film, 'src/timeline.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error',
})).outputFiles[0].text).toString('base64')}`);
const cues = buildCues();
await mkdir(join(film, 'out'), { recursive: true });
await writeFile(join(film, 'out/cues.json'), JSON.stringify(cues.map((cue) => ({ ...cue, t: Math.round(cue.t * 1000) / 1000 })), null, 2));

const RATE = 48000;
const length = Math.ceil(DURATION * RATE);
const L = new Float32Array(length);
const R = new Float32Array(length);
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const add = (start, samples, fn, pan = 0) => {
  const s0 = Math.round(start * RATE);
  for (let i = 0; i < samples && s0 + i < length; i++) {
    if (s0 + i < 0) continue;
    const v = fn(i / RATE, i);
    L[s0 + i] += v * (1 - Math.max(0, pan));
    R[s0 + i] += v * (1 + Math.min(0, pan));
  }
};
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
const thump = (t0, f0, f1, decay, gain) => {
  let phase = 0;
  add(t0, RATE * decay * 6, (t) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.04);
    phase += (2 * Math.PI * f) / RATE;
    return Math.sin(phase) * env(t, 0.002, decay) * gain;
  });
  let lp = 0;
  add(t0, RATE * 0.012, (t) => { lp += (noise() - lp) * 0.3; return lp * env(t, 0.0005, 0.004) * gain * 0.6; });
};
const tone = (t0, freq, decay, gain, attack = 0.004) => add(t0, RATE * decay * 6, (t) => Math.sin(2 * Math.PI * freq * t) * env(t, attack, decay) * gain);
const click = (t0, gain, brightness = 0.6) => {
  let hp = 0; let prev = 0;
  add(t0, RATE * 0.02, (t) => { const n = noise(); hp = brightness * (hp + n - prev); prev = n; return hp * env(t, 0.0003, 0.003) * gain; });
};

for (const cue of cues) {
  const level = cue.level ?? 1;
  const pitch = cue.pitch ?? 1;
  switch (cue.kind) {
    case 'tap': click(cue.t, 0.35 * level); tone(cue.t, 2200, 0.012, 0.05 * level); break;
    case 'tick': tone(cue.t, 1320 * pitch, 0.045, 0.12 * level); tone(cue.t, 2640 * pitch, 0.02, 0.04 * level); break;
    case 'snap': click(cue.t, 0.22 * level, 0.3); thump(cue.t, 420, 260, 0.02, 0.08 * level); break;
    case 'land': thump(cue.t, 150 * pitch, 72 * pitch, 0.07, 0.42 * level); click(cue.t, 0.12, 0.2); break;
    case 'roll': [0, 0.04, 0.08].forEach((d, i) => tone(cue.t + d, 1800 + i * 240, 0.015, 0.06)); break;
    case 'whoosh': { let lp = 0; add(cue.t, RATE * 0.26, (t) => { lp += (noise() - lp) * (0.02 + 0.1 * Math.sin(Math.PI * t / 0.26)); return lp * Math.sin(Math.PI * t / 0.26) * 0.35 * level; }); break; }
    case 'success': tone(cue.t, 659.3, 0.18, 0.1); tone(cue.t + 0.07, 987.8, 0.25, 0.09); break;
    case 'press': thump(cue.t, 110, 46, 0.16, 0.7); click(cue.t, 0.25, 0.25); break;
    case 'fuse': thump(cue.t, 180, 90, 0.05, 0.4 * level); tone(cue.t, 740, 0.06, 0.05 * level); break;
    case 'gold': add(cue.t, RATE * cue.length, (t) => (Math.sin(2 * Math.PI * 2637 * t) + 0.6 * Math.sin(2 * Math.PI * 3951 * t)) * Math.sin(Math.PI * t / cue.length) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 18 * t)) * 0.035); break;
    case 'drop': thump(cue.t, 170 * pitch, 80 * pitch, 0.08, 0.45); break;
    case 'seal': thump(cue.t, 130, 60, 0.12, 0.5); tone(cue.t, 523.3, 0.3, 0.05); break;
    case 'week': thump(cue.t, 200 * pitch, 110 * pitch, 0.03, 0.22 * level); break;
    case 'rise': {
      // A warm pad (a fifth, lightly detuned) swelling under the time-lapse; cut dead for the silence beat.
      const dur = cue.length;
      add(cue.t, RATE * dur, (t) => {
        const swell = Math.min(1, t / dur) ** 1.6 * Math.min(1, (dur - t) / 0.04);
        const p = [110, 110.6, 164.8, 220.4].reduce((sum, f) => sum + Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * 0.3 * t)), 0);
        return p * swell * 0.035;
      });
      break;
    }
    case 'textDrop': thump(cue.t, 120 * pitch, 70 * pitch, 0.06, 0.28); break;
    case 'impact': {
      thump(cue.t, 90, 38, 0.32, 1.0);
      tone(cue.t, 32, 0.5, 0.35, 0.01);
      click(cue.t, 0.4, 0.2);
      break;
    }
    case 'card': thump(cue.t, 260 * pitch, 150 * pitch, 0.03, 0.2); break;
    case 'tone': [261.6, 392, 523.3].forEach((f, i) => tone(cue.t + i * 0.02, f, 0.55, 0.05, 0.02)); break;
    default: break;
  }
}

// Soft limiter, then 16-bit PCM WAV.
const pcm = Buffer.alloc(44 + length * 4);
const write = (offset, text) => pcm.write(text, offset);
write(0, 'RIFF'); pcm.writeUInt32LE(36 + length * 4, 4); write(8, 'WAVE'); write(12, 'fmt ');
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); write(36, 'data'); pcm.writeUInt32LE(length * 4, 40);
for (let i = 0; i < length; i++) {
  pcm.writeInt16LE(Math.round(Math.tanh(L[i] * 1.2) * 0.85 * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.tanh(R[i] * 1.2) * 0.85 * 32767), 46 + i * 4);
}
await mkdir(join(film, 'public/sfx'), { recursive: true });
await writeFile(join(film, 'public/sfx/temp-sfx.wav'), pcm);
console.log(`${cues.length} cues → out/cues.json, temp mix → public/sfx/temp-sfx.wav`);
