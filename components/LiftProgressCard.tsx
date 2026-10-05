import { displayExerciseName } from '@/constants/exerciseNames';
import { getMuscleColor } from '@/constants/muscleColors';
import { useMuscleColors } from '@/store/muscleColors';
/** @jsxImportSource react */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { type WeightUnit } from '@/store/weightUnits';
import { formatLiftDate, formatLiftPerformance, type LiftProgress } from '@/store/liftProgress';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';
import { LiftPerformanceValue } from '@/components/LiftPerformanceValue';

export function LiftProgressCard({ lift, unit, onPress }: { lift: LiftProgress; unit: WeightUnit; onPress: () => void }) {
  useMuscleColors(state => state.preferences);
  const workoutType = useWorkoutStore((state) => state.getExerciseWorkoutType)(lift.name);
  const color = workoutType ? getMuscleColor(workoutType) : redesignColors.bone;
  const { latest, previous } = lift;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${displayExerciseName(lift.name)}. Latest top set, ${formatLiftPerformance(latest, unit).replace('BW', 'bodyweight')}, ${formatLiftDate(latest.date)}.${previous
        ? ` Previous top set, ${formatLiftPerformance(previous, unit).replace('BW', 'bodyweight')}, ${formatLiftDate(previous.date)}.` : ''}`}
      accessibilityHint="Opens this exercise’s workout history"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <WorkoutCardSurface color={color} radius={24} />
      <View style={[styles.categoryMark, { backgroundColor: color }]} />
      <View style={styles.heading}>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.name}>{displayExerciseName(lift.name)}</Text>
        <ChevronRight color={redesignColors.ash} size={16} style={styles.chevron} />
      </View>
      <View style={styles.latest}>
        <Text style={styles.date}>{formatLiftDate(latest.date)}</Text>
        <LiftPerformanceValue performance={latest} unit={unit} color={color} />
      </View>
      {previous && <Text style={styles.previous}>
        <Text style={styles.previousLabel}>Prev </Text>{formatLiftPerformance(previous, unit)}
      </Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, minHeight: 172, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: redesignColors.surface },
  pressed: { opacity: 0.76 },
  categoryMark: { width: 28, height: 4, borderRadius: 2, marginBottom: 10 },
  heading: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  name: { flex: 1, fontFamily: redesignFonts.uiSemiBold, lineHeight: 22, fontSize: 16, color: redesignColors.bone },
  chevron: { marginTop: 3 },
  latest: { marginTop: 12, marginBottom: 8 },
  date: { fontFamily: redesignFonts.uiMedium, lineHeight: 18, fontSize: 12, color: redesignColors.bone, opacity: 0.75 },
  previous: { marginTop: 'auto', fontFamily: redesignFonts.uiMedium, lineHeight: 18, fontSize: 12, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  previousLabel: { fontFamily: redesignFonts.uiMedium, color: redesignColors.ash },
});
