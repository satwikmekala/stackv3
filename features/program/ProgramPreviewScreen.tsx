import { displayExerciseName } from '@/constants/exerciseNames';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { workoutMeta } from '@/constants/workouts';
import type { ThreeDayStructure } from '@/store/programPreferences';
import type { ProgramWorkout } from './lineup';

function WorkoutPreview({ day, onboarding }: { day: ProgramWorkout; onboarding: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { fontScale } = useWindowDimensions();
  return <View style={styles.workout}>
    <WorkoutCardSurface color={day.color} radius={24} showEdge={false} />
    <Pressable key={`heading:${fontScale}`} accessibilityRole="button" accessibilityLabel={`${day.name}, ${day.exercises.length} exercises`}
      accessibilityHint={expanded ? 'Collapse exercise list' : 'Expand exercise list'} accessibilityState={{ expanded }}
      onPress={() => setExpanded(value => !value)} style={styles.workoutHeading}>
      <View style={{ flex: 1, gap: 6 }}><Text allowFontScaling={false} style={[styles.workoutName, { fontSize: 26 * Math.min(fontScale, 1.5), lineHeight: 30 * Math.min(fontScale, 1.5) }]}>{day.name}</Text>
        <Text style={styles.meta}>{day.exercises.length} exercises</Text></View>
      {expanded ? <ChevronUp color={c.bone} size={22} /> : <ChevronDown color={c.bone} size={22} />}
    </Pressable>
    {expanded && <View key={`exercises:${fontScale}`} style={styles.exercises}>{day.exercises.map((exercise, index) => <View key={`${exercise.id}:${index}`} style={styles.exercise}>
      <View style={[styles.dot, { backgroundColor: workoutMeta[exercise.workoutType].color }]} />
      <View style={{ flex: 1, gap: 3 }}><Text style={styles.exerciseName}>{onboarding ? exercise.name : displayExerciseName(exercise.name)}</Text><Text style={styles.meta}>{exercise.primaryMuscle}</Text></View>
    </View>)}</View>}
  </View>;
}
export function ProgramPreviewScreen({ frequency, structure, busy, selectStructure, lineup, loading, error, retry, onboarding = true }: {
  onboarding?: boolean; frequency: number | null; structure: ThreeDayStructure; busy: boolean; selectStructure: (value: ThreeDayStructure) => void;
  lineup: ProgramWorkout[]; loading: boolean; error: string | null; retry: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  return <>
    {frequency === 3 && <View key={`structures:${fontScale}`} style={styles.structures}>
      <Text style={styles.label}>Choose how the three workouts fit together.</Text>
      {[{ value: 'full-body', name: 'Full body', copy: 'Train your whole body in each workout.' },
        { value: 'push-pull-legs', name: 'Push / Pull / Legs', copy: 'Separate pushing lifts, pulling lifts, and legs into their own workouts.' }].map(option =>
        <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.name} accessibilityHint={option.copy}
          accessibilityState={{ selected: structure === option.value, disabled: busy }} disabled={busy}
          onPress={() => selectStructure(option.value as ThreeDayStructure)} style={[styles.structure, structure === option.value && styles.selected]}>
          <View style={styles.structureHeading}><Text style={styles.structureTitle}>{option.name}</Text>{structure === option.value && <Check color={c.accent} size={20} />}</View>
          <Text style={styles.meta}>{option.copy}</Text>
        </Pressable>)}
    </View>}
    <Text key={`hint:${fontScale}`} style={styles.label}>Open a workout to see its exercises. You can change these later.</Text>
    {loading && <ActivityIndicator color={c.accent} accessibilityLabel="Loading your workouts" />}
    {error && <View style={{ gap: 4 }}><Text accessibilityRole="alert" style={styles.label}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.label}>Try loading again</Text></Pressable></View>}
    {lineup.map(day => <WorkoutPreview key={day.key} day={day} onboarding={onboarding} />)}
  </>;
}
const styles = StyleSheet.create({
  label: { fontFamily: f.ui, fontSize: 16, lineHeight: 23, color: c.ash },
  structures: { gap: 10 }, structure: { borderRadius: 20, backgroundColor: c.raised, padding: 16, gap: 6, minHeight: 44 },
  selected: { backgroundColor: '#FF7A3D18' }, structureHeading: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  structureTitle: { fontFamily: f.uiSemiBold, fontSize: 18, color: c.bone, flex: 1 },
  workout: { backgroundColor: c.surface, borderRadius: 24, overflow: 'hidden' },
  workoutHeading: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 20, minHeight: 60 },
  workoutName: { fontFamily: f.display, color: c.bone }, meta: { fontFamily: f.ui, fontSize: 15, lineHeight: 22, color: c.ash },
  exercises: { gap: 16, paddingHorizontal: 20, paddingBottom: 20 }, exercise: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dot: { width: 5, height: 24, borderRadius: 3 }, exerciseName: { fontFamily: f.uiSemiBold, fontSize: 17, color: c.bone },
  retry: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignSelf: 'flex-start' },
});
