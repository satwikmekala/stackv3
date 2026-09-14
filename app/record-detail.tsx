import { useMemo } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { DEFAULT_WEIGHT_UNIT, readExerciseRecordSetsSync } from '@/store/workoutDatabase';
import { deriveRecentLifts, getCurrentBest } from '@/store/personalRecords';
import { formatWeight, unitLabel } from '@/store/weightUnits';
import '@/global.css';

function formatRecordDate(date: Date, weekday = false) {
  return date.toLocaleDateString('en-US', {
    ...(weekday ? { weekday: 'short' as const } : {}),
    month: 'short', day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  }).toUpperCase();
}

export default function RecordDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ exerciseName?: string | string[] }>();
  const exerciseName = (Array.isArray(params.exerciseName) ? params.exerciseName[0] : params.exerciseName) ?? '';
  const sessions = useWorkoutStore((state) => state.sessions);
  const weightUnit = useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);
  const sets = useMemo(() => exerciseName ? readExerciseRecordSetsSync(exerciseName, sessions) : [], [exerciseName, sessions]);
  const best = useMemo(() => getCurrentBest(sets), [sets]);
  const sections = useMemo(() => deriveRecentLifts(sets).map((group) => ({ ...group, data: group.sets })), [sets]);
  const back = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/records');
  };

  return (
    <View style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(set) => set.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back to personal records" onPress={back} style={styles.backButton}>
                <ChevronLeft color={redesignColors.bone} size={23} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={styles.title}>{exerciseName || 'Exercise records'}</Text>
                <Text style={styles.subtitle}>{sets.length} SETS LOGGED</Text>
              </View>
            </View>
            {best ? (
              <View style={styles.bestCard}>
                <View style={styles.bestCopy}>
                  <Text style={styles.label}>CURRENT BEST</Text>
                  <Text style={styles.bestWeight}>
                    {best.weight === 0 ? 'BW' : formatWeight(best.weight, weightUnit)}
                    <Text style={styles.bestReps}>{best.weight === 0 ? '' : ` ${unitLabel(weightUnit)}`} × {best.reps}</Text>
                  </Text>
                </View>
                <View style={styles.bestDate}>
                  <Text style={styles.label}>SET ON</Text>
                  <Text style={styles.dateText}>{formatRecordDate(best.date)}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.sectionHeading}>
              <Text style={styles.label}>RECENT LIFTS</Text>
              <View style={styles.rule} />
            </View>
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dateHeader}>
            <Text accessibilityRole="header" style={styles.dateText}>{formatRecordDate(section.date, true)}</Text>
            {section.hasPR ? <Text accessibilityLabel="Personal record set on this date" style={styles.prLabel}>PR</Text> : null}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            accessibilityLabel={`Set ${item.setIndex + 1}, ${item.weight === 0 ? 'bodyweight' : `${formatWeight(item.weight, weightUnit)} ${unitLabel(weightUnit)}`}, ${item.reps} reps${item.isPR ? ', personal record' : ''}`}
            style={[styles.setRow, index < section.data.length - 1 && styles.setBorder]}>
            <Text style={[styles.setLabel, item.isPR && styles.accent]}>SET {item.setIndex + 1}</Text>
            <Text style={[styles.setWeight, item.isPR && styles.accent]}>
              {item.weight === 0 ? 'BW' : formatWeight(item.weight, weightUnit)}
              {item.weight !== 0 ? <Text style={item.isPR ? styles.accent : styles.muted}> {unitLabel(weightUnit)}</Text> : null}
            </Text>
            <Text style={[styles.setReps, item.isPR && styles.accent]}>× {item.reps}</Text>
          </View>
        )}
        renderSectionFooter={() => <View style={styles.groupGap} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No sets logged yet</Text>
            <Text style={styles.emptyCopy}>Completed sets for this exercise will appear here after a workout.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  content: { flexGrow: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  backButton: { width: 44, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginLeft: -4 },
  headerCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  title: { fontFamily: redesignFonts.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.8, color: redesignColors.bone },
  subtitle: { marginTop: 6, fontFamily: redesignFonts.mono, fontSize: 11, color: redesignColors.ash },
  bestCard: { marginTop: 24, padding: 17, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center',
    borderRadius: 18, borderWidth: 1, borderColor: redesignColors.border, borderTopWidth: 2,
    borderTopColor: redesignColors.accent, backgroundColor: redesignColors.surface },
  bestCopy: { flexGrow: 1 },
  label: { fontFamily: redesignFonts.mono, fontSize: 10, letterSpacing: 2.1, color: redesignColors.ash },
  bestWeight: { marginTop: 5, fontFamily: redesignFonts.monoBold, fontSize: 30, color: redesignColors.bone },
  bestReps: { fontSize: 14, color: redesignColors.accent },
  bestDate: { gap: 8, alignItems: 'flex-end' },
  dateText: { fontFamily: redesignFonts.monoBold, fontSize: 13, color: redesignColors.bone },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 26, marginBottom: 12 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: redesignColors.border },
  dateHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: redesignColors.border },
  prLabel: { fontFamily: redesignFonts.mono, fontSize: 11, color: redesignColors.accent },
  setRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  setBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: redesignColors.border },
  setLabel: { minWidth: 38, fontFamily: redesignFonts.mono, fontSize: 11, color: redesignColors.ashDim },
  setWeight: { flex: 1, fontFamily: redesignFonts.monoBold, fontSize: 15, color: redesignColors.bone },
  setReps: { fontFamily: redesignFonts.monoBold, fontSize: 15, color: redesignColors.ash },
  muted: { color: redesignColors.ash },
  accent: { color: redesignColors.accent },
  groupGap: { height: 23 },
  emptyState: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontFamily: redesignFonts.uiBold, fontSize: 19, color: redesignColors.bone },
  emptyCopy: { marginTop: 10, textAlign: 'center', fontFamily: redesignFonts.ui, fontSize: 15, lineHeight: 22, color: redesignColors.ash },
});
