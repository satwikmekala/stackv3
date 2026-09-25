import { useCallback, useEffect, useRef, useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Check, Copy } from 'lucide-react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { LiftLogCard } from '@/components/LiftLogCard';
import {
  STAT_STRIP_HEIGHT,
  STAT_STRIP_WIDTH,
  StatStripCard,
  type StatStripCardProps,
} from '@/components/StatStripCard';
import { withMotionTiming } from '@/constants/motion';
import { redesignColors, redesignFonts } from '@/constants/theme';
import type { LiftLog } from '@/store/liftLog';

const CAPTURE_OPTIONS = {
  width: 1080,
  height: 1920,
  quality: 1,
  format: 'png',
  result: 'tmpfile',
} as const;

type Feedback = 'idle' | 'copied' | 'copyError';

interface ShareSheetProps extends StatStripCardProps {
  visible: boolean;
  onClose: () => void;
  /** Every lift's top set; the Lift Log design is offered when it has a line. */
  liftLog?: LiftLog;
}

const DESIGN_NAMES = ['Stat Strip', 'Lift Log'] as const;

export function ShareSheet({
  visible,
  onClose,
  accent,
  title,
  date,
  volumeValue,
  volumeUnit,
  setCount,
  repCount,
  specialSetLabel,
  liftLog,
}: ShareSheetProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [isCopying, setIsCopying] = useState(false);
  const [captureReady, setCaptureReady] = useState(false);
  const progress = useSharedValue(visible ? 1 : 0);
  const stripRef = useRef<View>(null);
  const liftLogRef = useRef<View>(null);
  // One capture per design, each warmed once and reused for every copy.
  const capturedUrisRef = useRef<(string | null)[]>([null, null]);
  const capturePromisesRef = useRef<(Promise<string> | null)[]>([null, null]);
  const [page, setPage] = useState(0);
  const designCount = liftLog && liftLog.lines.length > 0 ? 2 : 1;
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      setFeedback('idle');
      setPage(0);
      // Re-capture on every opening, so a copy always matches what the sheet shows.
      capturedUrisRef.current = [null, null];
      setCaptureReady(false);
      progress.value = withMotionTiming(
        1,
        undefined,
        (finished) => {
          'worklet';
          if (finished) runOnJS(setCaptureReady)(true);
        }
      );
      return;
    }

    if (isMounted) {
      setCaptureReady(false);
      progress.value = withMotionTiming(
        0,
        { easing: 'accelerate' },
        (finished) => {
          'worklet';
          if (finished) runOnJS(setIsMounted)(false);
        }
      );
    }
  }, [isMounted, progress, visible]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * screenHeight }],
  }));

  const showFeedback = useCallback((nextFeedback: Feedback) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(nextFeedback);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback('idle');
      feedbackTimerRef.current = null;
    }, 1800);
  }, []);

  const getCapturedUri = useCallback(async (index: number) => {
    const cached = capturedUrisRef.current[index];
    if (cached) return cached;
    const pending = capturePromisesRef.current[index];
    if (pending) return pending;
    const target = index === 1 ? liftLogRef.current : stripRef.current;
    if (!target) throw new Error('The share card is not ready to capture.');

    const capturePromise = captureRef(target, CAPTURE_OPTIONS);
    capturePromisesRef.current[index] = capturePromise;

    try {
      const uri = await capturePromise;
      capturedUrisRef.current[index] = uri;
      return uri;
    } finally {
      capturePromisesRef.current[index] = null;
    }
  }, []);

  useEffect(() => {
    if (!visible || !captureReady) return;

    // Warm the captures after the sheet settles, so the first user tap only has
    // to write the finished PNG to the clipboard.
    for (let index = 0; index < designCount; index += 1) {
      if (capturedUrisRef.current[index]) continue;
      void getCapturedUri(index).catch(() => {
        capturedUrisRef.current[index] = null;
      });
    }
  }, [captureReady, designCount, getCapturedUri, visible]);

  const handleCopy = useCallback(async () => {
    if (isCopying) return;

    setIsCopying(true);
    try {
      const uri = await getCapturedUri(page);
      const base64Image = await new File(uri).base64();
      await Clipboard.setImageAsync(base64Image);
      if (Platform.OS !== 'web' && !(await Clipboard.hasImageAsync())) {
        // Some devices occasionally do not commit a large image on the first
        // write. Retry once inside the same tap and verify the result.
        await Clipboard.setImageAsync(base64Image);
        if (!(await Clipboard.hasImageAsync())) {
          throw new Error('The clipboard did not accept the image.');
        }
      }
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showFeedback('copied');
    } catch {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showFeedback('copyError');
    } finally {
      setIsCopying(false);
    }
  }, [getCapturedUri, isCopying, page, showFeedback]);

  if (!isMounted) return null;

  const previewHeight = Math.min(390, Math.max(276, screenHeight * 0.43));
  const previewWidth = previewHeight * (STAT_STRIP_WIDTH / STAT_STRIP_HEIGHT);
  const previewScale = previewWidth / STAT_STRIP_WIDTH;
  // Each page is the sheet's full inner width, so a swipe moves one whole design.
  const pageWidth = screenWidth - 48;
  const designName = DESIGN_NAMES[page];
  const copyLabel = isCopying
    ? 'Copying…'
    : feedback === 'copied'
      ? 'Copied'
      : feedback === 'copyError'
        ? 'Try again'
        : 'Copy';

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.backdrop, backdropStyle]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close share sheet"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 18) },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />
          <Text allowFontScaling={false} style={styles.eyebrow}>SHARE WORKOUT</Text>

          <ScrollView
            horizontal
            pagingEnabled
            scrollEnabled={designCount > 1}
            showsHorizontalScrollIndicator={false}
            style={{ width: pageWidth, alignSelf: 'center' }}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
              if (next !== page && next >= 0 && next < designCount) {
                setPage(next);
                setFeedback('idle');
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
              }
            }}
          >
            <View
              accessible
              accessibilityLabel="Stat Strip design"
              style={[styles.page, { width: pageWidth }]}
            >
              <View style={[styles.previewFrame, { width: previewWidth, height: previewHeight }]}>
                <View
                  pointerEvents="none"
                  style={[styles.previewScale, { transform: [{ scale: previewScale }] }]}
                >
                  <StatStripCard
                    ref={stripRef}
                    accent={accent}
                    title={title}
                    date={date}
                    volumeValue={volumeValue}
                    volumeUnit={volumeUnit}
                    setCount={setCount}
                    repCount={repCount}
                    {...(specialSetLabel ? { specialSetLabel } : {})}
                  />
                </View>
              </View>
            </View>
            {designCount > 1 && liftLog ? (
              <View
                accessible
                accessibilityLabel="Lift Log design"
                style={[styles.page, { width: pageWidth }]}
              >
                <View style={[styles.previewFrame, { width: previewWidth, height: previewHeight }]}>
                  <View
                    pointerEvents="none"
                    style={[styles.previewScale, { transform: [{ scale: previewScale }] }]}
                  >
                    <LiftLogCard
                      ref={liftLogRef}
                      accent={accent}
                      title={title}
                      date={date}
                      lines={liftLog.lines}
                      more={liftLog.more}
                      volumeValue={volumeValue}
                      volumeUnit={volumeUnit}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {designCount > 1 ? (
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${designName} design, ${page + 1} of ${designCount}. Swipe to change.`}
              style={styles.pager}
            >
              {DESIGN_NAMES.slice(0, designCount).map((name, index) => (
                <View
                  key={name}
                  style={[
                    styles.pagerDot,
                    index === page && [styles.pagerDotActive, { backgroundColor: accent }],
                  ]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.copyAction}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={feedback === 'copied'
                ? `${designName} copied to clipboard`
                : `Copy ${designName} image to clipboard`}
              accessibilityState={{ disabled: isCopying || !captureReady }}
              disabled={isCopying || !captureReady}
              onPress={() => void handleCopy()}
              style={({ pressed }) => [
                styles.copyButton,
                feedback === 'copied' && {
                  borderColor: accent,
                },
                pressed && styles.buttonPressed,
                (isCopying || !captureReady) && styles.buttonDisabled,
              ]}
            >
              {isCopying ? (
                <ActivityIndicator color={redesignColors.bone} size="small" />
              ) : feedback === 'copied' ? (
                <Check color={accent} size={23} strokeWidth={3} />
              ) : (
                <Copy color={redesignColors.bone} size={21} strokeWidth={2.2} />
              )}
            </Pressable>
            <Text
              allowFontScaling={false}
              style={[
                styles.copyLabel,
                feedback === 'copied' && { color: accent },
              ]}
            >
              {copyLabel}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
  },
  handle: {
    width: 38,
    height: 4,
    marginBottom: 18,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: redesignColors.hi,
  },
  eyebrow: {
    marginBottom: 14,
    textAlign: 'center',
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.8,
    color: redesignColors.ash,
  },
  page: {
    alignItems: 'center',
  },
  pager: {
    marginTop: 14,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: redesignColors.hi,
  },
  pagerDotActive: {
    width: 18,
  },
  previewFrame: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: redesignColors.ink,
  },
  previewScale: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: STAT_STRIP_WIDTH,
    height: STAT_STRIP_HEIGHT,
    transformOrigin: 'top left',
  },
  copyAction: {
    marginTop: 16,
    alignItems: 'center',
  },
  copyButton: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderColor: redesignColors.border,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.ink,
  },
  copyLabel: {
    minHeight: 20,
    marginTop: 7,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: redesignColors.ash,
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.58,
  },
});
