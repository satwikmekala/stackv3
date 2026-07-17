import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { WorkoutType } from '@/store/workoutStore';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors, redesignFonts } from '@/constants/theme';

type WorkoutHeroCardProps = {
  type: WorkoutType;
  exerciseCount: number;
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function rgba(hex: string, opacity: number) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function WorkoutHeroCard({ type, exerciseCount, onPress }: WorkoutHeroCardProps) {
  const meta = workoutMeta[type];
  const pressed = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [glow, type]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.012 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.24 + glow.value * 0.2,
    shadowRadius: 13 + glow.value * 6,
    transform: [{ scale: 1 + glow.value * 0.025 }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Start ${meta.label}`}
      accessibilityHint={`${meta.group} workout with ${exerciseCount} exercises`}
      onPress={onPress}
      onPressIn={() => (pressed.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: 140 }))}
      style={[styles.card, { borderColor: rgba(meta.color, 0.72) }, cardStyle]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[rgba(meta.color, 0.31), rgba(meta.color, 0.13), 'rgba(29, 25, 21, 0.96)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View>
        <Text style={[styles.eyebrow, { color: meta.color }]}>TODAY</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.title}
        >
          {meta.label}
        </Text>
        <Text style={styles.meta}>
          {meta.group.toUpperCase()} · {exerciseCount} {exerciseCount === 1 ? 'EXERCISE' : 'EXERCISES'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <Text style={[styles.tapLabel, { color: meta.color }]}>START YOUR WORKOUT</Text>
        <Animated.View
          style={[
            styles.playButton,
            { backgroundColor: meta.color, shadowColor: meta.color },
            buttonStyle,
          ]}
        >
          <Zap
            color={redesignColors.ink}
            fill={redesignColors.ink}
            size={26}
            strokeWidth={2.5}
          />
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 246,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1.25,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    justifyContent: 'space-between',
    backgroundColor: redesignColors.surface,
  },
  eyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    letterSpacing: 2.2,
    marginBottom: 14,
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.6,
    color: redesignColors.bone,
    marginBottom: 10,
  },
  meta: {
    fontFamily: redesignFonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.35,
    color: redesignColors.ash,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: redesignColors.hi,
    marginTop: 19,
    marginBottom: 17,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.65,
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
