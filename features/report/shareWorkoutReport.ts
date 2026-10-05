import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { WorkoutReport } from '@/features/report/workoutReport';
import { workoutReportFilename, workoutReportHtml } from '@/features/report/workoutReportHtml';

/** Export a real document and hand it directly to the device's app picker. */
export async function shareWorkoutReportPdf(report: WorkoutReport): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('PDF file sharing requires the mobile app.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  // Defer loading the native printer until Share is tapped.
  const Print = await import('expo-print');
  const { uri } = await Print.printToFileAsync({
    html: workoutReportHtml(report),
    width: 595.28,
    height: 841.89,
    margins: { top: 32, bottom: 32, left: 32, right: 32 },
  });
  const generated = new File(uri);
  const document = new File(Paths.cache, workoutReportFilename(report));
  // The generated cache URI has a random name. Give the attachment a readable one.
  if (document.exists) document.delete();
  generated.move(document);
  // Keep the document in cache: Android recipients may read it after the picker closes.
  await Sharing.shareAsync(document.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `${report.title} - workout report`,
  });
}
