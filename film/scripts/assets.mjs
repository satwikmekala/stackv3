// Copies the app's own font files and logo art into public/ (gitignored) so Remotion can serve
// them. Runs before studio/render; the app remains the single source of these assets.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const film = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(film, '..');
const assets = {
  'fonts/BricolageGrotesque_700Bold.ttf': 'node_modules/@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf',
  'fonts/HankenGrotesk_400Regular.ttf': 'node_modules/@expo-google-fonts/hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf',
  'fonts/HankenGrotesk_500Medium.ttf': 'node_modules/@expo-google-fonts/hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf',
  'fonts/HankenGrotesk_600SemiBold.ttf': 'node_modules/@expo-google-fonts/hanken-grotesk/600SemiBold/HankenGrotesk_600SemiBold.ttf',
  'fonts/HankenGrotesk_700Bold.ttf': 'node_modules/@expo-google-fonts/hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf',
  'fonts/JetBrainsMono_400Regular.ttf': 'node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf',
  'fonts/JetBrainsMono_700Bold.ttf': 'node_modules/@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf',
  'images/logo-light.png': 'assets/images/logo light.png',
  'images/logo-medium.png': 'assets/images/logo medium.png',
  'images/logo-hard.png': 'assets/images/logo hard.png',
};
await mkdir(join(film, 'public/fonts'), { recursive: true });
await mkdir(join(film, 'public/images'), { recursive: true });
await Promise.all(Object.entries(assets).map(([to, from]) => copyFile(join(repo, from), join(film, 'public', to))));
console.log('film assets copied from the app → public/');
