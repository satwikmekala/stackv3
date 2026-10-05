import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { WeekReport } from '@/features/report/weekReport';
import { WEEK_REPORT_PAGE, weekReportFilename, weekReportHtml, type WeekReportAssets, type WeekReportFonts } from '@/features/report/weekReportHtml';

const FONT_MODULES: Record<keyof WeekReportFonts, number> = {
  display: require('@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
  ui: require('@expo-google-fonts/hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf'),
  uiSemiBold: require('@expo-google-fonts/hanken-grotesk/600SemiBold/HankenGrotesk_600SemiBold.ttf'),
  uiBold: require('@expo-google-fonts/hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf'),
  uiItalic: require('@expo-google-fonts/hanken-grotesk/400Regular_Italic/HankenGrotesk_400Regular_Italic.ttf'),
  mono: require('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
  monoBold: require('@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf'),
};

const LOGO_MODULE: number = require('@/assets/images/logo.png');

let assetCache: Promise<WeekReportAssets> | null = null;

async function readBase64(module: number): Promise<string | undefined> {
  try {
    const asset = await Asset.fromModule(module).downloadAsync();
    return asset.localUri ? await new File(asset.localUri).base64() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The app's own typefaces and official logo, embedded so the document matches Stack.
 * Anything unreadable falls back (system faces, a vector copy of the mark).
 */
function loadAssets(): Promise<WeekReportAssets> {
  assetCache ??= Promise.all([
    Promise.all(Object.entries(FONT_MODULES).map(async ([key, module]) => [key, await readBase64(module)] as const)),
    readBase64(LOGO_MODULE),
  ]).then(([fonts, logo]) => ({ fonts: Object.fromEntries(fonts) as WeekReportFonts, logo }));
  return assetCache;
}

/** Export the week as a designed PDF and hand it to the device's share sheet. */
export async function shareWeekReportPdf(report: WeekReport): Promise<void> {
  if (Platform.OS === 'web') throw new Error('PDF file sharing requires the mobile app.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const [Print, assets] = await Promise.all([import('expo-print'), loadAssets()]);
  const { uri } = await Print.printToFileAsync({
    html: weekReportHtml(report, assets),
    width: WEEK_REPORT_PAGE.width,
    height: WEEK_REPORT_PAGE.height,
    // Full bleed: the document paints its own pages, padding and background.
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  const generated = new File(uri);
  const document = new File(Paths.cache, weekReportFilename(report));
  if (document.exists) document.delete();
  generated.move(document);
  await Sharing.shareAsync(document.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Week of ${report.title}`,
  });
}
