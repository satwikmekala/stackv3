import React, { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown, ChevronRight, Plus, Trophy } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { BONUS_SET_META, type BonusSetSelection } from '@/components/BonusSet';
import { redesignColors, redesignFonts } from '@/constants/theme';
import {
  workoutLayoutTransition,
  workoutRowEntering,
} from '@/constants/workoutLayoutTransitions';
import { usePressScale } from '@/hooks/usePressScale';
import type { ExerciseLoadType, ExerciseMetric, ExerciseSet } from '@/store/workoutStore';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';
import { DEFAULT_DURATION_S, formatDuration } from '@/store/exerciseMeasurement';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const roundToPlate = (weight: number) => Math.round(weight / 2.5) * 2.5;

function FinisherOption({ title, metric, color, icon, onPress }: {
  title: string;
  metric: string;
  color: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const pressScale = usePressScale();

  return (
    <AnimatedTouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.74}
      onPress={onPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[
        {
          flex: 1,
          minWidth: 0,
          minHeight: 132,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: `${color}80`,
          backgroundColor: redesignColors.surface,
          paddingHorizontal: 8,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: color,
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        pressScale.animatedStyle,
      ]}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}22`,
          marginBottom: 7,
        }}
      >
        {icon}
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        allowFontScaling={false}
        style={{
          textAlign: 'center',
          fontFamily: redesignFonts.uiBold,
          fontSize: 14,
          lineHeight: 17,
          color: redesignColors.bone,
        }}
      >
        {title}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        allowFontScaling={false}
        style={{
          marginTop: 5,
          textAlign: 'center',
          fontFamily: redesignFonts.monoBold,
          fontSize: 10,
          color,
        }}
      >
        {metric}
      </Text>
    </AnimatedTouchableOpacity>
  );
}

export function ExerciseFinisher({
  sets,
  nextExerciseName,
  onAdvance,
  onAddAnother,
  canFinish = true,
  onEditSet,
  onSelectBonus,
  enteringSetIndex,
  weightUnit = 'kg',
  loadType,
  metric,
}: {
  sets: ExerciseSet[];
  nextExerciseName?: string;
  // Display unit only — the plate/PR math below stays kg-based.
  weightUnit?: WeightUnit;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
  onAdvance: () => void;
  onAddAnother?: () => void;
  canFinish?: boolean;
  onEditSet: (setIndex: number) => void;
  onSelectBonus: (selection: BonusSetSelection) => void;
  enteringSetIndex?: number | null;
}) {
  const advancePressScale = usePressScale();
  const lastSet = [...sets].reverse().find((set) => !set.type);
  const lastWeight = lastSet?.weight ?? 0;
  const lastReps = lastSet?.reps ?? 1;
  const isBodyweight = loadType === 'bodyweight';
  const dropWeight = isBodyweight ? 0 : Math.max(0, roundToPlate(lastWeight * 0.8));
  const prJump = Math.max(2.5, roundToPlate(lastWeight * 0.1));
  const prWeight = isBodyweight ? 0 : lastWeight + prJump;
  const prReps = Math.max(1, lastReps - Math.max(2, Math.ceil(lastReps * 0.35)));
  // Timed exercises offer only a repeat: drop sets and PR attempts are
  // weight/reps ideas with no duration semantics yet.
  const timed = metric === 'duration';
  const lastDuration = lastSet?.durationS ?? DEFAULT_DURATION_S;
  const setValue = (set: ExerciseSet) => timed
    ? isBodyweight ? formatDuration(set.durationS) : `${formatWeight(set.weight, weightUnit)} ${unitLabel(weightUnit)}`
    : isBodyweight ? `${set.reps} reps` : `${formatWeight(set.weight, weightUnit)} ${unitLabel(weightUnit)}`;
  const setDetail = (set: ExerciseSet) => timed
    ? isBodyweight ? 'Completed' : `· ${formatDuration(set.durationS)}`
    : isBodyweight ? 'Completed' : `× ${set.reps} reps`;
  return (
    <View>
      <Animated.View layout={workoutLayoutTransition} style={{ flexDirection: 'row', gap: 8 }}>
        {sets.map((set, index) => (
          <AnimatedTouchableOpacity
            key={`completed-set-${index}`}
            layout={workoutLayoutTransition}
            entering={index === enteringSetIndex ? workoutRowEntering : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Edit set ${index + 1}`}
            accessibilityHint="Shows logged values without changing workout progress"
            activeOpacity={0.72}
            onPress={() => onEditSet(index)}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 7,
              backgroundColor: redesignColors.surface,
              borderWidth: 1,
              borderColor: redesignColors.border,
            }}
          >
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: redesignFonts.monoBold,
                fontSize: 9,
                letterSpacing: 1.1,
                color: redesignColors.ash,
              }}
            >
              SET {index + 1}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              allowFontScaling={false}
              style={{
                marginTop: 5,
                fontFamily: redesignFonts.monoBold,
                fontSize: 13,
                color: redesignColors.bone,
              }}
            >
              {setValue(set)}
            </Text>
            <Text
              allowFontScaling={false}
              style={{
                marginTop: 1,
                fontFamily: redesignFonts.mono,
                fontSize: 10,
              color: redesignColors.ash,
            }}
          >
            {setDetail(set)}
          </Text>
          </AnimatedTouchableOpacity>
        ))}
      </Animated.View>
      <Text
        allowFontScaling={false}
        style={{
          marginTop: 20,
          marginBottom: 16,
          fontFamily: redesignFonts.ui,
          fontSize: 16,
          lineHeight: 22,
          color: redesignColors.ash,
        }}
      >
        Tap a set to edit it, push a little further, or move on.
      </Text>

      {timed ? (
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <FinisherOption
            title="Extra Set"
            metric={isBodyweight
              ? formatDuration(lastDuration)
              : `${formatWeight(lastWeight, weightUnit)} ${unitLabel(weightUnit)} · ${formatDuration(lastDuration)}`}
            color={BONUS_SET_META.extra.color}
            icon={<Plus color={BONUS_SET_META.extra.color} size={25} strokeWidth={2.6} />}
            onPress={() => onSelectBonus({ type: 'extra', reps: 0, weight: lastWeight, durationS: lastDuration })}
          />
        </View>
      ) : (
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <FinisherOption
          title="Extra Set"
          metric={isBodyweight
            ? `${lastReps} reps`
            : `${formatWeight(lastWeight, weightUnit)} ${unitLabel(weightUnit)} × ${lastReps}`}
          color={BONUS_SET_META.extra.color}
          icon={<Plus color={BONUS_SET_META.extra.color} size={25} strokeWidth={2.6} />}
          onPress={() => onSelectBonus({ type: 'extra', reps: lastReps, weight: lastWeight })}
        />
        <FinisherOption
          title="Drop Set"
          metric={isBodyweight
            ? `${lastReps} reps`
            : `${formatWeight(dropWeight, weightUnit)} ${unitLabel(weightUnit)} × ${lastReps}`}
          color={BONUS_SET_META.dropset.color}
          icon={<ArrowDown color={BONUS_SET_META.dropset.color} size={25} strokeWidth={2.6} />}
          onPress={() => onSelectBonus({ type: 'dropset', reps: lastReps, weight: dropWeight })}
        />
        <FinisherOption
          title="PR Attempt"
          metric={isBodyweight
            ? `${prReps} reps`
            : `${formatWeight(prWeight, weightUnit)} ${unitLabel(weightUnit)} × ${prReps}`}
          color={BONUS_SET_META.pr.color}
          icon={<Trophy color={BONUS_SET_META.pr.color} size={23} strokeWidth={2.4} />}
          onPress={() => onSelectBonus({ type: 'pr', reps: prReps, weight: prWeight })}
        />
      </View>
      )}

      {onAddAnother ? (
        <TouchableOpacity accessibilityRole="button" onPress={onAddAnother}
          style={{ padding: 18, marginTop: 20, borderRadius: 18, backgroundColor: redesignColors.raised, alignItems: 'center' }}>
          <Text style={{ fontFamily: redesignFonts.uiSemiBold, fontSize: 16, color: redesignColors.bone }}>Add another exercise</Text>
        </TouchableOpacity>
      ) : null}
      {!nextExerciseName && !canFinish ? <Text style={{ color: redesignColors.ash, marginTop: 12 }}>Log at least one non-skipped set to finish.</Text> : null}
      <AnimatedTouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: !nextExerciseName && !canFinish }}
        disabled={!nextExerciseName && !canFinish}
        onPress={onAdvance}
        onPressIn={advancePressScale.onPressIn}
        onPressOut={advancePressScale.onPressOut}
        activeOpacity={0.65}
        style={[
          {
            height: 56,
            marginTop: 20,
            paddingHorizontal: 18,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            backgroundColor: redesignColors.raised,
            borderWidth: 1,
            borderColor: redesignColors.border,
          },
          advancePressScale.animatedStyle,
        ]}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: redesignFonts.uiSemiBold,
            fontSize: 16,
            color: redesignColors.bone,
          }}
        >
          {nextExerciseName ? `Move on to ${nextExerciseName}` : 'Finish workout'}
        </Text>
        <ChevronRight color={redesignColors.ash} size={20} style={{ marginLeft: 8 }} />
      </AnimatedTouchableOpacity>
    </View>
  );
}
