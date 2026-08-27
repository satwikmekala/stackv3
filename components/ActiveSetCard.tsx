import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';
import Animated, {
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StatusPill } from '@/components/StatusPill';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { formatWeight, lbsToKg, unitLabel, type WeightUnit } from '@/store/weightUnits';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface RollingValueProps {
  value: number;
  // Rendered text; falls back to the raw value when no unit conversion applies.
  label?: string;
  color?: string;
}

function RollingValue({ value, label, color = redesignColors.bone }: RollingValueProps) {
  const previousValue = useRef(value);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (value === previousValue.current) return;

    const direction = value > previousValue.current ? 1 : -1;
    previousValue.current = value;
    translateY.value = direction * 14;
    opacity.value = 0.35;
    translateY.value = withSequence(
      withTiming(direction * -2, { duration: 130, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 80, easing: Easing.out(Easing.ease) })
    );
    opacity.value = withTiming(1, { duration: 170, easing: Easing.out(Easing.ease) });
  }, [opacity, translateY, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const valueLabel = label ?? String(value);
  const isCompactValue = valueLabel.length >= 4;

  return (
    <Animated.Text
      allowFontScaling={false}
      style={[
        {
          // Decimal weights need a little more room, but a smaller type size keeps
          // the +/- controls comfortably inside a two-column metric card.
          minWidth: isCompactValue ? 66 : 52,
          textAlign: 'center',
          fontFamily: redesignFonts.monoBold,
          fontSize: isCompactValue ? 29 : 32,
          lineHeight: 38,
          color,
        },
        animatedStyle,
      ]}
    >
      {valueLabel}
    </Animated.Text>
  );
}

interface StepperProps {
  value: number;
  // Display text for `value`; the raw number is still used for the roll direction.
  displayValue?: string;
  step: number;
  unit: string;
  accent?: string;
  onChange: (delta: number) => void;
}

function Stepper({ value, displayValue, step, unit, accent, onChange }: StepperProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${unit}`}
          onPress={() => onChange(-step)}
          hitSlop={8}
          activeOpacity={0.7}
          style={{
            width: 30,
            height: 42,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: redesignColors.border,
            backgroundColor: redesignColors.raised,
          }}
        >
          <Minus color={redesignColors.bone} size={18} strokeWidth={2.6} />
        </TouchableOpacity>

        <RollingValue value={value} label={displayValue} color={accent} />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Increase ${unit}`}
          onPress={() => onChange(step)}
          hitSlop={8}
          activeOpacity={0.7}
          style={{
            width: 30,
            height: 42,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: redesignColors.border,
            backgroundColor: redesignColors.raised,
          }}
        >
          <Plus color={redesignColors.bone} size={18} strokeWidth={2.6} />
        </TouchableOpacity>
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

interface MetricBlockProps extends StepperProps {
  label: string;
  deltaLabel?: string | null;
}

function MetricBlock({ label, deltaLabel, ...stepperProps }: MetricBlockProps) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 20,
        paddingHorizontal: 4,
        paddingTop: 14,
        paddingBottom: 12,
        alignItems: 'center',
        backgroundColor: redesignColors.surface,
        borderWidth: 1,
        borderColor: redesignColors.border,
      }}
    >
      <View
        style={{
          height: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontFamily: redesignFonts.monoBold,
            fontSize: 10,
            letterSpacing: 1.8,
            color: redesignColors.ash,
          }}
          allowFontScaling={false}
        >
          {label}
        </Text>
        {deltaLabel ? (
          <View
            style={{
              marginLeft: 6,
              borderRadius: 7,
              paddingHorizontal: 6,
              paddingVertical: 3,
              backgroundColor: `${stepperProps.accent ?? redesignColors.raised}24`,
            }}
          >
            <Text
              style={{
                fontFamily: redesignFonts.monoBold,
                fontSize: 10,
                color: stepperProps.accent,
              }}
              allowFontScaling={false}
            >
              {deltaLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <Stepper {...stepperProps} />
    </View>
  );
}

interface ActiveSetCardProps {
  setNumber?: number;
  heading?: string;
  badgeLabel?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  reps: number;
  weight: number;
  weightDeltaLabel?: string | null;
  // Step size for the manual weight stepper, from the user's profile — already
  // in `weightUnit`, so it is lb-native in lbs mode rather than a converted kg.
  weightIncrement?: number;
  // Display/input unit. `weight` is always kg, and so is every onWeightChange delta.
  weightUnit?: WeightUnit;
  accent: string;
  onRepsChange: (delta: number) => void;
  onWeightChange: (delta: number) => void;
  onLog: () => void;
  onSkip: () => void;
}

export function ActiveSetCard({
  setNumber,
  heading,
  badgeLabel = 'Recommended',
  primaryLabel = 'Log',
  secondaryLabel = 'Skip',
  reps,
  weight,
  weightDeltaLabel,
  weightIncrement = 2.5,
  weightUnit = 'kg',
  accent,
  onRepsChange,
  onWeightChange,
  onLog,
  onSkip,
}: ActiveSetCardProps) {
  const primaryPressed = useSharedValue(0);
  const secondaryPressed = useSharedValue(0);

  // The stepper taps produce a delta in the display unit. Storage is kg-canonical
  // and the parent adds this delta straight onto the stored kg value, so a
  // lb-native step is converted here. lbsToKg is purely multiplicative, so
  // applying it to a signed delta is exact — and kg mode passes through untouched.
  const handleWeightDelta = (delta: number) => {
    onWeightChange(weightUnit === 'lbs' ? lbsToKg(delta) : delta);
  };

  const primaryButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - primaryPressed.value * 0.025 }],
  }));
  const secondaryButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - secondaryPressed.value * 0.025 }],
  }));

  const setPressed = (pressed: SharedValue<number>, value: number) => {
    pressed.value = withTiming(value, {
      duration: value ? 80 : 140,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  };

  return (
    <View
      style={{
        borderRadius: 27,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: accent,
        padding: 18,
        backgroundColor: redesignColors.surface,
        shadowColor: accent,
        shadowOpacity: 0.18,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <Text
          style={{
            fontFamily: redesignFonts.display,
            fontSize: 26,
            lineHeight: 32,
            color: redesignColors.bone,
          }}
          allowFontScaling={false}
        >
          {heading ?? `Set ${setNumber}`}
        </Text>
        <StatusPill label={badgeLabel} color={accent} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MetricBlock
          label="WEIGHT"
          value={weight}
          displayValue={formatWeight(weight, weightUnit)}
          step={weightIncrement}
          unit={unitLabel(weightUnit)}
          accent={accent}
          deltaLabel={weightDeltaLabel}
          onChange={handleWeightDelta}
        />
        <MetricBlock label="REPS" value={reps} step={1} unit="reps" onChange={onRepsChange} />
      </View>

      <View style={{ width: '100%', flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <AnimatedTouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${primaryLabel} ${heading ?? `set ${setNumber}`}`}
          onPress={onLog}
          onPressIn={() => setPressed(primaryPressed, 1)}
          onPressOut={() => setPressed(primaryPressed, 0)}
          activeOpacity={0.78}
          style={[
            {
              flex: 1,
              minWidth: 0,
              height: 58,
              borderRadius: 19,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accent,
            },
            primaryButtonStyle,
          ]}
        >
          <Check color={redesignColors.ink} size={22} strokeWidth={3.2} />
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              marginLeft: 9,
              fontFamily: redesignFonts.uiBold,
              fontSize: 19,
              color: redesignColors.ink,
            }}
          >
            {primaryLabel}
          </Text>
        </AnimatedTouchableOpacity>

        <AnimatedTouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${secondaryLabel} ${heading ?? `set ${setNumber}`}`}
          onPress={onSkip}
          onPressIn={() => setPressed(secondaryPressed, 1)}
          onPressOut={() => setPressed(secondaryPressed, 0)}
          activeOpacity={0.7}
          style={[
            {
              width: 94,
              height: 58,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: redesignColors.border,
              backgroundColor: 'transparent',
            },
            secondaryButtonStyle,
          ]}
        >
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              fontFamily: redesignFonts.uiBold,
              fontSize: 16,
              color: redesignColors.ash,
            }}
          >
            {secondaryLabel}
          </Text>
        </AnimatedTouchableOpacity>
      </View>
    </View>
  );
}
