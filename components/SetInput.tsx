import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Plus, Minus, Check } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';

interface SetInputProps {
  setNumber: number;
  reps: number;
  weight: number;
  completed?: boolean;
  skipped?: boolean;
  onRepsChange: (delta: number) => void;
  onWeightChange: (delta: number) => void;
  onToggleComplete: () => void;
  onSkip: () => void;
}

// Compact stepper pill: minus / value (Space Mono) / plus.
function StepperPill({
  value,
  onChange,
  disabled,
  step,
}: {
  value: number;
  onChange: (delta: number) => void;
  disabled: boolean;
  step: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceRaised,
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => onChange(-step)}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 0 }}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Minus color={colors.ash} size={16} strokeWidth={2.5} />
      </Pressable>
      <Text
        style={{
          fontFamily: fonts.monoBold,
          fontSize: 18,
          color: colors.bone,
          minWidth: 52,
          textAlign: 'center',
        }}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(step)}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 0, right: 6 }}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Plus color={colors.ash} size={16} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

export function SetInput({
  setNumber,
  reps,
  weight,
  completed = false,
  skipped = false,
  onRepsChange,
  onWeightChange,
  onToggleComplete,
  onSkip,
}: SetInputProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (completed) {
      scale.value = withSequence(
        withTiming(0.97, { duration: 100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) })
      );
      opacity.value = withTiming(0.55, { duration: 180 });
    } else {
      opacity.value = withTiming(1, { duration: 180 });
    }
  }, [completed, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          // Verified sets get the solid accent border; skipped sets get a muted
          // dashed one so it's glanceable which numbers were actually confirmed.
          borderStyle: skipped ? 'dashed' : 'solid',
          borderColor: skipped
            ? 'rgba(163, 156, 143, 0.45)'
            : completed
              ? 'rgba(76, 111, 255, 0.35)'
              : 'transparent',
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ash }}>
          SET {setNumber}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Skip: subordinate to the main checkbox — logs the set as done
              without vouching for the numbers. Hidden once verified normally. */}
          {(!completed || skipped) && (
            <TouchableOpacity
              onPress={onSkip}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                marginRight: 10,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: skipped
                  ? 'rgba(163, 156, 143, 0.7)'
                  : 'rgba(163, 156, 143, 0.35)',
                backgroundColor: skipped ? 'rgba(163, 156, 143, 0.12)' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 11,
                  color: skipped ? colors.bone : colors.ash,
                }}
              >
                {skipped ? 'Skipped' : 'Skip'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onToggleComplete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: completed && !skipped ? colors.accent : 'transparent',
              borderWidth: completed && !skipped ? 0 : 1.5,
              borderStyle: skipped ? 'dashed' : 'solid',
              borderColor: 'rgba(163, 156, 143, 0.5)',
            }}
          >
            <Check
              color={completed && !skipped ? colors.ink : colors.ash}
              size={16}
              strokeWidth={3}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.ash, marginBottom: 6 }}>
            Reps
          </Text>
          <StepperPill value={reps} onChange={onRepsChange} disabled={completed} step={1} />
        </View>
        <View style={{ alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.ash, marginBottom: 6 }}>
            Weight (kg)
          </Text>
          <StepperPill value={weight} onChange={onWeightChange} disabled={completed} step={2.5} />
        </View>
      </View>
    </Animated.View>
  );
}
