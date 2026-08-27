import React, { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown, ChevronRight, Plus, Trophy } from 'lucide-react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BONUS_SET_META, type BonusSetSelection } from '@/components/BonusSet';
import { redesignColors, redesignFonts } from '@/constants/theme';
import type { ExerciseSet } from '@/store/workoutStore';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const roundToPlate = (weight: number) => Math.round(weight / 2.5) * 2.5;

function FinisherOption({ title, metric, color, icon, onPress }: {
  title: string;
  metric: string;
  color: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const pressed = useSharedValue(0);
  const pressedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.035 }],
  }));
  const setPressed = (value: number) => {
    pressed.value = withTiming(value, {
      duration: value ? 80 : 140,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  };

  return (
    <AnimatedTouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.74}
      onPress={onPress}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
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
        pressedStyle,
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
  onEditSet,
  onSelectBonus,
  weightUnit = 'kg',
}: {
  sets: ExerciseSet[];
  nextExerciseName?: string;
  // Display unit only — the plate/PR math below stays kg-based.
  weightUnit?: WeightUnit;
  onAdvance: () => void;
  onEditSet: (setIndex: number) => void;
  onSelectBonus: (selection: BonusSetSelection) => void;
}) {
  const advancePressed = useSharedValue(0);
  const advancePressedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - advancePressed.value * 0.018 }],
  }));
  const lastSet = [...sets].reverse().find((set) => !set.type);
  const lastWeight = lastSet?.weight ?? 0;
  const lastReps = lastSet?.reps ?? 1;
  const dropWeight = Math.max(0, roundToPlate(lastWeight * 0.8));
  const prJump = Math.max(2.5, roundToPlate(lastWeight * 0.1));
  const prWeight = lastWeight + prJump;
  const prReps = Math.max(1, lastReps - Math.max(2, Math.ceil(lastReps * 0.35)));
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {sets.map((set, index) => (
          <TouchableOpacity
            key={`completed-set-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Edit set ${index + 1}`}
            accessibilityHint="Reopens this completed set for editing"
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
              {formatWeight(set.weight, weightUnit)} {unitLabel(weightUnit)}
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
            × {set.reps} reps
          </Text>
          </TouchableOpacity>
        ))}
      </View>
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

      <View style={{ flexDirection: 'row', gap: 9 }}>
        <FinisherOption
          title="Extra Set"
          metric={`${formatWeight(lastWeight, weightUnit)} ${unitLabel(weightUnit)} × ${lastReps}`}
          color={BONUS_SET_META.extra.color}
          icon={<Plus color={BONUS_SET_META.extra.color} size={25} strokeWidth={2.6} />}
          onPress={() => onSelectBonus({ type: 'extra', reps: lastReps, weight: lastWeight })}
        />
        <FinisherOption
          title="Drop Set"
          metric={`${formatWeight(dropWeight, weightUnit)} ${unitLabel(weightUnit)} × ${lastReps}`}
          color={BONUS_SET_META.dropset.color}
          icon={<ArrowDown color={BONUS_SET_META.dropset.color} size={25} strokeWidth={2.6} />}
          onPress={() => onSelectBonus({ type: 'dropset', reps: lastReps, weight: dropWeight })}
        />
        <FinisherOption
          title="PR Attempt"
          metric={`${formatWeight(prWeight, weightUnit)} ${unitLabel(weightUnit)} × ${prReps}`}
          color={BONUS_SET_META.pr.color}
          icon={<Trophy color={BONUS_SET_META.pr.color} size={23} strokeWidth={2.4} />}
          onPress={() => onSelectBonus({ type: 'pr', reps: prReps, weight: prWeight })}
        />
      </View>

      <AnimatedTouchableOpacity
        accessibilityRole="button"
        onPress={onAdvance}
        onPressIn={() => {
          advancePressed.value = withTiming(1, {
            duration: 80,
            reduceMotion: ReduceMotion.System,
          });
        }}
        onPressOut={() => {
          advancePressed.value = withTiming(0, {
            duration: 140,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          });
        }}
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
          advancePressedStyle,
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
