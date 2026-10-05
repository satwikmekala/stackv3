import { displayExerciseName } from '@/constants/exerciseNames';
import { useMuscleColors } from '@/store/muscleColors';
/** @jsxImportSource react */
import { useMemo, useState } from 'react';
import { ActionSheetIOS, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from '@/services/haptics';
import { ArrowUpDown, Check, ChevronRight, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { DEFAULT_WEIGHT_UNIT, readExerciseCatalogSync } from '@/store/workoutDatabase';
import { formatLiftDate, formatLiftPerformance } from '@/store/liftProgress';
import {
  derivePersonalRecords, filterPersonalRecords, getRecordMuscle, highlightExerciseName,
  MUSCLE_GROUPS, PERSONAL_RECORD_SORTS, recordPerformance, sortPersonalRecords,
  type MuscleGroup, type PersonalRecordSort,
} from '@/store/personalRecords';
import '@/global.css';

const sortLabel = (sort: PersonalRecordSort) => PERSONAL_RECORD_SORTS.find((option) => option.value === sort)!.label;

/** Same chip as Lift progress sorting, so filters read as one control family. */
function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Show ${label.toLowerCase()} records`}
      accessibilityState={{ selected }} onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.dimmed]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function PersonalRecords() {
  useMuscleColors(state => state.preferences);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);
  const [query, setQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
  const [sort, setSort] = useState<PersonalRecordSort>('recent');
  const [showSort, setShowSort] = useState(false);
  const records = useMemo(() => {
    const catalog = new Map(readExerciseCatalogSync().map((exercise) => [exercise.name, exercise]));
    return derivePersonalRecords(sessions).map((record) => ({
      ...record, muscle: getRecordMuscle(catalog.get(record.name)),
    }));
  }, [sessions]);
  const { normalizedQuery, muscles, visibleRecords } = useMemo(
    () => filterPersonalRecords(records, query, selectedMuscles), [records, query, selectedMuscles]
  );
  const visible = useMemo(() => sortPersonalRecords(visibleRecords, sort), [visibleRecords, sort]);
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
  const chooseSort = (next: PersonalRecordSort) => {
    if (next !== sort) tap(() => setSort(next));
  };
  const openSort = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        title: 'Sort records', options: [...PERSONAL_RECORD_SORTS.map((option) => option.label), 'Cancel'],
        cancelButtonIndex: PERSONAL_RECORD_SORTS.length, userInterfaceStyle: 'dark',
      }, (index) => {
        if (index < PERSONAL_RECORD_SORTS.length) chooseSort(PERSONAL_RECORD_SORTS[index].value);
      });
    } else setShowSort(true);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{
        headerRight: records.length > 0 ? () => (
          <Pressable accessibilityRole="button" accessibilityLabel={`Sort records. ${sortLabel(sort)}`}
            onPress={openSort} hitSlop={6} style={({ pressed }) => [styles.headerButton, pressed && styles.dimmed]}>
            <ArrowUpDown size={20} color={redesignColors.bone} />
          </Pressable>
        ) : undefined,
      }} />
      <FlatList
        data={visible}
        keyExtractor={(record) => record.name}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={records.length > 0 ? <>
          <Text accessibilityLiveRegion="polite" style={styles.intro}>{filtering
            ? `${visible.length} of ${records.length} ${records.length === 1 ? 'exercise' : 'exercises'}`
            : sort === 'recent' ? 'Your best set for each exercise, newest record first.' : 'Your best set for each exercise.'}</Text>
          <View style={styles.search}>
            <Search size={18} color={redesignColors.ash} />
            <TextInput accessibilityLabel="Search personal records" value={query} onChangeText={updateQuery}
              placeholder="Search exercises" placeholderTextColor={redesignColors.ash} autoCapitalize="none" autoCorrect={false}
              returnKeyType="search" selectionColor={redesignColors.accent} style={styles.searchInput} />
            {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => updateQuery('')} style={styles.clear}>
              <Text style={styles.clearLabel}>Clear</Text>
            </Pressable>}
          </View>
          {muscles.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips} style={styles.chipScroll}>
            <FilterChip label="All" selected={selectedMuscles.length === 0} onPress={() => tap(() => setSelectedMuscles([]))} />
            {muscles.map((muscle) => (
              <FilterChip key={muscle} label={MUSCLE_GROUPS[muscle].label} selected={selectedMuscles.includes(muscle)}
                onPress={() => tap(() => setSelectedMuscles((selected) => selected.includes(muscle)
                  ? selected.filter((value) => value !== muscle) : [...selected, muscle]))} />
            ))}
          </ScrollView>}
        </> : null}
        renderItem={({ item }) => {
          const color = item.muscle === 'other' ? redesignColors.bone : MUSCLE_GROUPS[item.muscle].color;
          const performance = formatLiftPerformance(recordPerformance(item.best), unit);
          return (
            <Pressable accessibilityRole="button"
              accessibilityLabel={`${displayExerciseName(item.name)}. Personal record ${performance}, set ${formatLiftDate(item.achieved)}`}
              accessibilityHint="Opens how this record progressed"
              onPress={() => tap(() => router.push({ pathname: '/record-detail', params: { exerciseName: item.name } }))}
              style={({ pressed }) => [styles.row, pressed && styles.dimmed]}>
              <View style={styles.rowCopy}>
                <Text style={styles.name}>
                  {highlightExerciseName(displayExerciseName(item.name), normalizedQuery).map((part, index) => (
                    <Text key={index} style={part.matched ? { backgroundColor: `${MUSCLE_GROUPS[item.muscle].color}40` } : undefined}>
                      {part.text}
                    </Text>
                  ))}
                </Text>
                <Text style={[styles.performance, { color }]}>{performance}</Text>
                <Text style={styles.meta}>PR · {formatLiftDate(item.achieved)}</Text>
              </View>
              <ChevronRight size={20} color={redesignColors.ash} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{records.length === 0 ? 'No records yet' : 'No matching exercises'}</Text>
            <Text style={styles.copy}>{records.length === 0
              ? 'Your best set for each exercise will appear here after a workout.'
              : normalizedQuery ? `No records match “${query.trim()}”.` : 'Try another muscle group.'}</Text>
            {records.length === 0
              ? <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)')} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Go to Train</Text>
              </Pressable>
              : <Pressable accessibilityRole="button" onPress={() => { setQuery(''); setSelectedMuscles([]); }} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Clear search and filters</Text>
              </Pressable>}
          </View>
        }
      />
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss sort choices" onPress={() => setShowSort(false)} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={styles.menu}>
            <Text accessibilityRole="header" style={styles.menuTitle}>Sort records</Text>
            {PERSONAL_RECORD_SORTS.map((option) => <Pressable key={option.value} accessibilityRole="radio"
              accessibilityState={{ checked: option.value === sort }}
              onPress={() => { chooseSort(option.value); setShowSort(false); }}
              style={({ pressed }) => [styles.menuRow, pressed && styles.dimmed]}>
              <Text style={styles.menuLabel}>{option.label}</Text>
              {option.value === sort && <Check size={18} color={redesignColors.bone} />}
            </Pressable>)}
            <Pressable accessibilityRole="button" onPress={() => setShowSort(false)} style={styles.menuRow}>
              <Text style={styles.menuLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  content: { paddingHorizontal: 24, paddingTop: 16, flexGrow: 1 },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  intro: { fontFamily: redesignFonts.ui, lineHeight: 22, fontSize: 15, color: redesignColors.ash, marginBottom: 18 },
  dimmed: { opacity: 0.55 },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, borderRadius: 14, backgroundColor: redesignColors.surface, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: redesignFonts.ui, lineHeight: 23, fontSize: 16, color: redesignColors.bone },
  clear: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  clearLabel: { fontFamily: redesignFonts.uiMedium, lineHeight: 19, fontSize: 13, color: redesignColors.ash },
  chipScroll: { marginTop: 4, marginBottom: 6, marginHorizontal: -24 },
  chips: { gap: 8, paddingHorizontal: 24 },
  chip: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22, borderWidth: 1,
    borderColor: redesignColors.ashDim, backgroundColor: redesignColors.surface, justifyContent: 'center', alignItems: 'center' },
  chipSelected: { backgroundColor: redesignColors.accent, borderColor: redesignColors.accent },
  chipLabel: { fontFamily: redesignFonts.uiSemiBold, fontSize: 13, lineHeight: 20, color: redesignColors.bone },
  chipLabelSelected: { color: redesignColors.ink },
  row: { paddingVertical: 20, minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: redesignColors.border },
  rowCopy: { flex: 1, minWidth: 0, gap: 7 },
  name: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 24, fontSize: 17, color: redesignColors.bone },
  performance: { fontFamily: redesignFonts.monoBold, lineHeight: 22, fontSize: 15, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  meta: { fontFamily: redesignFonts.ui, lineHeight: 19, fontSize: 13, fontVariant: ['tabular-nums'], color: redesignColors.ash },
  copy: { fontFamily: redesignFonts.ui, lineHeight: 20, fontSize: 14, color: redesignColors.ash },
  empty: { paddingVertical: 40, gap: 12, alignItems: 'flex-start' },
  emptyTitle: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 27, fontSize: 20, color: redesignColors.bone },
  textButton: { minWidth: 44, minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  textButtonLabel: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 23, fontSize: 16, color: redesignColors.bone },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24, justifyContent: 'center' },
  menu: { padding: 20, borderRadius: 22, backgroundColor: redesignColors.surface },
  menuTitle: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 25, fontSize: 18, color: redesignColors.bone },
  menuRow: { minHeight: 48, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  menuLabel: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.bone },
});
