import { displayExerciseName } from '@/constants/exerciseNames';
import { getMuscleColor } from '@/constants/muscleColors';
import { useMuscleColors } from '@/store/muscleColors';
/** @jsxImportSource react */
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronRight, Search } from 'lucide-react-native';
import * as Haptics from '@/services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { deriveLiftProgress, formatLiftDate, formatLiftPerformance, liftComparisonCopy,
  LIFT_PROGRESS_SORTS, liftImprovementCopy, sortLiftProgress, type LiftProgressSort } from '@/store/liftProgress';
import { loadLiftProgressPreferences, saveWatchedLifts } from '@/store/liftProgressPreferences';
import { useWatchedLifts } from '@/hooks/useWatchedLifts';

export default function AllLiftProgress() {
  useMuscleColors(state => state.preferences);
  const router = useRouter();
  const { choose } = useLocalSearchParams<{ choose?: string }>();
  const choosing = choose === '1';
  const insets = useSafeAreaInsets();
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);
  const getWorkoutType = useWorkoutStore((state) => state.getExerciseWorkoutType);
  const lifts = useMemo(() => deriveLiftProgress(sessions), [sessions]);
  const { names, preferences } = useWatchedLifts(lifts);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LiftProgressSort>('recent');
  const selected = draft ?? names;
  const visible = useMemo(() => sortLiftProgress(lifts.filter((lift) =>
    lift.name.toLowerCase().includes(query.trim().toLowerCase())), sort), [lifts, query, sort]);
  const blocked = !preferences.hydrated || preferences.saving || preferences.error === 'load';
  const done = async () => {
    if (await saveWatchedLifts(selected)) {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      router.back();
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, title: choosing ? 'Choose exercises' : 'Lift progress',
        headerStyle: { backgroundColor: redesignColors.ink }, headerTintColor: redesignColors.bone,
        headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerBackTitle: 'Back',
        headerRight: choosing ? () => <Pressable accessibilityRole="button" accessibilityLabel="Save featured exercises"
          accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={() => void done()}
          style={({ pressed }) => [styles.done, (pressed || blocked) && styles.dimmed]}>
          <Text style={styles.doneLabel}>{preferences.saving ? 'Saving…' : 'Done'}</Text>
        </Pressable> : undefined }} />
      <FlatList data={visible} keyExtractor={(lift) => lift.name}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={<>
          <Text style={styles.intro}>{choosing
            ? selected.length === 2 ? 'Two exercises selected. Deselect one to choose another.' : 'Choose up to two exercises to follow on Progress.'
            : 'Your latest top sets.'}</Text>
          {choosing && preferences.error && <View style={styles.error}>
            <Text accessibilityRole="alert" style={styles.copy}>{preferences.error === 'load'
              ? 'Couldn’t load your choices. Retry before changing them.' : 'Your choices weren’t saved. Tap Done to try again.'}</Text>
            {preferences.error === 'load' && <Pressable accessibilityRole="button" onPress={() => void loadLiftProgressPreferences()} style={styles.done}>
              <Text style={styles.doneLabel}>Retry</Text>
            </Pressable>}
          </View>}
          <View style={styles.search}>
            <Search size={18} color={redesignColors.ash} />
            <TextInput accessibilityLabel="Search lift progress" value={query} onChangeText={setQuery}
              placeholder="Search exercises" placeholderTextColor={redesignColors.ash} autoCapitalize="none" autoCorrect={false}
              returnKeyType="search" style={styles.searchInput} />
            {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}>
              <Text style={styles.clearLabel}>Clear</Text>
            </Pressable>}
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel="Sort lift progress" style={styles.sorts}>
            {LIFT_PROGRESS_SORTS.map((option) => <Pressable key={option.value}
              accessibilityRole="radio" accessibilityLabel={option.label}
              accessibilityState={{ checked: sort === option.value }}
              onPress={() => {
                if (sort === option.value) return;
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setSort(option.value);
              }} style={({ pressed }) => [styles.sortChip, sort === option.value && styles.sortChipSelected,
                pressed && styles.dimmed]}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}
                style={[styles.sortLabel, sort === option.value && styles.sortLabelSelected]}>{option.label}</Text>
            </Pressable>)}
          </View>
        </>}
        renderItem={({ item }) => {
          const workoutType = getWorkoutType(item.name);
          const color = workoutType ? getMuscleColor(workoutType) : redesignColors.bone;
          const checked = selected.includes(item.name);
          const disabled = choosing && (blocked || (!checked && selected.length >= 2));
          return <Pressable accessibilityRole={choosing ? 'checkbox' : 'button'}
            accessibilityState={choosing ? { checked, disabled } : undefined}
            accessibilityLabel={choosing ? item.name : `${displayExerciseName(item.name)}. Latest ${formatLiftPerformance(item.latest, unit)}. ${sort === 'improved'
              ? liftImprovementCopy(item) : sort === 'trained' ? `${item.history.length} workouts logged` : liftComparisonCopy(item, unit)}`}
            accessibilityHint={choosing ? 'Choose whether to feature this exercise on Progress' : 'Opens this exercise’s workout history'}
            disabled={disabled} onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              if (choosing) setDraft(checked ? selected.filter((name) => name !== item.name) : [...selected, item.name]);
              else router.push({ pathname: '/lift-detail', params: { exerciseName: item.name } });
            }} style={({ pressed }) => [styles.row, pressed && styles.dimmed, disabled && styles.dimmed]}>
            <View style={styles.rowCopy}>
              <Text style={styles.name}>{displayExerciseName(item.name)}</Text>
              <Text style={[styles.performance, { color }]}>{formatLiftPerformance(item.latest, unit)}<Text style={styles.date}> · {formatLiftDate(item.latest.date)}</Text></Text>
              {sort === 'improved' ? <Text style={styles.copy}>{liftImprovementCopy(item)}</Text>
                : sort === 'trained' ? <Text style={styles.copy}>{item.history.length} {item.history.length === 1 ? 'workout' : 'workouts'} logged</Text>
                : item.previous && <Text style={styles.copy}>{liftComparisonCopy(item, unit)}</Text>}
            </View>
            {choosing ? <View style={[styles.checkbox, checked && styles.checked]}>
              {checked && <Check size={16} strokeWidth={3} color={redesignColors.ink} />}
            </View> : <ChevronRight size={20} color={redesignColors.ash} />}
          </Pressable>;
        }}
        ListEmptyComponent={<View style={styles.empty}>
          <Text style={styles.emptyTitle}>{query.trim() ? 'No matching exercises' : 'No lift workouts yet'}</Text>
          <Text style={styles.copy}>{query.trim() ? 'Try another exercise name.' : 'Completed sets will appear here after a workout.'}</Text>
          {query.trim() ? <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.done}><Text style={styles.doneLabel}>Clear search</Text></Pressable>
            : <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)')} style={styles.done}><Text style={styles.doneLabel}>Go to Train</Text></Pressable>}
        </View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  content: { paddingHorizontal: 24, paddingTop: 16, flexGrow: 1 },
  intro: { fontFamily: redesignFonts.ui, lineHeight: 22, fontSize: 15, color: redesignColors.ash, marginBottom: 18 },
  done: { minWidth: 44, minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  doneLabel: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 23, fontSize: 16, color: redesignColors.bone },
  dimmed: { opacity: 0.55 },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, borderRadius: 14, backgroundColor: redesignColors.surface, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: redesignFonts.ui, lineHeight: 23, fontSize: 16, color: redesignColors.bone },
  clear: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  clearLabel: { fontFamily: redesignFonts.uiMedium, lineHeight: 19, fontSize: 13, color: redesignColors.ash },
  sorts: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 6 },
  sortChip: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 6, paddingVertical: 10, borderRadius: 22, borderWidth: 1,
    borderColor: redesignColors.ashDim, backgroundColor: redesignColors.surface, justifyContent: 'center', alignItems: 'center' },
  sortChipSelected: { backgroundColor: redesignColors.accent, borderColor: redesignColors.accent },
  sortLabel: { fontFamily: redesignFonts.uiSemiBold, fontSize: 13, lineHeight: 20, color: redesignColors.bone },
  sortLabelSelected: { color: redesignColors.ink },
  row: { paddingVertical: 20, minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: redesignColors.border },
  rowCopy: { flex: 1, minWidth: 0, gap: 7 },
  name: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 24, fontSize: 17, color: redesignColors.bone },
  performance: { fontFamily: redesignFonts.monoBold, lineHeight: 22, fontSize: 15, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  date: { fontFamily: redesignFonts.ui, lineHeight: 19, fontSize: 13, color: redesignColors.ash },
  copy: { fontFamily: redesignFonts.ui, lineHeight: 20, fontSize: 14, color: redesignColors.ash },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: redesignColors.ash, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: redesignColors.bone, borderColor: redesignColors.bone },
  error: { marginBottom: 14, gap: 8 },
  empty: { paddingVertical: 40, gap: 12, alignItems: 'flex-start' },
  emptyTitle: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 27, fontSize: 20, color: redesignColors.bone },
});
