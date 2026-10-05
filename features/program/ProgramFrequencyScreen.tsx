import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';
import { StackLogo } from '@/components/StackLogo';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import type { ThreeDayStructure } from '@/store/programPreferences';
import { programArrangement } from './lineup';

export function ProgramFrequencyScreen({ frequency, structure, busy, select, onboarding = true }: {
  onboarding?: boolean; frequency: number | null; structure: ThreeDayStructure; busy: boolean; select: (value: number) => void;
}) {
  const { fontScale } = useWindowDimensions();
  return <>
    <View key={`choices:${fontScale}`} style={styles.choices}>{[1, 2, 3, 4, 5, 6].map(value => <Pressable key={value} accessibilityRole="button"
      accessibilityLabel={`${value} ${value === 1 ? 'workout' : 'workouts'} per week`} accessibilityState={{ selected: frequency === value, disabled: busy }}
      disabled={busy} onPress={() => select(value)} style={[styles.number, frequency === value && styles.selected]}>
      <Text allowFontScaling={false} style={[styles.numberText, { fontSize: 30 * Math.min(fontScale, 1.5) }, frequency === value && { color: c.ink }]}>{value}</Text>
    </Pressable>)}</View>
    <View key={`arrangement:${fontScale}`} style={styles.arrangement}>
      <WorkoutCardSurface color={c.accent} radius={28} showEdge={false} />
      <View style={styles.heading}><Text style={styles.eyebrow}>WORKOUT ORDER</Text><StackLogo size={32} /></View>
      {frequency === null ? <Text style={styles.body}>Choose a number to see how your workouts fit together.</Text> : <>
        <Text style={styles.body}>{frequency} {frequency === 1 ? 'workout' : 'workouts'} {onboarding ? 'in your starting lineup.' : 'in Stack’s plan.'}</Text>
        <View style={styles.days}>{programArrangement(frequency, structure).map((day, index) => <View key={index} style={styles.day}>
          <View style={[styles.color, { backgroundColor: day.color }]} /><Text style={styles.dayText}>{index + 1} · {day.shortLabel}</Text>
        </View>)}</View>
        <Text style={styles.hint}>Train on the days that work for you.</Text>
      </>}
    </View>
  </>;
}
const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  number: { flexGrow: 1, flexBasis: '25%', minHeight: 62, backgroundColor: c.raised, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 12 },
  selected: { backgroundColor: c.accent }, numberText: { fontFamily: f.display, color: c.bone },
  arrangement: { borderRadius: 28, backgroundColor: c.surface, overflow: 'hidden', padding: 20, gap: 16 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: f.mono, fontSize: 11, color: c.ash, letterSpacing: 0.5 },
  body: { fontFamily: f.uiMedium, color: c.bone, fontSize: 18, lineHeight: 26 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { borderRadius: 12, backgroundColor: c.ink, overflow: 'hidden', flexGrow: 1 },
  color: { height: 5 }, dayText: { fontFamily: f.uiMedium, fontSize: 15, color: c.bone, padding: 12 },
  hint: { fontFamily: f.ui, color: c.ash, fontSize: 15, lineHeight: 22 },
});
