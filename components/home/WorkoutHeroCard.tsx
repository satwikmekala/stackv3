import { useMuscleColors } from '@/store/muscleColors';
import { TouchableOpacity, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useHomeDepartureStyle } from './HomeDeparture';
import { ArrowLeftRight, ArrowRight } from 'lucide-react-native';
import { ARCHETYPE_COMPOSITIONS, getSessionWorkoutDisplay, type Archetype } from '@/constants/archetypes';
import type { WorkoutType } from '@/store/workoutStore';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { StatusPill } from '@/components/StatusPill';
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';
import { SlideToStart } from './SlideToStart';
import { WorkoutCardSurface } from './WorkoutCardSurface';
import { StackLogo } from '@/components/StackLogo';

type WorkoutHeroCardProps = {
  type?: WorkoutType; archetypes?: Archetype[]; exerciseCount: number;
  onPress?: (origin?: WorkoutLaunchOrigin) => void; onChangeWorkout?: () => void;
  completed?: boolean; whenLabel?: string; title?: string; groupLabel?: string;
  accentColor?: string; hideStartButton?: boolean;
  actionLabel?: string; loading?: boolean;
  description?: string; showStackMark?: boolean; startWorkoutName?: string;
  resetKey?: number;
};

export function WorkoutHeroCard({ type, archetypes, exerciseCount, onPress, onChangeWorkout,
  completed = false, whenLabel = 'NEXT UP', title, groupLabel, accentColor,
  hideStartButton = false, actionLabel, loading = false, description, showStackMark = false, startWorkoutName, resetKey = 0 }: WorkoutHeroCardProps) {
  useMuscleColors(state => state.preferences);
  const { fontScale } = useWindowDimensions();
  const surfaceDeparture = useHomeDepartureStyle(0, 0.92, 0);
  const toplineDeparture = useHomeDepartureStyle(0.06, 0.72, 8);
  const identityDeparture = useHomeDepartureStyle(0.18, 0.9, 12);
  const primary = archetypes?.[0];
  const display = getSessionWorkoutDisplay({ archetype: primary ?? null,
    secondaryArchetype: archetypes?.length === 2 ? archetypes[1] : null, workoutTypes: type ? [type] : [] });
  const color = accentColor ?? display.color;
  const label = completed ? 'Nice work this week' : title ?? display.label;
  const group = groupLabel ?? (display.isMerged ? 'Combined workout' : primary
    ? ARCHETYPE_COMPOSITIONS[primary].shortLabel : type ? workoutMeta[type].group : 'Training');
  return <View style={styles.card}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.surface }, surfaceDeparture]}><WorkoutCardSurface color={color} /></Animated.View>
    <Animated.View key={`topline:${fontScale}`} style={[styles.topline, toplineDeparture]}>
      <StatusPill label={completed ? 'GOAL MET' : whenLabel} color={color} />
      {showStackMark && <View style={styles.stackMark} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><StackLogo size={36} /></View>}
      {onChangeWorkout && <TouchableOpacity activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Change workout"
        onPress={onChangeWorkout} style={styles.change}>
        <ArrowLeftRight color={c.ash} size={16} /><Text style={styles.changeText}>Change workout</Text>
      </TouchableOpacity>}
    </Animated.View>
    <Animated.View key={`identity:${fontScale}`} style={[styles.identity, identityDeparture]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={styles.title}>{label}</Text>
      <Text style={styles.meta}>{description ?? (completed ? 'Your weekly target is complete' : loading ? 'Loading your workout…'
        : `${group} · ${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}`)}</Text>
    </Animated.View>
    {onPress && (actionLabel || completed ? <TouchableOpacity key={`action:${fontScale}`} activeOpacity={0.7} accessibilityRole="button" onPress={() => onPress()}
      style={[styles.action, { backgroundColor: color }]}>
      <Text style={styles.actionText}>{actionLabel ?? 'Choose another workout'}</Text><ArrowRight size={22} color={c.ink} />
    </TouchableOpacity> : <SlideToStart key={`${label}:${resetKey}`} color={color} workoutName={startWorkoutName ?? label} onStart={onPress} hidden={hideStartButton} />)}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 36, borderCurve: 'continuous', paddingHorizontal: 20, paddingVertical: 22, overflow: 'hidden', gap: 18 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 12 },
  stackMark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  change: { maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  changeText: { fontFamily: f.uiMedium, fontSize: 14, color: c.ash, flexShrink: 1 },
  identity: { gap: 8 },
  title: { fontFamily: f.display, fontSize: 42, lineHeight: 46, letterSpacing: -1.3, color: c.bone },
  meta: { fontFamily: f.ui, fontSize: 16, lineHeight: 24, color: c.ash },
  action: { minHeight: 60, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  actionText: { flexShrink: 1, color: c.ink, fontFamily: f.uiSemiBold, fontSize: 17 },
  pressed: { opacity: 0.7 },
});
