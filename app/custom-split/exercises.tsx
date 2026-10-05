import { displayExerciseName } from '@/constants/exerciseNames';
import { workoutEntryLabel } from '@/utils/content';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Circle, Plus, X } from 'lucide-react-native';
import { ExerciseSearchInput } from '@/components/ExerciseSearchInput';
import { Action, ui } from '@/components/custom-split/ui';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { CUSTOM_SPLIT_MUSCLE_GROUPS, getMuscleGroupForExercise, getWorkoutDisplayName, useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { readExerciseCatalogSync } from '@/store/workoutDatabase';

export default function ExercisePicker() {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const state = useCustomSplitDraftStore();
  const picker = state.picker;
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [catalog, setCatalog] = useState(() => readExerciseCatalogSync());
  useFocusEffect(useCallback(() => { setCatalog(readExerciseCatalogSync()); }, []));
  const day = state.draft?.workouts.find(workout => workout.id === picker?.workoutId);
  const close = useCallback(() => { useCustomSplitDraftStore.getState().closePicker(); router.back(); }, [router]);
  const nativeHeader = Platform.OS === 'ios';
  const expandedTitle = fontScale > 1.25;
  const title = useMemo(() => <Text accessibilityRole="header" style={{ fontFamily: f.uiBold, fontSize: 28, lineHeight: 34, color: c.bone }}>Add exercises</Text>, []);
  const headerOptions = useMemo(() => ({
    headerShown: true, title: '', headerTitle: '',
    headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone,
    headerShadowVisible: false, headerBackVisible: false,
    unstable_headerLeftItems: () => expandedTitle ? [] : [{ type: 'custom' as const, element: title, hidesSharedBackground: true }],
    unstable_headerRightItems: () => [{ type: 'button' as const, label: 'Close', accessibilityLabel: 'Close add exercises',
      icon: { type: 'sfSymbol' as const, name: 'xmark' as const }, onPress: close }],
  }), [close, expandedTitle, title]);
  const header = nativeHeader ? <Stack.Screen options={headerOptions} /> : <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
    <View style={{ flex: 1, paddingTop: 5 }}>{title}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Close add exercises" onPress={close}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }, pressed && ui.pressed]}>
      <X color={c.ash} size={20} />
    </Pressable>
  </View>;
  const edges = nativeHeader ? ['left', 'right', 'bottom'] as const : undefined;
  if (!picker || !day) return <SafeAreaView edges={edges} style={ui.screen}>{header}
    {nativeHeader && expandedTitle ? <View style={{ paddingHorizontal: 20 }}>{title}</View> : null}
    <Text style={[ui.body, { padding: 20 }]}>Open a workout to add exercises.</Text></SafeAreaView>;
  const pending = picker.pendingKey ? day.pendingImports?.find(item => item.key === picker.pendingKey) : undefined;
  const existing = new Set(day.exercises.map(exercise => exercise.id));
  const selected = new Set(picker.selected.map(exercise => exercise.id));
  const query = picker.query.trim().toLocaleLowerCase();
  const results = selectedOnly ? picker.selected : catalog.filter(exercise => (!picker.group || getMuscleGroupForExercise(exercise) === picker.group) && (exercise.name.toLocaleLowerCase().includes(query) || displayExerciseName(exercise.name).toLocaleLowerCase().includes(query)));
  const create = () => router.push({ pathname: '/custom-split/new-exercise', params: { workoutId: day.id, picker: '1', initialName: picker.query } });
  return <SafeAreaView edges={edges} style={ui.screen}>
    {header}
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>
        {nativeHeader && expandedTitle ? title : null}
        <Text style={ui.label}>{pending ? `Choose the exercise for “${pending.rawName}”` : `Choose lifts for ${getWorkoutDisplayName(day) || workoutEntryLabel(state.draft!.workouts.indexOf(day))}`}</Text>
        <ExerciseSearchInput style={{ marginTop: 0 }} value={picker.query} onChangeText={value => { setSelectedOnly(false); state.updatePicker({ query: value }); }} />
      </View>
      <View><ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 6 }}>
        {[null, ...CUSTOM_SPLIT_MUSCLE_GROUPS].map(group => <Pressable key={group ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: picker.group === group }} onPress={() => { setSelectedOnly(false); state.updatePicker({ group }); }}
          style={({ pressed }) => [ui.dayTab, picker.group === group && ui.selectedTab, pressed && ui.pressed]}><Text style={ui.actionText}>{group ?? 'All muscles'}</Text>{picker.group === group ? <Check color={c.bone} size={14} /> : null}</Pressable>)}
      </ScrollView></View>
      <FlatList data={results} keyExtractor={item => String(item.id)} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 4 }}
        ListHeaderComponent={<View style={[ui.wrap, { justifyContent: 'space-between', marginBottom: 8 }]}>
          <Text style={[ui.label, { flex: 1 }]}>{selectedOnly ? 'Selected exercises' : `${results.length} ${results.length === 1 ? 'exercise' : 'exercises'}`}</Text>
          <Action title="Create exercise" compact icon={<Plus color={c.ash} size={16} />} onPress={create} />
        </View>}
        ListEmptyComponent={<View style={{ gap: 12, paddingVertical: 24 }}><Text style={ui.subtitle}>No matching exercises</Text><Text style={ui.body}>Try another name or muscle group, or create your own exercise.</Text>
          {picker.group ? <Action title="Show all muscles" onPress={() => state.updatePicker({ group: null })} /> : null}<Action title="Create exercise" onPress={create} /></View>}
        renderItem={({ item }) => {
          const added = existing.has(item.id);
          const checked = selected.has(item.id);
          return <Pressable accessibilityRole="checkbox" accessibilityLabel={`${displayExerciseName(item.name)}${added ? ', already added' : ''}`} accessibilityState={{ checked: added || checked, disabled: added }} disabled={added}
            onPress={() => { state.updatePicker({ selected: checked ? picker.selected.filter(exercise => exercise.id !== item.id) : [...picker.selected, item] }); if (checked && picker.selected.length === 1) setSelectedOnly(false); }}
            style={({ pressed }) => [ui.listRow, { backgroundColor: checked ? c.surface : 'transparent', opacity: added ? 0.55 : pressed ? 0.65 : 1 }]}>
            <View style={{ flex: 1, gap: 4 }}><Text style={[ui.actionText, { textAlign: 'left' }]}>{displayExerciseName(item.name)}</Text><Text style={ui.label}>{added ? 'Already added' : `${getMuscleGroupForExercise(item)}${item.equipment ? ` · ${item.equipment}` : ''}`}</Text></View>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: checked ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {added || checked ? <Check color={checked ? c.ink : c.ash} size={18} /> : <Circle color={c.ash} size={24} strokeWidth={1.5} />}
            </View>
          </Pressable>;
        }} />
      <View style={ui.dock}>
        {picker.selected.length ? <View style={[ui.wrap, { justifyContent: 'space-between' }]}>
          <Action title={selectedOnly ? 'Browse all exercises' : `View selected (${picker.selected.length})`} compact onPress={() => setSelectedOnly(value => !value)} />
          <Action title="Clear" compact icon={<X color={c.ash} size={16} />} onPress={() => { state.updatePicker({ selected: [] }); setSelectedOnly(false); }} />
        </View> : null}
        <Action title={picker.selected.length ? `Add ${picker.selected.length} ${picker.selected.length === 1 ? 'exercise' : 'exercises'}` : 'Select exercises to add'} primary disabled={!picker.selected.length}
        onPress={() => {
          const [first, ...rest] = picker.selected;
          // Choosing for a pasted exercise puts the first pick in its place; any others are added as usual.
          if (pending && first) state.resolvePendingImport(day.id, pending.key, first);
          (pending ? rest : picker.selected).forEach(exercise => state.addExercise(day.id, exercise)); close();
        }} /></View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
