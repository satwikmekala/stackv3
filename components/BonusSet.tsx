import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import React, { useState } from 'react';
import { Platform, Text } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import * as Haptics from '@/services/haptics';
import { ActiveSetCard } from '@/components/ActiveSetCard';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { type WeightUnit } from '@/store/weightUnits';
import { clampDuration } from '@/store/exerciseMeasurement';
import type { BonusSetType, ExerciseLoadType, ExerciseMetric } from '@/store/workoutStore';

export type BonusSetSelection = {
  type: BonusSetType;
  reps: number;
  weight: number;
  /** Duration-metric exercises only. */
  durationS?: number;
};

// `pr` remains only so sets logged before live record detection keep their label.
export const BONUS_SET_META: Record<BonusSetType, { title: string; shortTitle: string; color: string }> = {
  extra: { title: 'Extra set', shortTitle: 'Extra set', color: '#28C8BD' },
  dropset: { title: 'Drop set', shortTitle: 'Drop set', color: '#9B72F2' },
  pr: { title: 'PR attempt', shortTitle: 'PR attempt', color: '#A99F91' },
};

const roundToPlate = (weight: number) => Math.round(weight / 2.5) * 2.5;
/** A drop set starts about 20% lighter than the set it follows. */
const dropSetWeight = (weight: number) => Math.max(0, roundToPlate(weight * 0.8));

function DropToggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  const color = BONUS_SET_META.dropset.color;
  return (
    <WorkoutTouchable
      accessibilityRole="switch"
      accessibilityLabel="Drop set"
      accessibilityState={{ checked: on }}
      accessibilityHint="Starts this set about 20 percent lighter"
      activeOpacity={0.75}
      onPress={onPress}
      hitSlop={6}
      style={{
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: on ? `${color}29` : redesignColors.raised,
      }}
    >
      <ArrowDown color={on ? color : redesignColors.ash} size={15} strokeWidth={2.6} />
      <Text
        allowFontScaling={false}
        style={{ fontFamily: redesignFonts.uiSemiBold, fontSize: 13, color: on ? color : redesignColors.ash }}
      >
        Drop set
      </Text>
    </WorkoutTouchable>
  );
}

/** One added set after an exercise's planned sets. Logging returns to the wrap-up. */
export function BonusSet({
  selection,
  setNumber,
  accent,
  weightIncrement,
  weightUnit,
  loadType,
  metric,
  onTypeChange,
  onDone,
  onCancel,
}: {
  selection: BonusSetSelection;
  setNumber: number;
  accent: string;
  weightIncrement: number;
  weightUnit?: WeightUnit;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
  onTypeChange?: (type: BonusSetType) => void;
  onDone: (set: BonusSetSelection) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<BonusSetType>(selection.type === 'dropset' ? 'dropset' : 'extra');
  const [reps, setReps] = useState(selection.reps);
  const [weight, setWeight] = useState(selection.weight);
  const [durationS, setDurationS] = useState(selection.durationS);
  const isDrop = type === 'dropset';
  // Drop sets are a weight technique; bodyweight and timed sets only repeat.
  const canDrop = loadType === 'external_weight' && metric === 'reps';

  const toggleDrop = () => {
    const next: BonusSetType = isDrop ? 'extra' : 'dropset';
    setType(next);
    setWeight(next === 'dropset' ? dropSetWeight(selection.weight) : selection.weight);
    onTypeChange?.(next);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  return (
    <ActiveSetCard
      valueIdentity={`bonus-${type}`}
      heading={`Set ${setNumber}`}
      headingAccessory={canDrop ? <DropToggle on={isDrop} onPress={toggleDrop} /> : null}
      reps={reps}
      weight={weight}
      loadType={loadType}
      metric={metric}
      durationS={durationS}
      weightIncrement={weightIncrement}
      weightUnit={weightUnit}
      accent={isDrop ? BONUS_SET_META.dropset.color : accent}
      primaryLabel="Log"
      secondaryLabel="Cancel"
      onRepsChange={(delta) => setReps((current) => Math.max(1, current + delta))}
      onWeightChange={(delta) => setWeight((current) => Math.max(0, current + delta))}
      onRepsCommit={setReps}
      onWeightCommit={setWeight}
      onDurationChange={(delta) => setDurationS((current) => clampDuration((current ?? 0) + delta))}
      onDurationCommit={(seconds) => setDurationS(clampDuration(seconds))}
      onLog={() => onDone({ type, reps, weight, ...(metric === 'duration' ? { durationS } : {}) })}
      onSkip={onCancel}
    />
  );
}
