import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import * as Haptics from '@/services/haptics';
import { Check, Copy, FileText } from 'lucide-react-native';
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
import { StackFrameCard, type StackFrameExercise } from '@/components/StackFrameCard';

const CAPTURE_OPTIONS = {
  width: 1080,
  height: 1920,
  quality: 1,
  format: 'png',
  result: 'tmpfile',
} as const;

type Feedback = 'idle' | 'copied' | 'copyError';

interface ShareSheetProps extends StatStripCardProps {
  workoutId?: string;
  visible: boolean;
  onClose: () => void;
  /** Every lift's total weight moved; the Lift Log design is offered when it has a line. */
  liftLog?: LiftLog;
  /** Every performed lift; the Frame story overlay is offered when there is at least one. */
  frameExercises?: StackFrameExercise[];
  /** Sends the full set-by-set report as a PDF through the system share sheet. */
  onSharePdf?: () => Promise<void>;
}

type Design = 'strip' | 'liftLog' | 'frame';
const DESIGN_NAMES: Record<Design, string> = { strip: 'Stat Strip', liftLog: 'Lift Log', frame: 'Frame' };

export function ShareSheet(props: ShareSheetProps) {
  // A new workout, unit or rendered value gets a fresh sheet and capture lifecycle.
  // Function props are intentionally excluded from this render identity.
  const { visible, onClose, onSharePdf, ...content } = props;
  return <ShareSheetContent key={JSON.stringify(content)} {...content}
    visible={visible} onClose={onClose} onSharePdf={onSharePdf} />;
}

function ShareSheetContent({
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
  exerciseCount,
  durationLabel,
  recordCount,
  liftLog,
  frameExercises,
  onSharePdf,
}: ShareSheetProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [isCopying, setIsCopying] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [captureReady, setCaptureReady] = useState(false);
  const progress = useSharedValue(visible ? 1 : 0);
  const stripRef = useRef<View>(null);
  const liftLogRef = useRef<View>(null);
  const frameRef = useRef<View>(null);
  const pagerRef = useRef<ScrollView>(null);
  const captureEpochRef = useRef(0);
  const activeCopyRef = useRef<object | null>(null);
  const [isPaging, setIsPaging] = useState(false);
  const [page, setPage] = useState(0);
  const designs: Design[] = [
    'strip',
    ...(liftLog && liftLog.lines.length > 0 ? ['liftLog' as const] : []),
    ...(frameExercises && frameExercises.length > 0 ? ['frame' as const] : []),
  ];
  const designCount = designs.length;
  const selectedDesign = designs[page];
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    // Invalidates work still awaiting a native capture or file read when closed/reopened.
    captureEpochRef.current += 1;
    activeCopyRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset a copy operation when its sheet lifetime changes.
    setIsCopying(false);
    return () => {
      captureEpochRef.current += 1;
      activeCopyRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount the retained sheet before driving its native entrance animation.
      setIsMounted(true);
      setFeedback('idle');
      setPage(0);
      setIsPaging(false);
      pagerRef.current?.scrollTo({ x: 0, animated: false });
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

  const handleCopy = useCallback(async () => {
    if (activeCopyRef.current || !visible || !captureReady || isPaging) return;

    const operation = {};
    const epoch = captureEpochRef.current;
    const isCurrent = () => captureEpochRef.current === epoch && activeCopyRef.current === operation;
    activeCopyRef.current = operation;
    setIsCopying(true);
    try {
      const design = selectedDesign;
      const target = design === 'liftLog' ? liftLogRef.current
        : design === 'frame' ? frameRef.current : design === 'strip' ? stripRef.current : null;
      if (!target) throw new Error('The share card is not ready to capture.');
      // Capture only the selected, visible card on this tap. No stale/offscreen PNG reuse.
      const uri = await captureRef(target, CAPTURE_OPTIONS);
      if (!isCurrent()) return;
      const base64Image = await new File(uri).base64();
      if (!isCurrent()) return;
      await Clipboard.setImageAsync(base64Image);
      if (!isCurrent()) return;
      if (Platform.OS !== 'web' && !(await Clipboard.hasImageAsync())) {
        if (!isCurrent()) return;
        // Some devices occasionally do not commit a large image on the first
        // write. Retry once inside the same tap and verify the result.
        await Clipboard.setImageAsync(base64Image);
        if (!(await Clipboard.hasImageAsync())) {
          throw new Error('The clipboard did not accept the image.');
        }
      }
      if (!isCurrent()) return;
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showFeedback('copied');
    } catch {
      if (!isCurrent()) return;
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showFeedback('copyError');
    } finally {
      if (isCurrent()) {
        activeCopyRef.current = null;
        setIsCopying(false);
      }
    }
  }, [captureReady, isPaging, selectedDesign, showFeedback, visible]);

  const handleSharePdf = useCallback(async () => {
    if (!onSharePdf || isSharingPdf) return;
    setIsSharingPdf(true);
    setPdfError(false);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    try {
      await onSharePdf();
    } catch {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setPdfError(true);
    } finally {
      setIsSharingPdf(false);
    }
  }, [isSharingPdf, onSharePdf]);

  if (!isMounted) return null;

  const previewHeight = Math.min(390, Math.max(276, screenHeight * 0.43));
  const previewWidth = previewHeight * (STAT_STRIP_WIDTH / STAT_STRIP_HEIGHT);
  const previewScale = previewWidth / STAT_STRIP_WIDTH;
  // Each page is the sheet's full inner width, so a swipe moves one whole design.
  const pageWidth = screenWidth - 48;
  const designName = DESIGN_NAMES[designs[page] ?? 'strip'];
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
            ref={pagerRef}
            horizontal
            pagingEnabled
            scrollEnabled={designCount > 1 && !isCopying}
            removeClippedSubviews={false}
            showsHorizontalScrollIndicator={false}
            style={{ width: pageWidth, alignSelf: 'center' }}
            onScrollBeginDrag={() => setIsPaging(true)}
            onScrollEndDrag={(event) => {
              const offset = event.nativeEvent.contentOffset.x;
              if (Math.abs(offset - Math.round(offset / pageWidth) * pageWidth) < 1) setIsPaging(false);
            }}
            onMomentumScrollEnd={(event) => {
              setIsPaging(false);
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
                    {...(exerciseCount ? { exerciseCount } : {})}
                    {...(durationLabel ? { durationLabel } : {})}
                    {...(recordCount ? { recordCount } : {})}
                  />
                </View>
              </View>
            </View>
            {designs.includes('liftLog') && liftLog ? (
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
            {designs.includes('frame') && frameExercises ? (
              <View
                accessible
                accessibilityLabel="Frame design"
                style={[styles.page, { width: pageWidth }]}
              >
                <View style={[styles.previewFrame, { width: previewWidth, height: previewHeight }]}>
                  {/* Preview only, outside the capture target: where the story photo will sit. */}
                  <View pointerEvents="none" style={styles.photoHint}>
                    <Text allowFontScaling={false} style={styles.photoHintText}>YOUR PHOTO</Text>
                  </View>
                  <View
                    pointerEvents="none"
                    style={[styles.previewScale, { transform: [{ scale: previewScale }] }]}
                  >
                    <StackFrameCard
                      ref={frameRef}
                      title={title}
                      date={date}
                      volumeValue={volumeValue}
                      volumeUnit={volumeUnit}
                      setCount={setCount}
                      repCount={repCount}
                      exercises={frameExercises}
                      {...(recordCount ? { recordCount } : {})}
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
              {designs.map((design, index) => (
                <View
                  key={design}
                  style={[
                    styles.pagerDot,
                    index === page && [styles.pagerDotActive, { backgroundColor: accent }],
                  ]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <View style={styles.copyAction}>
              <Pressable
                cssInterop={false}
                accessibilityRole="button"
                accessibilityLabel={feedback === 'copied'
                  ? `${designName} copied to clipboard`
                  : `Copy ${designName} image to clipboard`}
                accessibilityState={{ disabled: isCopying || !captureReady || isPaging || !visible }}
                disabled={isCopying || !captureReady || isPaging || !visible}
                onPress={() => void handleCopy()}
                style={({ pressed }) => [
                  styles.copyButton,
                  feedback === 'copied' && {
                    borderColor: accent,
                  },
                  pressed && styles.buttonPressed,
                  (isCopying || !captureReady || isPaging) && styles.buttonDisabled,
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
            {onSharePdf ? (
              <View style={styles.copyAction}>
                <Pressable
                  cssInterop={false}
                  accessibilityRole="button"
                  accessibilityLabel="Share full workout report as PDF"
                  accessibilityHint="Opens the share sheet with every set as a PDF document"
                  accessibilityState={{ disabled: isSharingPdf, busy: isSharingPdf }}
                  disabled={isSharingPdf}
                  onPress={() => void handleSharePdf()}
                  style={({ pressed }) => [
                    styles.copyButton,
                    pressed && styles.buttonPressed,
                    isSharingPdf && styles.buttonDisabled,
                  ]}
                >
                  {isSharingPdf ? (
                    <ActivityIndicator color={redesignColors.bone} size="small" />
                  ) : (
                    <FileText color={redesignColors.bone} size={21} strokeWidth={2.2} />
                  )}
                </Pressable>
                <Text allowFontScaling={false} style={styles.copyLabel}>
                  {isSharingPdf ? 'Preparing…' : pdfError ? 'Try again' : 'Share PDF'}
                </Text>
              </View>
            ) : null}
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
  photoHint: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1916',
  },
  photoHintText: {
    fontFamily: redesignFonts.mono,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.8,
    color: redesignColors.ashDim,
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  copyAction: {
    minWidth: 64,
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
