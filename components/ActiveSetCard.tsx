import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Minus, Play, Plus, RotateCcw, Square } from 'lucide-react-native';
import * as Haptics from '@/services/haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import { weightUnitEnter, weightUnitExit, workoutMotion, workoutTiming } from '@/constants/workoutMotion';
import { WORKOUT_REPS_PICKER_WIDTH, WORKOUT_SCREEN_HORIZONTAL_PADDING, WORKOUT_WEIGHT_PICKER_WIDTH } from '@/constants/workoutPicker';
import { StatusPill } from '@/components/StatusPill';
import { WorkoutWeightPicker } from '@/components/WorkoutWeightPicker';
import { WorkoutRepsPicker } from '@/components/WorkoutRepsPicker';
import { WorkoutLogAction } from '@/components/WorkoutLogAction';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';
import { useExerciseTimer } from '@/hooks/useExerciseTimer';
import { clearExerciseTimer, resetExerciseTimer, startExerciseTimer, stopExerciseTimer } from '@/store/exerciseTimer';
import type { WorkoutSetEditTarget } from '@/store/workoutSetActions';
import type { ExerciseLoadType, ExerciseMetric } from '@/store/workoutStore';
import { formatWeight, lbsToKg, unitLabel, type WeightUnit } from '@/store/weightUnits';
import { DURATION_MIN_S, DURATION_STEP_S, formatDuration, parseDurationInput } from '@/store/exerciseMeasurement';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const INPUT_PADDING = 16;
const UNIT_BUTTON_WIDTH = 52;

interface RollingValueProps {
  value: number;
  // Rendered text; falls back to the raw value when no unit conversion applies.
  label?: string;
  color?: string;
  inputLabel: string;
  // 'duration' accepts plain seconds ("90") or m:ss ("1:30").
  inputMode: 'decimal' | 'integer' | 'duration';
  minimum: number;
  onCommit: (value: number) => void;
}

function RollingValue({
  value,
  label,
  color = redesignColors.bone,
  inputLabel,
  inputMode,
  minimum,
  onCommit,
}: RollingValueProps) {
  const previousValue = useRef(value);
  const manualCommit = useRef(false);
  const editingCommit = useRef(onCommit);
  const editingLabel = useRef(label ?? String(value));
  const reducedMotion = useReducedMotion();
  const finishingRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number }>();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const valueLabel = label ?? String(value);
  const isCompactValue = valueLabel.length >= 4;

  useEffect(() => {
    if (value === previousValue.current) {
      manualCommit.current = false;
      return;
    }

    const direction = value > previousValue.current ? 1 : -1;
    previousValue.current = value;
    cancelAnimation(translateY);
    cancelAnimation(opacity);
    if (manualCommit.current || isEditing || reducedMotion) {
      manualCommit.current = false;
      translateY.value = 0;
      opacity.value = 1;
      return;
    }
    translateY.value = direction * workoutMotion.numberTravel;
    opacity.value = 0;
    translateY.value = withTiming(0, workoutTiming(workoutMotion.number));
    opacity.value = withTiming(1, workoutTiming(workoutMotion.number));
  }, [isEditing, opacity, reducedMotion, translateY, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const beginEditing = () => {
    editingCommit.current = onCommit;
    editingLabel.current = valueLabel;
    finishingRef.current = false;
    cancelAnimation(translateY);
    cancelAnimation(opacity);
    translateY.set(0);
    opacity.set(1);
    manualCommit.current = false;
    setDraft(valueLabel);
    setSelection({ start: 0, end: valueLabel.length });
    setIsEditing(true);
  };

  const handleDraftChange = (text: string) => {
    setSelection(undefined);
    setDraft(text);
  };

  const finishEditing = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    const normalizedDraft = inputMode === 'duration' ? draft.trim() : draft.trim().replace(',', '.');
    const parsedDuration = inputMode === 'duration' ? parseDurationInput(normalizedDraft) : null;
    const matchesFormat = inputMode === 'duration'
      ? parsedDuration !== null
      : inputMode === 'integer'
        ? /^\d+$/.test(normalizedDraft)
        : /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalizedDraft);
    const parsedValue = inputMode === 'duration' ? parsedDuration ?? NaN : Number(normalizedDraft);

    if (
      matchesFormat
      && Number.isFinite(parsedValue)
      && parsedValue >= minimum
      && (inputMode === 'decimal' || Number.isInteger(parsedValue))
      && (inputMode !== 'duration' || parsedValue !== value)
      && normalizedDraft !== editingLabel.current.trim().replace(',', '.')
    ) {
      manualCommit.current = true;
      editingCommit.current(parsedValue);
    }

    Keyboard.dismiss();
    setIsEditing(false);
  };

  const fontSize = isCompactValue ? 29 : 32;
  const valueWidth = isCompactValue
    ? Math.max(66, Math.ceil(valueLabel.length * fontSize * 0.6))
    : 52;
  const valueStyle = {
    width: valueWidth,
    height: 38,
    padding: 0,
    textAlign: 'center' as const,
    fontFamily: redesignFonts.monoBold,
    fontSize,
    lineHeight: 38,
    color,
  };

  return (
    <>
      {isEditing ? (
        <TextInput
          autoFocus
          accessibilityLabel={`Edit ${inputLabel}`}
          allowFontScaling={false}
          value={draft}
          selection={selection}
          onChangeText={handleDraftChange}
          onFocus={() => setSelection({ start: 0, end: valueLabel.length })}
          onBlur={finishEditing}
          onSubmitEditing={finishEditing}
          selectTextOnFocus
          keyboardType={inputMode === 'decimal' ? 'decimal-pad' : inputMode === 'duration' ? 'numbers-and-punctuation' : 'number-pad'}
          keyboardAppearance="dark"
          inputMode={inputMode === 'decimal' ? 'decimal' : inputMode === 'duration' ? 'text' : 'numeric'}
          returnKeyType="done"
          inputAccessoryViewButtonLabel="Done"
          style={valueStyle}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${inputLabel}, current value ${valueLabel}`}
          hitSlop={6}
          onPress={beginEditing}
        >
          <Animated.Text
            allowFontScaling={false}
            style={[valueStyle, animatedStyle]}
          >
            {valueLabel}
          </Animated.Text>
        </Pressable>
      )}
    </>
  );
}

interface StepperProps {
  valueIdentity?: string;
  value: number;
  // Display text for `value`; the raw number is still used for the roll direction.
  displayValue?: string;
  step: number;
  unit: string;
  inputLabel: string;
  inputMode: 'decimal' | 'integer' | 'duration';
  minimum: number;
  accent?: string;
  onChange: (delta: number) => void;
  onCommit: (value: number) => void;
}

function Stepper({
  valueIdentity,
  value,
  displayValue,
  step,
  unit,
  inputLabel,
  inputMode,
  minimum,
  accent,
  onChange,
  onCommit,
}: StepperProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <WorkoutTouchable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${unit}`}
          onPress={() => onChange(-step)}
          hitSlop={8}
          activeOpacity={0.7}
          style={{
            width: 30,
            height: 42,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Minus color={redesignColors.bone} size={18} strokeWidth={2.6} />
        </WorkoutTouchable>

        <RollingValue
          key={valueIdentity}
          value={value}
          label={displayValue}
          color={accent}
          inputLabel={inputLabel}
          inputMode={inputMode}
          minimum={minimum}
          onCommit={onCommit}
        />

        <WorkoutTouchable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${unit}`}
          onPress={() => onChange(step)}
          hitSlop={8}
          activeOpacity={0.7}
          style={{
            width: 30,
            height: 42,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus color={redesignColors.bone} size={18} strokeWidth={2.6} />
        </WorkoutTouchable>
      </View>
      <Text
        style={{
          marginTop: 2,
          fontFamily: redesignFonts.uiSemiBold,
          fontSize: 13,
          color: redesignColors.ash,
        }}
        allowFontScaling={false}
      >
        {unit}
      </Text>
    </View>
  );
}

interface ActiveSetCardProps {
  valueIdentity?: string;
  setNumber?: number;
  heading?: string;
  badgeLabel?: string;
  // Replaces the badge beside `heading`, e.g. a set-type toggle.
  headingAccessory?: React.ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  reps: number;
  weight: number;
  loadType: ExerciseLoadType;
  // Rendering follows loadType + metric: WEIGHT and/or REPS or TIME.
  metric?: ExerciseMetric;
  // Canonical seconds; duration-metric exercises only.
  durationS?: number;
  // Only an unfinished, identified set can be timed. Historical edits stay manual.
  timerTarget?: WorkoutSetEditTarget | null;
  weightDeltaLabel?: string | null;
  repsDeltaLabel?: string | null;
  // Kept for callers shared with legacy set controls. Wheels use whole numbers and tenths.
  weightIncrement: number;
  // Display/input unit. `weight` is always kg, and so is every onWeightChange delta.
  weightUnit?: WeightUnit;
  onWeightUnitChange?: (weightUnit: WeightUnit) => void;
  accent: string;
  onRepsChange: (delta: number) => void;
  onWeightChange: (delta: number) => void;
  onRepsCommit: (reps: number) => void;
  onWeightCommit: (weight: number) => void;
  onDurationChange?: (deltaSeconds: number) => void;
  onDurationCommit?: (seconds: number) => void;
  onLog: () => void;
  onSkip: () => void;
}

export function ActiveSetCard({
  valueIdentity,
  setNumber,
  heading,
  badgeLabel,
  headingAccessory,
  primaryLabel = 'Log',
  secondaryLabel = 'Skip',
  reps,
  weight,
  loadType,
  metric = 'reps',
  durationS,
  timerTarget,
  weightDeltaLabel,
  repsDeltaLabel,
  weightUnit = 'kg',
  onWeightUnitChange,
  accent,
  onRepsCommit,
  onWeightCommit,
  onDurationChange,
  onDurationCommit,
  onLog,
  onSkip,
}: ActiveSetCardProps) {
  const { timer, running, elapsedS } = useExerciseTimer(timerTarget);
  const secondaryPressScale = usePressScale();
  const previousIdentity = useRef(valueIdentity);
  const reducedMotion = useReducedMotion();
  const valueOpacity = useSharedValue(1);
  const unitProgress = useSharedValue(weightUnit === 'lbs' ? 1 : 0);
  useEffect(() => {
    const target = weightUnit === 'lbs' ? 1 : 0;
    // Retarget from the current position when a tap reverses an ongoing glide.
    unitProgress.set(reducedMotion ? target : withTiming(target, workoutTiming(workoutMotion.toggle)));
  }, [reducedMotion, unitProgress, weightUnit]);
  const unitIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: unitProgress.value * UNIT_BUTTON_WIDTH }],
  }));
  const kgLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(unitProgress.value, [0, 1], [redesignColors.bone, redesignColors.ash]),
  }));
  const lbsLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(unitProgress.value, [0, 1], [redesignColors.ash, redesignColors.bone]),
  }));
  useEffect(() => {
    if (previousIdentity.current === valueIdentity) return;
    previousIdentity.current = valueIdentity;
    if (reducedMotion) {
      valueOpacity.set(1);
      return;
    }
    valueOpacity.set((current) => Math.min(current, 0.72));
    valueOpacity.set(withTiming(1, workoutTiming(140)));
  }, [reducedMotion, valueIdentity, valueOpacity]);
  const valueStyle = useAnimatedStyle(() => ({ opacity: valueOpacity.value }));
  const showsWeight = loadType === 'external_weight';
  const actionLabel = primaryLabel === 'Log it' ? 'Log' : primaryLabel === 'Done editing' ? 'Done' : primaryLabel;
  const contextLabel = heading ?? `set ${setNumber ?? ''}`;
  const timerFeedback = () => { if (Platform.OS !== 'web') void Haptics.selectionAsync(); };
  const toggleTimer = () => {
    if (!timerTarget) return;
    const applied = running ? stopExerciseTimer(timerTarget) : startExerciseTimer(timerTarget);
    if (applied) timerFeedback();
  };
  const logSet = () => {
    // Commit the final timestamp before completing; React's next render is not
    // needed for the store to log the measured seconds and propagate them.
    if (timerTarget && !stopExerciseTimer(timerTarget)) return;
    onLog();
  };

  const unitControl = onWeightUnitChange ? (
    <View accessibilityRole="radiogroup" accessibilityLabel="Weight unit" style={styles.unitToggle}>
      <Animated.View pointerEvents="none" style={[styles.unitIndicator, unitIndicatorStyle]} />
      {(['kg', 'lbs'] as const).map(unit => (
        <WorkoutTouchable key={unit} accessibilityRole="radio"
          accessibilityLabel={`Use ${unit === 'kg' ? 'kilograms' : 'pounds'}`}
          accessibilityState={{ checked: weightUnit === unit }}
          onPress={() => onWeightUnitChange(unit)} activeOpacity={0.7}
          style={styles.unitButton}>
          <Animated.Text maxFontSizeMultiplier={1.25} style={[styles.unitText, unit === 'kg' ? kgLabelStyle : lbsLabelStyle]}>{unitLabel(unit)}</Animated.Text>
        </WorkoutTouchable>
      ))}
    </View>
  ) : <Text style={styles.unitText}>{unitLabel(weightUnit)}</Text>;
  const weightLabel = (
    <View style={styles.metricCaption}>
      <Text maxFontSizeMultiplier={1.3} style={styles.label}>Weight</Text>
      {weightDeltaLabel ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={[styles.delta, { color: accent }]}>{weightDeltaLabel}</Text> : null}
    </View>
  );
  const repsLabel = (
    <View style={styles.metricCaption}>
      <Text maxFontSizeMultiplier={1.3} style={styles.label}>Reps</Text>
      {repsDeltaLabel ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={[styles.delta, { color: accent }]}>{repsDeltaLabel}</Text> : null}
    </View>
  );
  const weightPicker = (
    <View style={{ height: Platform.OS === 'ios' ? (metric === 'reps' ? 180 : 190) : 220 }}>
      <Animated.View key={weightUnit} collapsable={false}
        entering={reducedMotion ? undefined : weightUnitEnter}
        exiting={reducedMotion ? undefined : weightUnitExit}
        style={styles.weightTransition}>
        <WorkoutWeightPicker key={`${valueIdentity}-${weightUnit}`}
          value={Number(formatWeight(weight, weightUnit))} unit={unitLabel(weightUnit)} compact={metric === 'reps'}
          onChange={next => onWeightCommit(weightUnit === 'lbs' ? lbsToKg(next) : next)} />
      </Animated.View>
    </View>
  );
  const repsPicker = <WorkoutRepsPicker key={valueIdentity} value={reps} onChange={onRepsCommit} />;

  return (
    <View>
      <View style={styles.card}>
        {heading ? (
          <View style={styles.bonusHeading}>
            <Text style={styles.heading}>{heading}</Text>
            {headingAccessory ?? (badgeLabel ? <StatusPill label={badgeLabel} color={accent} /> : null)}
          </View>
        ) : null}

        {showsWeight ? (
          <>
            {metric === 'reps' ? (
              <Animated.View style={[styles.measurements, valueStyle]}>
                <View style={styles.measurementEdgeSpace} />
                <View style={styles.weightColumn}>
                  {weightLabel}
                  {weightPicker}
                </View>
                <View style={styles.measurementMiddleSpace} />
                <View style={styles.repsColumn}>
                  {repsLabel}
                  {repsPicker}
                </View>
                <View style={styles.measurementEdgeSpace} />
              </Animated.View>
            ) : (
              <>
                <Animated.View style={valueStyle}>{weightPicker}</Animated.View>
                {weightLabel}
              </>
            )}
          </>
        ) : null}

        {metric === 'duration' ? (
          <Animated.View style={[styles.duration, valueStyle]}>
            <Text style={styles.metricLabel}>Time</Text>
            {running ? (
              <View style={styles.elapsedMeasurement}>
                <Text accessibilityLabel={`${formatDuration(elapsedS)} elapsed`} allowFontScaling={false}
                  style={[styles.elapsedValue, { color: accent }]}>{formatDuration(elapsedS)}</Text>
                <Text allowFontScaling={false} style={styles.elapsedUnit}>elapsed</Text>
              </View>
            ) : (
              <Stepper valueIdentity={valueIdentity} value={durationS ?? 0} displayValue={formatDuration(durationS)}
                step={DURATION_STEP_S} unit="time" inputLabel="time" inputMode="duration" minimum={DURATION_MIN_S}
                onChange={delta => {
                  if (timerTarget) clearExerciseTimer(timerTarget);
                  onDurationChange?.(delta);
                }} onCommit={seconds => {
                  if (timerTarget) clearExerciseTimer(timerTarget);
                  onDurationCommit?.(seconds);
                }} />
            )}
            {timerTarget ? (
              <>
                <Text maxFontSizeMultiplier={1.3} style={styles.timerTarget}>
                  {timer ? `Target ${formatDuration(timer.originalDurationS)}` : 'Or time this set'}
                </Text>
                <View style={styles.timerControls}>
                  <WorkoutTouchable accessibilityRole="button"
                    accessibilityLabel={`${running ? 'Stop' : timer ? 'Resume' : 'Start'} timer for ${contextLabel}`}
                    accessibilityHint={running ? 'Uses elapsed time as the set duration' : timer ? 'Continues from the stopped time' : 'Measures this set from zero'}
                    activeOpacity={0.7} onPress={toggleTimer}
                    style={[styles.timerAction, { borderColor: `${accent}70`, backgroundColor: `${accent}14` }]}>
                    {running ? <Square color={accent} size={13} fill={accent} strokeWidth={0} />
                      : <Play color={accent} size={14} fill={accent} strokeWidth={0} />}
                    <Text maxFontSizeMultiplier={1.3} style={[styles.timerActionText, { color: accent }]}>
                      {running ? 'Stop timer' : timer ? 'Resume' : 'Start timer'}
                    </Text>
                  </WorkoutTouchable>
                  {timer ? <WorkoutTouchable accessibilityRole="button" accessibilityLabel={`Reset timer for ${contextLabel}`}
                    accessibilityHint="Clears elapsed time and restores the original set duration"
                    activeOpacity={0.7} onPress={() => { if (resetExerciseTimer(timerTarget)) timerFeedback(); }} style={styles.timerReset}>
                    <RotateCcw color={redesignColors.ash} size={17} strokeWidth={1.8} />
                  </WorkoutTouchable> : null}
                </View>
              </>
            ) : null}
          </Animated.View>
        ) : !showsWeight ? (
          <Animated.View style={[styles.bodyweightReps, valueStyle]}>
            {repsPicker}
            {repsLabel}
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <AnimatedTouchableOpacity accessibilityRole="button" accessibilityLabel={`${secondaryLabel} ${contextLabel}`}
          onPress={() => { if (timerTarget) clearExerciseTimer(timerTarget); onSkip(); }} onPressIn={secondaryPressScale.onPressIn} onPressOut={secondaryPressScale.onPressOut}
          activeOpacity={0.7} style={[styles.secondaryAction, secondaryPressScale.animatedStyle]}>
          <Text maxFontSizeMultiplier={1.2} style={styles.secondaryText}>{secondaryLabel}</Text>
        </AnimatedTouchableOpacity>

        <View style={styles.footerCenter}>{showsWeight ? unitControl : null}</View>

        <WorkoutLogAction key={`${valueIdentity}-${primaryLabel}`} label={actionLabel}
          accessibilityLabel={`${primaryLabel} ${contextLabel}`} accent={accent} onLog={logSet} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: INPUT_PADDING },
  bonusHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  heading: { flex: 1, fontFamily: redesignFonts.display, fontSize: 24, color: redesignColors.bone },
  label: { fontFamily: redesignFonts.uiSemiBold, fontSize: 16, color: redesignColors.ash },
  delta: { fontFamily: redesignFonts.ui, fontSize: 12, marginLeft: 6, flexShrink: 1 },
  unitToggle: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: redesignColors.raised },
  unitButton: { width: UNIT_BUTTON_WIDTH, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  unitIndicator: { position: 'absolute', left: 3, top: 3, bottom: 3, width: UNIT_BUTTON_WIDTH, borderRadius: 999, backgroundColor: redesignColors.hi },
  unitText: { fontFamily: redesignFonts.uiSemiBold, fontSize: 12, color: redesignColors.ash },
  weightTransition: { position: 'absolute', top: 0, left: 0, right: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 4 },
  footerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  measurements: { flexDirection: 'row', alignItems: 'flex-start' },
  measurementEdgeSpace: { flexGrow: 1, flexBasis: 0 },
  // The screen and input padding already contribute to each outer gap.
  // Give the middle spacer that same base so all three visible gaps match.
  measurementMiddleSpace: { flexGrow: 1, flexBasis: WORKOUT_SCREEN_HORIZONTAL_PADDING + INPUT_PADDING },
  weightColumn: { width: WORKOUT_WEIGHT_PICKER_WIDTH, flexShrink: 1, minWidth: 0 },
  repsColumn: { width: WORKOUT_REPS_PICKER_WIDTH, flexShrink: 1, minWidth: 0 },
  metricCaption: { flexDirection: 'row', minHeight: 28, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  bodyweightReps: { width: 112, maxWidth: '100%', alignSelf: 'center' },
  duration: { alignItems: 'center', paddingVertical: 12 },
  metricLabel: { fontFamily: redesignFonts.uiMedium, fontSize: 13, color: redesignColors.ash, marginBottom: 5 },
  elapsedMeasurement: { alignItems: 'center' },
  elapsedValue: { height: 42, fontFamily: redesignFonts.monoBold, fontSize: 32, lineHeight: 42, textAlign: 'center', fontVariant: ['tabular-nums'] },
  elapsedUnit: { marginTop: 2, fontFamily: redesignFonts.uiSemiBold, fontSize: 13, color: redesignColors.ash },
  timerTarget: { marginTop: 10, fontFamily: redesignFonts.ui, fontSize: 12, color: redesignColors.ash },
  timerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  timerAction: { minHeight: 44, minWidth: 146, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  timerActionText: { fontFamily: redesignFonts.uiSemiBold, fontSize: 14 },
  timerReset: { width: 44, height: 44, borderRadius: 22, backgroundColor: redesignColors.raised, alignItems: 'center', justifyContent: 'center' },
  secondaryAction: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 34, backgroundColor: redesignColors.raised },
  secondaryText: { fontFamily: redesignFonts.uiSemiBold, fontSize: 14, color: redesignColors.ash },
});
