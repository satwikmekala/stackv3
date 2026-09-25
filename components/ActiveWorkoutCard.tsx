import { ChevronUp } from 'lucide-react-native';
import {
  StyleSheet, Text, TouchableOpacity, View,
  type LayoutChangeEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import { ARCHETYPE_COMPOSITIONS } from '@/constants/archetypes';
import { redesignColors, redesignFonts, workoutLoggingColors } from '@/constants/theme';
import { useWorkoutStore, type WorkoutSession } from '@/store/workoutStore';
import { getCurrentWorkoutExerciseIndex } from '@/utils/workoutResume';

export function ActiveWorkoutCard({ session, onPress, onLayout, style }: {
  session: WorkoutSession;
  onPress?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const workoutFocus = useWorkoutStore((state) => state.workoutFocus);
  const exercise = session.exercises[getCurrentWorkoutExerciseIndex(session, workoutFocus)];
  const nextSetIndex = exercise?.sets.findIndex((set) => !set.completed) ?? -1;
  const progress = nextSetIndex >= 0
    ? `Set ${nextSetIndex + 1} of ${exercise.sets.length}`
    : 'Ready to finish';
  const accent = session.archetype
    ? ARCHETYPE_COMPOSITIONS[session.archetype].color
    : workoutLoggingColors[session.workoutTypes[0]];

  return (
    <TouchableOpacity
      testID="active-workout-bar"
      accessibilityRole="button"
      accessibilityLabel={`Resume workout, ${exercise?.name ?? 'Active workout'}, ${progress}`}
      onPress={onPress}
      onLayout={onLayout}
      disabled={!onPress}
      activeOpacity={0.8}
      style={[styles.bar, { borderColor: accent, shadowColor: accent }, style]}
    >
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.exercise}>{exercise?.name ?? 'Active workout'}</Text>
        <Text style={styles.progress}>{progress}</Text>
      </View>
      <Text style={[styles.resume, { color: accent }]}>Resume</Text>
      <ChevronUp color={accent} size={18} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 2,
    backgroundColor: redesignColors.surface,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 14,
  },
  details: { flex: 1, minWidth: 0, gap: 3 },
  exercise: { fontFamily: redesignFonts.uiSemiBold, fontSize: 15, color: redesignColors.bone },
  progress: { fontFamily: redesignFonts.ui, fontSize: 13, color: redesignColors.ash },
  resume: { fontFamily: redesignFonts.uiSemiBold, fontSize: 13 },
});
