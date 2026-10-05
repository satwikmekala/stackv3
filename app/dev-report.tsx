import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { redesignColors, redesignFonts } from '@/constants/theme';
import { REPORT_FIXTURES } from '@/features/report/reportFixtures';
import { buildWorkoutReport } from '@/features/report/workoutReport';
import { WorkoutReportView } from '@/features/report/WorkoutReportView';
import type { WeightUnit } from '@/store/weightUnits';

/** Dev-only visual QA for the workout report against representative fixtures. */
export default function DevReportPreview() {
  const [key, setKey] = useState(REPORT_FIXTURES[0].key);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const fixture = REPORT_FIXTURES.find((item) => item.key === key) ?? REPORT_FIXTURES[0];
  const report = useMemo(
    () => buildWorkoutReport(fixture.session, { unit, ...(fixture.history ? { history: fixture.history } : {}) }),
    [fixture, unit]
  );

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.controls}>
        {REPORT_FIXTURES.map((item) => (
          <Pressable key={item.key} onPress={() => setKey(item.key)} style={[styles.chip, item.key === key && styles.chipOn]}>
            <Text style={[styles.chipText, item.key === key && styles.chipTextOn]}>{item.label}</Text>
          </Pressable>
        ))}
        {(['kg', 'lbs'] as const).map((value) => (
          <Pressable key={value} onPress={() => setUnit(value)} style={[styles.chip, value === unit && styles.chipOn]}>
            <Text style={[styles.chipText, value === unit && styles.chipTextOn]}>{value === 'lbs' ? 'lb' : value}</Text>
          </Pressable>
        ))}
      </View>
      <View testID="report-capture">
        <WorkoutReportView report={report} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  content: { alignItems: 'center', paddingVertical: 24 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: 360, marginBottom: 16 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: redesignColors.raised },
  chipOn: { backgroundColor: redesignColors.bone },
  chipText: { color: redesignColors.ash, fontFamily: redesignFonts.uiMedium, fontSize: 12 },
  chipTextOn: { color: redesignColors.ink },
});
