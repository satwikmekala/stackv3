import { displayExerciseName } from '@/constants/exerciseNames';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowRight, ChevronRight, Plus, Trophy } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { BONUS_SET_META, type BonusSetSelection } from '@/components/BonusSet';
import { redesignColors, redesignFonts } from '@/constants/theme';
import {
  workoutLayoutTransition,
  workoutRowEntering,
} from '@/constants/workoutLayoutTransitions';
import { usePressScale } from '@/hooks/usePressScale';
import type { LastTimeComparison, RecordHint } from '@/store/exerciseWrapUp';
import type {
  ExerciseLoadType,
  ExerciseMetric,
  ExerciseSet,
  SessionExercise,
} from '@/store/workoutStore';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';
import { DEFAULT_DURATION_S, formatDuration, getExerciseMetric } from '@/store/exerciseMeasurement';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const RECORD_COLOR = '#E8B84A';

const groupThousands = (value: string) => {
  const [whole, fraction] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
};

/** "60 kg × 8", "12 reps", "20 kg · 0:45" or "0:45". */
const describeSet = (
  set: Pick<ExerciseSet, 'weight' | 'reps' | 'durationS'>,
  loadType: ExerciseLoadType,
  metric: ExerciseMetric,
  unit: WeightUnit
) => {
  const load = `${formatWeight(set.weight, unit)} ${unitLabel(unit)}`;
  if (metric === 'duration') {
    return loadType === 'bodyweight' ? formatDuration(set.durationS) : `${load} · ${formatDuration(set.durationS)}`;
  }
  return loadType === 'bodyweight' ? `Bodyweight × ${set.reps}` : `${load} × ${set.reps}`;
};

/** "3 sets · 70 kg × 10": what to load for the next exercise. */
const describeTarget = (exercise: SessionExercise) => {
  const regular = exercise.sets.filter((set) => !set.type);
  const first = regular.find((set) => !set.completed && !set.skipped) ?? regular[0];
  const count = `${regular.length} ${regular.length === 1 ? 'set' : 'sets'}`;
  if (!first) return count;
  return `${count} · ${describeSet(first, exercise.loadType, getExerciseMetric(exercise), exercise.entryUnit)}`;
};

const describeComparison = (comparison: LastTimeComparison, unit: WeightUnit) => {
  const format = (value: number) => comparison.measure === 'volume'
    ? `${groupThousands(formatWeight(value, unit))} ${unitLabel(unit)}`
    : comparison.measure === 'reps' ? `${value} reps` : formatDuration(value);
  const total = `${format(comparison.current)} total`;
  if (comparison.previous === null) return { total, delta: 'first time', positive: false };
  const diff = comparison.current - comparison.previous;
  if (Math.abs(diff) < 0.05) return { total, delta: 'same as last time', positive: false };
  return { total, delta: `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))} vs last time`, positive: diff > 0 };
};

function RestElapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const elapsed = formatDuration(Math.min(5999, Math.max(0, Math.floor((now - since) / 1000))));
  return (
    <Text accessibilityLabel={`Resting ${elapsed}`} allowFontScaling={false} style={styles.rest}>
      RESTING <Text style={styles.restValue}>{elapsed}</Text>
    </Text>
  );
}

function SetRow({ set, index, label, isRecord, entering, onPress }: {
  set: ExerciseSet;
  index: number;
  label: string;
  isRecord: boolean;
  entering: boolean;
  onPress: () => void;
}) {
  const isDrop = set.type === 'dropset';
  return (
    <AnimatedTouchableOpacity
      layout={workoutLayoutTransition}
      entering={entering ? workoutRowEntering : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Set ${index + 1}, ${set.skipped ? 'skipped' : label}${isDrop ? ', drop set' : ''}${isRecord ? ', personal record' : ''}`}
      accessibilityHint="Opens this set to edit it"
      activeOpacity={0.6}
      onPress={onPress}
      style={styles.row}
    >
      <Text allowFontScaling={false} style={styles.rowIndex}>{index + 1}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        allowFontScaling={false}
        style={set.skipped ? styles.rowSkipped : styles.rowValue}
      >
        {set.skipped ? 'Skipped' : label}
      </Text>
      {isDrop ? (
        <Text allowFontScaling={false} style={[styles.tag, { color: BONUS_SET_META.dropset.color }]}>DROP</Text>
      ) : null}
      {isRecord ? (
        <View style={styles.record}>
          <Trophy color={RECORD_COLOR} size={14} strokeWidth={2.4} />
          <Text allowFontScaling={false} style={[styles.tag, { color: RECORD_COLOR }]}>PR</Text>
        </View>
      ) : null}
      <ChevronRight color={redesignColors.ashDim} size={18} style={{ marginLeft: 6 }} />
    </AnimatedTouchableOpacity>
  );
}

export function ExerciseFinisher({
  sets,
  nextExercise,
  accent,
  addSetBase,
  recordSetIndexes = [],
  recordHint = null,
  comparison,
  restStartedAt = null,
  onAdvance,
  onAddAnother,
  canFinish = true,
  onEditSet,
  onAddSet,
  enteringSetIndex,
  weightUnit = 'kg',
  loadType,
  metric,
}: {
  sets: ExerciseSet[];
  /** The exercise "Start" moves to; none means this is the last one. */
  nextExercise?: SessionExercise;
  accent: string;
  /** The set an added set starts from. */
  addSetBase?: ExerciseSet;
  recordSetIndexes?: number[];
  recordHint?: RecordHint | null;
  comparison?: LastTimeComparison;
  /** When the most recent set was logged; null hides the rest clock. */
  restStartedAt?: number | null;
  weightUnit?: WeightUnit;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
  onAdvance: () => void;
  onAddAnother?: () => void;
  canFinish?: boolean;
  onEditSet: (setIndex: number) => void;
  onAddSet: (selection: BonusSetSelection) => void;
  enteringSetIndex?: number | null;
}) {
  const advancePressScale = usePressScale('surface');
  const timed = metric === 'duration';
  const base = {
    weight: addSetBase?.weight ?? 0,
    reps: Math.max(1, addSetBase?.reps ?? 1),
    durationS: addSetBase?.durationS ?? DEFAULT_DURATION_S,
  };
  const describe = (set: Pick<ExerciseSet, 'weight' | 'reps' | 'durationS'>) =>
    describeSet(set, loadType, metric, weightUnit);
  const recordSet = new Set(recordSetIndexes);
  const shortLoad = (lift: { weight: number; reps: number }) =>
    loadType === 'bodyweight' ? `Bodyweight × ${lift.reps}` : `${formatWeight(lift.weight, weightUnit)} ${unitLabel(weightUnit)} × ${lift.reps}`;
  const hint = recordHint && recordSet.size === 0
    ? recordHint.beatReps !== null
      ? `Best is ${shortLoad(recordHint.best)}. ${recordHint.beatReps} reps beats it.`
      : `Best is ${shortLoad(recordHint.best)}. Within reach.`
    : null;
  const summary = comparison ? describeComparison(comparison, weightUnit) : null;
  const finishDisabled = !nextExercise && !canFinish;
  const nextTarget = nextExercise ? describeTarget(nextExercise) : null;

  return (
    <View>
      <Animated.View layout={workoutLayoutTransition} style={styles.group}>
        {sets.map((set, index) => (
          <SetRow
            key={`completed-set-${index}`}
            set={set}
            index={index}
            label={describe(set)}
            isRecord={recordSet.has(index)}
            entering={index === enteringSetIndex}
            onPress={() => onEditSet(index)}
          />
        ))}
        <Animated.View layout={workoutLayoutTransition} style={styles.addDivider} />
        <AnimatedTouchableOpacity
          layout={workoutLayoutTransition}
          accessibilityRole="button"
          accessibilityLabel={`Add set, starting at ${describe(base)}`}
          accessibilityHint={hint ?? undefined}
          activeOpacity={0.6}
          onPress={() => onAddSet({
            type: 'extra',
            reps: timed ? 0 : base.reps,
            weight: base.weight,
            ...(timed ? { durationS: base.durationS } : {}),
          })}
          style={styles.addRow}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Plus color={accent} size={20} strokeWidth={2.6} style={{ marginRight: 10 }} />
            <Text allowFontScaling={false} style={styles.addLabel}>Add set</Text>
            <Text numberOfLines={1} allowFontScaling={false} style={styles.addValue}>{describe(base)}</Text>
          </View>
          {hint ? (
            <Text numberOfLines={2} allowFontScaling={false} style={styles.hint}>{hint}</Text>
          ) : null}
        </AnimatedTouchableOpacity>
      </Animated.View>

      {summary ? (
        <Text allowFontScaling={false} style={styles.summary}>
          {summary.total}
          <Text style={summary.positive ? { color: accent } : undefined}>{`  ·  ${summary.delta}`}</Text>
        </Text>
      ) : null}

      <View style={{ marginTop: 32 }}>
        {restStartedAt !== null ? <RestElapsed since={restStartedAt} /> : null}

        {onAddAnother ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add exercise" onPress={onAddAnother} activeOpacity={0.7} style={styles.secondary}>
            <Plus color={redesignColors.bone} size={18} strokeWidth={2} />
            <Text allowFontScaling={false} style={styles.secondaryText}>Add exercise</Text>
          </TouchableOpacity>
        ) : null}
        {finishDisabled ? (
          <Text allowFontScaling={false} style={styles.finishNote}>Log at least one non-skipped set to finish.</Text>
        ) : null}

        <AnimatedTouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={nextExercise ? `Start ${displayExerciseName(nextExercise.name)}, ${nextTarget}` : 'Finish workout'}
          accessibilityState={{ disabled: finishDisabled }}
          disabled={finishDisabled}
          onPress={onAdvance}
          onPressIn={advancePressScale.onPressIn}
          onPressOut={advancePressScale.onPressOut}
          activeOpacity={0.85}
          style={[
            styles.primary,
            { backgroundColor: finishDisabled ? redesignColors.raised : accent },
            advancePressScale.animatedStyle,
          ]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            {nextExercise ? (
              <>
                <Text allowFontScaling={false} style={styles.primaryEyebrow}>UP NEXT</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false}
                  style={styles.primaryTitle}>
                  {displayExerciseName(nextExercise.name)}
                </Text>
                <Text numberOfLines={1} allowFontScaling={false} style={styles.primaryDetail}>{nextTarget}</Text>
              </>
            ) : (
              <Text allowFontScaling={false}
                style={[styles.primaryTitle, finishDisabled && { color: redesignColors.ashDim }]}>
                Finish workout
              </Text>
            )}
          </View>
          <ArrowRight
            color={finishDisabled ? redesignColors.ashDim : redesignColors.ink}
            size={24}
            strokeWidth={2.4}
            style={{ marginLeft: 12 }}
          />
        </AnimatedTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 20, backgroundColor: redesignColors.surface, paddingVertical: 4, overflow: 'hidden' },
  row: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  rowIndex: {
    width: 24,
    fontFamily: redesignFonts.mono,
    fontSize: 13,
    color: redesignColors.ashDim,
    fontVariant: ['tabular-nums'],
  },
  rowValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: redesignFonts.monoBold,
    fontSize: 16,
    color: redesignColors.bone,
    fontVariant: ['tabular-nums'],
  },
  rowSkipped: { flex: 1, minWidth: 0, fontFamily: redesignFonts.ui, fontSize: 15, color: redesignColors.ashDim },
  tag: { fontFamily: redesignFonts.monoBold, fontSize: 11, letterSpacing: 1 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10 },
  addDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginVertical: 2,
    backgroundColor: redesignColors.border,
  },
  addRow: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center' },
  addLabel: { fontFamily: redesignFonts.uiSemiBold, fontSize: 16, color: redesignColors.bone },
  addValue: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
    textAlign: 'right',
    fontFamily: redesignFonts.mono,
    fontSize: 13,
    color: redesignColors.ash,
    fontVariant: ['tabular-nums'],
  },
  // Indented to start under "Add set", past the icon.
  hint: { marginTop: 3, marginLeft: 30, fontFamily: redesignFonts.ui, fontSize: 13, lineHeight: 18, color: redesignColors.ash },
  summary: {
    marginTop: 12,
    paddingHorizontal: 4,
    fontFamily: redesignFonts.mono,
    fontSize: 12,
    color: redesignColors.ash,
    fontVariant: ['tabular-nums'],
  },
  rest: {
    marginBottom: 10,
    paddingHorizontal: 4,
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: redesignColors.ashDim,
  },
  restValue: { color: redesignColors.ash, fontVariant: ['tabular-nums'] },
  secondary: {
    minHeight: 52,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: redesignColors.raised,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: redesignFonts.uiSemiBold, fontSize: 16, color: redesignColors.bone },
  finishNote: { marginBottom: 10, paddingHorizontal: 4, fontFamily: redesignFonts.ui, fontSize: 13, color: redesignColors.ash },
  primary: {
    minHeight: 64,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryEyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: redesignColors.ink,
    opacity: 0.6,
  },
  primaryTitle: {
    marginTop: 2,
    fontFamily: redesignFonts.display,
    fontSize: 22,
    lineHeight: 27,
    color: redesignColors.ink,
  },
  primaryDetail: {
    marginTop: 2,
    fontFamily: redesignFonts.mono,
    fontSize: 12,
    color: redesignColors.ink,
    opacity: 0.72,
    fontVariant: ['tabular-nums'],
  },
});
