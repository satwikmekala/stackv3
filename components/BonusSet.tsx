import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { ActiveSetCard } from '@/components/ActiveSetCard';
import { redesignColors, redesignFonts } from '@/constants/theme';
import type { BonusSetType } from '@/store/workoutStore';

export type BonusSetSelection = {
  type: BonusSetType;
  reps: number;
  weight: number;
};

export const BONUS_SET_META: Record<BonusSetType, { title: string; shortTitle: string; color: string }> = {
  extra: { title: 'Extra Set', shortTitle: 'EXTRA', color: '#28C8BD' },
  dropset: { title: 'Drop Set', shortTitle: 'DROP', color: '#9B72F2' },
  pr: { title: 'PR Attempt', shortTitle: 'PR', color: '#E8B84A' },
};

const ACKNOWLEDGEMENT_CHECK_ENTER = ZoomIn.springify()
  .damping(16)
  .stiffness(240)
  .reduceMotion(ReduceMotion.System);

const formatWeight = (weight: number) =>
  Number.isInteger(weight) ? weight.toString() : weight.toFixed(1).replace(/\.0$/, '');

export function BonusSet({
  selection,
  onDone,
  onCancel,
}: {
  selection: BonusSetSelection;
  onDone: (set: BonusSetSelection) => void;
  onCancel: () => void;
}) {
  const [reps, setReps] = useState(selection.reps);
  const [weight, setWeight] = useState(selection.weight);
  const meta = BONUS_SET_META[selection.type];

  return (
    <ActiveSetCard
      heading={meta.title}
      badgeLabel="Bonus set"
      reps={reps}
      weight={weight}
      accent={meta.color}
      primaryLabel="Done"
      secondaryLabel="Cancel"
      onRepsChange={(delta) => setReps((current) => Math.max(1, current + delta))}
      onWeightChange={(delta) => setWeight((current) => Math.max(0, current + delta))}
      onLog={() => onDone({ type: selection.type, reps, weight })}
      onSkip={onCancel}
    />
  );
}

export function BonusSetAcknowledgement({
  set,
  onAdvance,
}: {
  set: BonusSetSelection;
  onAdvance: () => void;
}) {
  const meta = BONUS_SET_META[set.type];
  const didAdvance = useRef(false);

  const advanceOnce = useCallback(() => {
    if (didAdvance.current) return;
    didAdvance.current = true;
    onAdvance();
  }, [onAdvance]);

  useEffect(() => {
    const timeout = setTimeout(advanceOnce, 1100);
    return () => clearTimeout(timeout);
  }, [advanceOnce]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Well done. ${formatWeight(set.weight)} kilograms by ${set.reps}. Continue.`}
      activeOpacity={0.92}
      onPress={advanceOnce}
      style={{
        minHeight: 330,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: redesignColors.surface,
        borderWidth: 1.5,
        borderColor: `${meta.color}88`,
        shadowColor: meta.color,
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <Animated.View
        entering={ACKNOWLEDGEMENT_CHECK_ENTER}
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: meta.color,
          shadowColor: meta.color,
          shadowOpacity: 0.5,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <Check color={redesignColors.ink} size={31} strokeWidth={3.2} />
      </Animated.View>
      <Text
        allowFontScaling={false}
        style={{
          marginTop: 18,
          fontFamily: redesignFonts.display,
          fontSize: 31,
          color: redesignColors.bone,
        }}
      >
        Well done
      </Text>
      <Text
        allowFontScaling={false}
        style={{
          marginTop: 8,
          fontFamily: redesignFonts.monoBold,
          fontSize: 15,
          color: meta.color,
        }}
      >
        {formatWeight(set.weight)} kg × {set.reps}
      </Text>
      <Text
        allowFontScaling={false}
        style={{
          marginTop: 22,
          fontFamily: redesignFonts.ui,
          fontSize: 12,
          color: redesignColors.ashDim,
        }}
      >
        Tap to continue
      </Text>
    </TouchableOpacity>
  );
}
