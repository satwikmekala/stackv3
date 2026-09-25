import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Info, Minus, Plus } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';
import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import { workoutMotion, workoutTiming } from '@/constants/workoutMotion';
import { StatusPill } from '@/components/StatusPill';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';
import type { ExerciseLoadType } from '@/store/workoutStore';
import { formatWeight, lbsToKg, unitLabel, type WeightUnit } from '@/store/weightUnits';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface RollingValueProps {
  value: number;
  // Rendered text; falls back to the raw value when no unit conversion applies.
  label?: string;
  color?: string;
  inputLabel: string;
  inputMode: 'decimal' | 'integer';
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

    const normalizedDraft = draft.trim().replace(',', '.');
    const matchesFormat = inputMode === 'integer'
      ? /^\d+$/.test(normalizedDraft)
      : /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalizedDraft);
    const parsedValue = Number(normalizedDraft);

    if (
      matchesFormat
      && Number.isFinite(parsedValue)
      && parsedValue >= minimum
      && (inputMode !== 'integer' || Number.isInteger(parsedValue))
    ) {
      manualCommit.current = true;
      onCommit(parsedValue);
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
          keyboardType={inputMode === 'decimal' ? 'decimal-pad' : 'number-pad'}
          keyboardAppearance="dark"
          inputMode={inputMode === 'decimal' ? 'decimal' : 'numeric'}
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
  value: number;
  // Display text for `value`; the raw number is still used for the roll direction.
  displayValue?: string;
  step: number;
  unit: string;
  inputLabel: string;
  inputMode: 'decimal' | 'integer';
  minimum: number;
  accent?: string;
  onChange: (delta: number) => void;
  onCommit: (value: number) => void;
}

function Stepper({
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
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: redesignColors.border,
            backgroundColor: redesignColors.raised,
          }}
        >
          <Minus color={redesignColors.bone} size={18} strokeWidth={2.6} />
        </WorkoutTouchable>

        <RollingValue
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
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: redesignColors.border,
            backgroundColor: redesignColors.raised,
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
  loadType: ExerciseLoadType;
  weightDeltaLabel?: string | null;
  // Step size for the manual weight stepper, from the user's profile — already
  // in `weightUnit`, so it is lb-native in lbs mode rather than a converted kg.
  weightIncrement: number;
  // Display/input unit. `weight` is always kg, and so is every onWeightChange delta.
  weightUnit?: WeightUnit;
  onWeightUnitChange?: (weightUnit: WeightUnit) => void;
  onInfoPress?: () => void;
  accent: string;
  onRepsChange: (delta: number) => void;
  onWeightChange: (delta: number) => void;
  onRepsCommit: (reps: number) => void;
  onWeightCommit: (weight: number) => void;
  onLog: () => void;
  onSkip: () => void;
}

export function ActiveSetCard({
  setNumber,
  heading,
  badgeLabel,
  primaryLabel = 'Log it',
  secondaryLabel = 'Skip',
  reps,
  weight,
  loadType,
  weightDeltaLabel,
  weightIncrement,
  weightUnit = 'kg',
  onWeightUnitChange,
  onInfoPress,
  accent,
  onRepsChange,
  onWeightChange,
  onRepsCommit,
  onWeightCommit,
  onLog,
  onSkip,
}: ActiveSetCardProps) {
  const primaryPressScale = usePressScale();
  const secondaryPressScale = usePressScale();
  const unitPosition = useSharedValue(weightUnit === 'kg' ? 0 : 39);
  useEffect(() => {
    unitPosition.value = withTiming(weightUnit === 'kg' ? 0 : 39, workoutTiming(workoutMotion.toggle));
  }, [unitPosition, weightUnit]);
  const unitPillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: unitPosition.value }] }));
  const kgLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(unitPosition.value, [0, 39], [redesignColors.ink, redesignColors.ash]),
  }));
  const lbsLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(unitPosition.value, [0, 39], [redesignColors.ash, redesignColors.ink]),
  }));
  const showsWeight = loadType === 'external_weight';

  // The stepper taps produce a delta in the display unit. Storage is kg-canonical
  // and the parent adds this delta straight onto the stored kg value, so a
  // lb-native step is converted here. lbsToKg is purely multiplicative, so
  // applying it to a signed delta is exact — and kg mode passes through untouched.
  const handleWeightDelta = (delta: number) => {
    onWeightChange(weightUnit === 'lbs' ? lbsToKg(delta) : delta);
  };

  const handleWeightCommit = (nextWeight: number) => {
    onWeightCommit(weightUnit === 'lbs' ? lbsToKg(nextWeight) : nextWeight);
  };

  return (
    <View
      style={{
        borderRadius: 27,
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderColor: accent,
        padding: 18,
        backgroundColor: redesignColors.surface,
        shadowColor: accent,
        shadowOpacity: 0.3,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onInfoPress ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Exercise info"
            accessibilityHint="Opens exercise illustration, muscles, and description"
            onPress={onInfoPress}
            activeOpacity={0.7}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{
              width: 27,
              height: 27,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: redesignColors.border,
              backgroundColor: redesignColors.raised,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Info color={redesignColors.ash} size={15} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        ) : null}
        {showsWeight && onWeightUnitChange ? (
          <View
            accessibilityRole="radiogroup"
            style={{
              flexDirection: 'row',
              padding: 3,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: redesignColors.border,
              backgroundColor: redesignColors.raised,
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', left: 3, top: 3, width: 39, height: 27,
                borderRadius: 9, backgroundColor: accent }, unitPillStyle]}
            />
            {(['kg', 'lbs'] as const).map((unit) => {
              const selected = weightUnit === unit;
              return (
                <WorkoutTouchable
                  key={unit}
                  accessibilityRole="radio"
                  accessibilityLabel={`Use ${unit}`}
                  accessibilityState={{ checked: selected }}
                  activeOpacity={0.72}
                  onPress={() => onWeightUnitChange(unit)}
                  style={{
                    width: 39,
                    height: 27,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Animated.Text
                    allowFontScaling={false}
                    style={[{
                      fontFamily: redesignFonts.monoBold,
                      fontSize: 10,
                      letterSpacing: 0.4,
                    }, unit === 'kg' ? kgLabelStyle : lbsLabelStyle]}
                  >
                    {unit.toUpperCase()}
                  </Animated.Text>
                </WorkoutTouchable>
              );
            })}
          </View>
        ) : badgeLabel ? (
          <StatusPill label={badgeLabel} color={accent} />
        ) : null}
        </View>
      </View>

      <View
        style={{
          width: '100%',
          maxWidth: showsWeight ? undefined : 240,
          alignSelf: 'center',
          flexDirection: 'row',
          gap: 12,
        }}
      >
        {showsWeight ? (
          <MetricBlock
            label="WEIGHT"
            value={weight}
            displayValue={formatWeight(weight, weightUnit)}
            step={weightIncrement}
            unit={unitLabel(weightUnit)}
            inputLabel="weight"
            inputMode="decimal"
            minimum={0}
            accent={accent}
            deltaLabel={weightDeltaLabel}
            onChange={handleWeightDelta}
            onCommit={handleWeightCommit}
          />
        ) : null}
        <MetricBlock
          label="REPS"
          value={reps}
          step={1}
          unit="reps"
          inputLabel="reps"
          inputMode="integer"
          minimum={1}
          accent={showsWeight ? undefined : accent}
          onChange={onRepsChange}
          onCommit={onRepsCommit}
        />
      </View>

      <View style={{ width: '100%', flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <AnimatedTouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${primaryLabel} ${heading ?? `set ${setNumber}`}`}
          onPress={onLog}
          onPressIn={primaryPressScale.onPressIn}
          onPressOut={primaryPressScale.onPressOut}
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
            primaryPressScale.animatedStyle,
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
          onPressIn={secondaryPressScale.onPressIn}
          onPressOut={secondaryPressScale.onPressOut}
          activeOpacity={0.7}
          style={[
            {
              width: 94,
              height: 58,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderColor: redesignColors.border,
              backgroundColor: 'transparent',
            },
            secondaryPressScale.animatedStyle,
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
