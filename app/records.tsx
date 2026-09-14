/** @jsxImportSource react */
// This StyleSheet-only screen uses native Pressable callbacks, including the unchanged FilterChip.
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Search, CircleX } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { DEFAULT_WEIGHT_UNIT, readExerciseCatalogSync } from '@/store/workoutDatabase';
import { formatWeight, unitLabel } from '@/store/weightUnits';
import {
  derivePersonalRecords, filterPersonalRecords, getRecordMuscle,
  highlightExerciseName, MUSCLE_GROUPS, type MuscleGroup,
} from '@/store/personalRecords';
import '@/global.css';

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${label.toLowerCase()} records`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? '#FF7A3D' : '#1D1915',
          borderColor: selected ? '#FF7A3D' : '#71685E',
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.filterText, { color: selected ? '#13110E' : '#F5F0E8' }]}>{label}</Text>
    </Pressable>
  );
}

export default function PersonalRecords() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = useWorkoutStore((state) => state.sessions);
  const weightUnit = useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
  const records = useMemo(() => {
    const catalog = new Map(readExerciseCatalogSync().map((exercise) => [exercise.name, exercise]));
    return derivePersonalRecords(sessions).map((record) => ({
      ...record, muscle: getRecordMuscle(catalog.get(record.name)),
    }));
  }, [sessions]);
  const { normalizedQuery, muscles, visibleRecords } = useMemo(
    () => filterPersonalRecords(records, query, selectedMuscles), [records, query, selectedMuscles]
  );
  const filtering = Boolean(normalizedQuery) || selectedMuscles.length > 0;
  const tap = (callback: () => void) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    callback();
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    // A hidden selected chip must never silently exclude the new search results.
    const available = filterPersonalRecords(records, value, []).muscles;
    setSelectedMuscles((selected) => selected.filter((muscle) => available.includes(muscle)));
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleRecords}
        keyExtractor={(record) => record.name}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back to progress"
                onPress={() => tap(() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
                style={styles.backButton}>
                <ChevronLeft color={redesignColors.bone} size={23} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={styles.title}>Personal Records</Text>
                <Text accessibilityLiveRegion="polite" style={[styles.subtitle, filtering && styles.accent]}>
                  {filtering ? `${visibleRecords.length} OF ${records.length} SHOWING` : `${records.length} EXERCISES TRACKED`}
                </Text>
              </View>
            </View>
            <View style={[styles.search, (focused || Boolean(normalizedQuery)) && styles.searchActive]}>
              <Search size={18} color={focused || normalizedQuery ? redesignColors.accent : redesignColors.ashDim} />
              <TextInput accessibilityLabel="Search exercises" placeholder="Search exercises"
                placeholderTextColor={redesignColors.ashDim} value={query} onChangeText={updateQuery}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                autoCapitalize="none" autoCorrect={false} returnKeyType="search"
                selectionColor={redesignColors.accent} style={styles.searchInput} />
              {query.length > 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear exercise search"
                  onPress={() => updateQuery('')} hitSlop={8} style={styles.clearButton}>
                  <CircleX size={17} color={redesignColors.ash} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.filters} style={styles.filterScroll}>
              <FilterChip label="All" selected={selectedMuscles.length === 0} onPress={() => tap(() => setSelectedMuscles([]))} />
              {muscles.map((muscle) => (
                <FilterChip key={muscle} label={MUSCLE_GROUPS[muscle].label} selected={selectedMuscles.includes(muscle)}
                  onPress={() => tap(() => setSelectedMuscles((selected) => selected.includes(muscle)
                    ? selected.filter((value) => value !== muscle) : [...selected, muscle]))} />
              ))}
            </ScrollView>
            <View style={styles.columns}>
              <Text style={styles.columnLabel}>EXERCISE</Text>
              <View style={styles.rule} />
              <Text style={styles.columnLabel}>BEST SET</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name} recent lifts`}
            onPress={() => tap(() => router.push({ pathname: '/record-detail', params: { exerciseName: item.name } }))}
            style={({ pressed }) => [styles.recordRow, pressed && styles.pressed]}>
            <View style={[styles.dot, { backgroundColor: MUSCLE_GROUPS[item.muscle].color }]} />
            <Text style={styles.exerciseName}>
              {highlightExerciseName(item.name, normalizedQuery).map((part, index) => (
                <Text key={index} style={part.matched ? { backgroundColor: `${MUSCLE_GROUPS[item.muscle].color}40` } : undefined}>
                  {part.text}
                </Text>
              ))}
            </Text>
            <Text style={styles.performance}>
              {item.best.weight === 0 ? 'BW' : formatWeight(item.best.weight, weightUnit)}
              <Text style={styles.muted}>{item.best.weight === 0 ? '' : ` ${unitLabel(weightUnit)}`} × {item.best.reps}</Text>
            </Text>
            <ChevronRight size={16} color={redesignColors.ashDim} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{records.length === 0 ? 'No exercises logged yet' : 'No exercises found'}</Text>
            <Text style={styles.emptyCopy}>{records.length === 0
              ? 'Complete a workout to start tracking your personal records.'
              : normalizedQuery ? `No matches for “${query.trim()}”. Try another name or clear your filters.`
                : 'Try another muscle group or clear your filters.'}</Text>
            {filtering && records.length > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => { setQuery(''); setSelectedMuscles([]); }} style={styles.resetButton}>
                <Text style={styles.resetText}>Clear search and filters</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  backButton: { width: 44, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  headerCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  title: { fontFamily: redesignFonts.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: redesignColors.bone },
  subtitle: { marginTop: 5, fontFamily: redesignFonts.mono, fontSize: 10, letterSpacing: 1.8, color: redesignColors.ash },
  accent: { color: redesignColors.accent },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, minHeight: 49, paddingHorizontal: 15,
    borderWidth: 1, borderColor: redesignColors.border, borderRadius: 16, backgroundColor: redesignColors.surface },
  searchActive: { borderColor: redesignColors.accent },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: redesignFonts.uiSemiBold, fontSize: 16, color: redesignColors.bone },
  clearButton: { minHeight: 44, justifyContent: 'center' },
  filterScroll: { marginTop: 13 },
  filters: { gap: 8, paddingBottom: 2 },
  filterChip: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#71685E',
    backgroundColor: redesignColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: redesignColors.bone,
  },
  columns: { marginTop: 23, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  columnLabel: { fontFamily: redesignFonts.mono, fontSize: 10, letterSpacing: 2, color: redesignColors.ash },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: redesignColors.border },
  recordRow: { minHeight: 54, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: redesignColors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  exerciseName: { flex: 1, fontFamily: redesignFonts.uiSemiBold, fontSize: 16, lineHeight: 21, color: redesignColors.bone },
  performance: { flexShrink: 0, fontFamily: redesignFonts.monoBold, fontSize: 13, color: redesignColors.bone },
  muted: { color: redesignColors.ash },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 48 },
  emptyTitle: { fontFamily: redesignFonts.uiBold, fontSize: 19, color: redesignColors.bone },
  emptyCopy: { marginTop: 10, textAlign: 'center', fontFamily: redesignFonts.ui, fontSize: 15, lineHeight: 22, color: redesignColors.ash },
  resetButton: { minHeight: 48, justifyContent: 'center', marginTop: 12 },
  resetText: { fontFamily: redesignFonts.uiBold, fontSize: 15, color: redesignColors.accent },
});
