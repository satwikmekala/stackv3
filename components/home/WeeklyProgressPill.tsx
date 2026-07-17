import { StyleSheet, Text, View } from 'react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';

type WeeklyProgressPillProps = {
  completed: number;
  goal: number;
  accent: string;
};

export function WeeklyProgressPill({ completed, goal, accent }: WeeklyProgressPillProps) {
  const visibleGoal = Math.max(1, Math.min(goal, 7));

  return (
    <View style={styles.pill} accessibilityLabel={`${completed} of ${goal} workouts completed this week`}>
      <View style={styles.countRow}>
        <Text style={styles.completed}>{completed}</Text>
        <Text style={styles.goal}>/{goal}</Text>
      </View>

      <View style={styles.bars}>
        {Array.from({ length: visibleGoal }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { backgroundColor: index < completed ? accent : redesignColors.hi },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 112,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  completed: {
    fontFamily: redesignFonts.mono,
    fontSize: 21,
    color: redesignColors.bone,
  },
  goal: {
    fontFamily: redesignFonts.mono,
    fontSize: 17,
    color: redesignColors.ashDim,
  },
  bars: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: 7,
    height: 24,
    borderRadius: 4,
  },
});
