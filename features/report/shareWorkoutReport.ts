import type { View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { REPORT_WIDTH } from '@/features/report/WorkoutReportView';

/** 1080 px wide, matching the social cards' export width; height follows the content. */
export const REPORT_EXPORT_WIDTH = 1080;

/**
 * Captures a laid-out report at a fixed 3× width. The report's height varies
 * with the workout, so it is passed from the view's own layout rather than
 * forced into a story-shaped canvas.
 */
export async function captureWorkoutReport(target: View, layoutHeight: number): Promise<string> {
  const scale = REPORT_EXPORT_WIDTH / REPORT_WIDTH;
  return captureRef(target, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: REPORT_EXPORT_WIDTH,
    height: Math.round(layoutHeight * scale),
  });
}

/** Hands a captured report to the native share sheet (Messages, Mail, Files, …). */
export async function shareWorkoutReportImage(uri: string, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: title,
  });
}
