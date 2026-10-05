import { continueRender, delayRender, staticFile } from 'remotion';

// The app's type system (constants/theme.ts redesignFonts), loaded from the app's own files.
export const FONT = {
  display: 'BricolageGrotesque_700Bold',
  ui: 'HankenGrotesk_400Regular',
  uiMedium: 'HankenGrotesk_500Medium',
  uiSemiBold: 'HankenGrotesk_600SemiBold',
  uiBold: 'HankenGrotesk_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

let loading: Promise<void> | null = null;
export function loadFonts() {
  if (loading) return;
  const handle = delayRender('Loading Stack fonts');
  loading = Promise.all(Object.values(FONT).map(async (family) => {
    const face = new FontFace(family, `url(${staticFile(`fonts/${family}.ttf`)})`);
    await face.load();
    document.fonts.add(face);
  })).then(() => continueRender(handle));
}
