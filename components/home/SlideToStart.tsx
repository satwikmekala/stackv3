import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, TouchableOpacity, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/services/haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation, Easing, Extrapolation, interpolate, ReduceMotion, runOnJS,
  useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { WorkoutBolt } from '@/components/WorkoutBolt';
import { HomeDeparture } from './HomeDeparture';
import { shouldCommitSlide } from '@/features/home/slideCommit';
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';

const THUMB = 56;
const INSET = 7;
const TRACK = THUMB + INSET * 2;
const SETTLE = { duration: 140, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
const RETURN = { damping: 26, stiffness: 280, mass: 0.75, reduceMotion: ReduceMotion.System };

export function SlideToStart({ color, workoutName, onStart, hidden = false }: {
  color: string; workoutName: string; onStart: (origin?: WorkoutLaunchOrigin) => void; hidden?: boolean;
}) {
  const departure = useContext(HomeDeparture);
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [screenReader, setScreenReader] = useState(false);
  const thumbRef = useRef<View>(null);
  const committing = useRef(false);
  const focused = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const ready = useSharedValue(false);
  const readiness = useSharedValue(0);
  const pressed = useSharedValue(0);
  const launching = useSharedValue(0);
  const locked = useSharedValue(false);
  const travel = Math.max(0, width - THUMB - INSET * 2);

  useAnimatedReaction(() => offset.get() / Math.max(1, travel), value => {
    departure?.set(value);
  }, [departure, travel]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (mounted) setScreenReader(value); });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    committing.current = false;
    locked.set(false);
    ready.set(false);
    readiness.set(0);
    pressed.set(0);
    launching.set(0);
    offset.set(0);
    return () => {
      focused.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      locked.set(true);
      cancelAnimation(offset);
      cancelAnimation(readiness);
      cancelAnimation(pressed);
      cancelAnimation(launching);
      // Keep the handle at its destination underneath the workout reveal.
      // Returning Home resets it in the focus callback above.
    };
  }, [launching, locked, offset, pressed, readiness, ready]));

  const thresholdFeedback = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };
  const commit = () => {
    if (hidden || !focused.current || committing.current) return;
    committing.current = true;
    locked.set(true);
    const finish = (origin?: WorkoutLaunchOrigin) => {
      if (!focused.current) return;
      // Rejected starts remain retryable. Successful navigation cancels this
      // fallback on blur, leaving the launch circle at the end of the rail.
      retryTimer.current = setTimeout(() => {
        if (!focused.current) return;
        committing.current = false;
        locked.set(false);
        ready.set(false);
        readiness.set(withTiming(0, SETTLE));
        launching.set(withTiming(0, SETTLE));
        offset.set(withSpring(0, RETURN));
      }, 1000);
      onStart(origin);
    };
    if (!thumbRef.current || screenReader) { finish(); return; }
    thumbRef.current.measureInWindow((x, y, w, h) => finish(w > 0 && h > 0
      ? { x: x + w / 2, y: y + h / 2, size: w, color } : undefined));
  };
  const pan = Gesture.Pan().enabled(!hidden && travel > 0).activeOffsetX([-3, 3]).failOffsetY([-12, 12]).shouldCancelWhenOutside(false)
    .onBegin(() => {
      if (locked.get()) return;
      cancelAnimation(offset);
      startOffset.set(offset.get());
      pressed.set(withTiming(1, SETTLE));
    })
    .onUpdate(event => {
      if (locked.get()) return;
      offset.set(Math.max(0, Math.min(travel, startOffset.get() + event.translationX)));
      const nextReady = shouldCommitSlide(offset.get(), travel, event.translationY, true);
      if (nextReady !== ready.get()) {
        ready.set(nextReady);
        readiness.set(withTiming(nextReady ? 1 : 0, SETTLE));
        if (nextReady) runOnJS(thresholdFeedback)();
      }
    })
    // eslint-disable-next-line react-hooks/refs -- Gesture callbacks execute on interaction, not during render.
    .onEnd((event, success) => {
      if (locked.get()) return;
      if (shouldCommitSlide(offset.get(), travel, event.translationY, success)) {
        locked.set(true);
        pressed.set(withTiming(0, SETTLE));
        launching.set(withTiming(1, SETTLE));
        // Settle the final few points before measuring the launch origin.
        offset.set(withTiming(travel, SETTLE, finished => {
          if (finished) runOnJS(commit)();
        }));
      }
    })
    .onFinalize(() => {
      if (locked.get()) return;
      ready.set(false);
      pressed.set(withTiming(0, SETTLE));
      readiness.set(withTiming(0, SETTLE));
      offset.set(withSpring(0, RETURN));
    });

  const trackStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(245, 240, 232, ${0.08 + pressed.get() * 0.04 + readiness.get() * 0.06})`,
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }, { scale: 1 + (reduceMotion ? 0 : pressed.get() * 0.035) }],
    shadowOpacity: 0.2 + pressed.get() * 0.12 + readiness.get() * 0.16,
    shadowRadius: 8 + readiness.get() * 6,
  }));
  const fillStyle = useAnimatedStyle(() => ({
    // A fixed-size fill slides inside the clip instead of relaying out per frame.
    transform: [{ translateX: offset.get() - travel }],
    opacity: interpolate(offset.get(), [0, Math.max(1, travel)], [0, 0.18], Extrapolation.CLAMP) * (1 - launching.get()),
  }));
  const railStyle = useAnimatedStyle(() => ({
    opacity: 1 - launching.get(),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get() / Math.max(1, travel), [0, 0.12, 0.52], [1, 0.9, 0], Extrapolation.CLAMP),
    transform: [{ translateX: reduceMotion ? 0 : Math.min(offset.get() * 0.12, 14) }],
  }));
  const releaseStyle = useAnimatedStyle(() => ({
    opacity: readiness.get() * (1 - launching.get()),
    transform: [{ translateX: reduceMotion ? 0 : (1 - readiness.get()) * -6 }],
  }));
  const targetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get() / Math.max(1, travel), [0, 0.65, 0.9], [0.5, 0.5, 0], Extrapolation.CLAMP),
  }));

  if (screenReader || fontScale > 1.5 || Platform.OS === 'web') return <TouchableOpacity key={`alternative:${fontScale}`} activeOpacity={0.8} accessibilityRole="button"
    accessibilityLabel={`Start workout, ${workoutName}`} onPress={commit} disabled={hidden}
    style={[styles.alternative, { backgroundColor: color }, hidden && styles.hidden]}>
    {fontScale <= 2 && <WorkoutBolt width={18} height={24} />}<Text style={styles.alternativeText}>Start workout</Text>{fontScale <= 2 && <ArrowRight color={c.ink} size={20} />}
  </TouchableOpacity>;

  return <Animated.View accessible={!hidden} accessibilityRole="button" accessibilityLabel={`Start workout, ${workoutName}`}
    accessibilityHint="Slide the handle to the end and release, or activate to start."
    accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    accessibilityActions={[{ name: 'activate', label: 'Start workout' }]}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') commit(); }}
    onAccessibilityTap={commit} onLayout={event => setWidth(event.nativeEvent.layout.width)}
    pointerEvents={hidden ? 'none' : 'auto'} style={[styles.track, hidden && styles.hidden]} testID="slide-to-start">
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rail, trackStyle, railStyle]} />
    <Animated.View pointerEvents="none" style={[styles.fill, { width: THUMB + travel, backgroundColor: color }, fillStyle]} />
    <Animated.View pointerEvents="none" style={[styles.label, labelStyle]}>
      <Text style={styles.labelText}>Slide to start</Text>
    </Animated.View>
    <Animated.View pointerEvents="none" style={[styles.release, releaseStyle]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.releaseText}>Time to stack up</Text>
    </Animated.View>
    <Animated.View pointerEvents="none" style={[styles.target, targetStyle]}>
      <ArrowRight color={c.bone} size={18} strokeWidth={1.8} />
    </Animated.View>
    <GestureDetector gesture={pan}>
      <Animated.View ref={thumbRef} collapsable={false} style={[styles.thumb, { backgroundColor: color, shadowColor: color }, thumbStyle]}>
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
          style={[StyleSheet.absoluteFill, styles.thumbSheen]} />
        <View pointerEvents="none" style={styles.symbol}><WorkoutBolt width={22} height={27.5} /></View>
      </Animated.View>
    </GestureDetector>
  </Animated.View>;
}

const styles = StyleSheet.create({
  track: { minHeight: TRACK, borderRadius: TRACK / 2, justifyContent: 'center', overflow: 'hidden' },
  rail: { borderRadius: TRACK / 2, borderWidth: 1, backgroundColor: '#100E0C' },
  symbol: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', left: INSET, top: INSET, bottom: INSET, borderRadius: THUMB / 2 },
  thumb: { position: 'absolute', left: INSET, top: '50%', marginTop: -THUMB / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 } },
  thumbSheen: { borderRadius: THUMB / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  label: { paddingVertical: 22, paddingLeft: THUMB + INSET + 10, paddingRight: THUMB + INSET,
    alignItems: 'center', justifyContent: 'center' },
  labelText: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 16, letterSpacing: 0.1 },
  release: { position: 'absolute', left: INSET + 8, right: THUMB + INSET + 14, alignItems: 'center' },
  releaseText: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 16, letterSpacing: 0.1 },
  target: { position: 'absolute', right: INSET + (THUMB - 20) / 2, top: '50%', marginTop: -10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center' },
  alternative: { minHeight: TRACK, paddingHorizontal: 22, paddingVertical: 16, borderRadius: TRACK / 2,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  alternativeText: { flexShrink: 1, textAlign: 'center', color: c.ink, fontFamily: f.uiBold, fontSize: 17 },
  hidden: { opacity: 0 },
});
