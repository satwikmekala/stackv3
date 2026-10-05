import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from '@/services/haptics';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { redesignColors, redesignFonts } from '@/constants/theme';
import type { WorkoutReport } from '@/features/report/workoutReport';
import { REPORT_WIDTH, WorkoutReportView } from '@/features/report/WorkoutReportView';
import { shareWorkoutReportPdf } from '@/features/report/shareWorkoutReport';

interface WorkoutReportSheetProps {
  visible: boolean;
  report: WorkoutReport;
  onClose: () => void;
}

type Status = 'idle' | 'sharing' | 'error';

/**
 * Optional in-app report preview. Sharing exports the complete record as a PDF.
 */
export function WorkoutReportSheet({ visible, report, onClose }: WorkoutReportSheetProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const sharingRef = useRef(false);
  const [status, setStatus] = useState<Status>('idle');

  const previewWidth = Math.min(REPORT_WIDTH, screenWidth - 32);
  const previewScale = previewWidth / REPORT_WIDTH;
  const [previewHeight, setPreviewHeight] = useState(0);

  const handleShare = useCallback(async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setStatus('sharing');
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    try {
      await shareWorkoutReportPdf(report);
      setStatus('idle');
    } catch {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setStatus('error');
    } finally {
      sharingRef.current = false;
    }
  }, [report]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.topBar}>
          <Text allowFontScaling={false} style={styles.eyebrow}>WORKOUT REPORT</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close workout report"
            hitSlop={10}
            onPress={onClose}
            style={styles.close}
          >
            <X color={redesignColors.ash} size={18} strokeWidth={2.4} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* The document exporter uses the same report data as this preview. */}
          <View style={[styles.previewFrame, { width: previewWidth, height: previewHeight * previewScale || undefined }]}>
            <View
              style={{ transform: [{ scale: previewScale }], transformOrigin: 'top left' }}
              onLayout={(event) => setPreviewHeight(event.nativeEvent.layout.height)}
            >
              <WorkoutReportView report={report} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {status === 'error' ? (
            <Text allowFontScaling={false} style={styles.error}>Couldn’t share the report. Try again.</Text>
          ) : null}
          <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel="Share workout report"
            disabled={status === 'sharing'}
            onPress={handleShare}
            style={({ pressed }) => [styles.shareButton, { backgroundColor: report.accent }, pressed && styles.pressed]}
          >
            {status === 'sharing' ? (
              <ActivityIndicator color={redesignColors.ink} />
            ) : (
              <Text allowFontScaling={false} style={styles.shareText}>Share PDF</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: redesignColors.ink,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  eyebrow: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.raised,
  },
  scroll: {
    alignItems: 'center',
    paddingTop: 4,
  },
  previewFrame: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: redesignColors.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: redesignColors.border,
  },
  error: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  shareButton: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    color: redesignColors.ink,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.86,
  },
});
