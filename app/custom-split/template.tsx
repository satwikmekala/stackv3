import { getProgramFrequency } from '@/store/trainingPreferences';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Action, Header, StackMark, ui } from '@/components/custom-split/ui';
import { redesignColors as c } from '@/constants/theme';
import { ARCHETYPE_COMPOSITIONS, getWeeklyArchetypeSequence, type Archetype } from '@/constants/archetypes';
import { getDraftPrefillRecommendation, useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { useWorkoutStore } from '@/store/workoutStore';
import { readArchetypeTemplateCatalogSync, readArchetypeVariantsSync } from '@/store/workoutDatabase';

export default function TemplatePreview() {
  const router = useRouter();
  const state = useCustomSplitDraftStore();
  const profile = useWorkoutStore(s => s.profile);
  const day = state.draft?.workouts.find(workout => workout.id === state.activeWorkoutId);
  const index = state.draft?.workouts.findIndex(workout => workout.id === day?.id) ?? 0;
  const sequence = profile ? getWeeklyArchetypeSequence(getProgramFrequency(profile), profile.threeDayStructure) : [];
  const [archetype, setArchetype] = useState<Archetype>(sequence[index] ?? 'full_body');
  const variants = readArchetypeVariantsSync(archetype);
  const recommendation = getDraftPrefillRecommendation(sequence, index, variants);
  const variant = recommendation?.archetype === archetype ? recommendation.variant : variants[0];
  const exercises = variant ? readArchetypeTemplateCatalogSync(archetype, variant) : [];
  return <SafeAreaView style={ui.screen}>
    <Header title="Stack workouts" left={<Action title="Cancel" compact onPress={() => router.back()} />} />
    <ScrollView contentContainerStyle={ui.content}>
      <View style={ui.section}><StackMark /><Text style={ui.title}>A starting point.</Text><Text style={ui.body}>Pick a workout. Add it to your workout, then make it yours.</Text></View>
      <View accessibilityRole="radiogroup" style={ui.wrap}>{(Object.keys(ARCHETYPE_COMPOSITIONS) as Archetype[]).map(type => <Pressable key={type}
        accessibilityRole="radio" accessibilityLabel={ARCHETYPE_COMPOSITIONS[type].shortLabel} accessibilityState={{ selected: type === archetype }}
        style={({ pressed }) => [ui.dayTab, { backgroundColor: type === archetype ? c.raised : c.surface }, pressed && ui.pressed]} onPress={() => setArchetype(type)}>
        <Text style={ui.actionText}>{ARCHETYPE_COMPOSITIONS[type].shortLabel}</Text>{type === archetype ? <Check color={c.bone} size={16} /> : null}
      </Pressable>)}</View>
      <View style={ui.card}>
        <Text style={ui.subtitle}>{ARCHETYPE_COMPOSITIONS[archetype].shortLabel}</Text>
        <Text style={ui.label}>{exercises.length} exercises · Preview</Text>
        {exercises.map((exercise, position) => <View key={exercise.id} style={[ui.row, { alignItems: 'flex-start', paddingVertical: 4 }]}>
          <Text style={[ui.number, { paddingTop: 3 }]}>{String(position + 1).padStart(2, '0')}</Text><Text style={[ui.body, { flex: 1, color: c.bone }]}>{exercise.name}</Text>
        </View>)}
        {!exercises.length ? <Text style={ui.body}>This template is unavailable. Choose another workout or add your own exercises.</Text> : null}
      </View>
      {day?.exercises.length ? <Text style={ui.body}>This workout already has exercises. Start with an empty workout to use a Stack workout.</Text> : null}
    </ScrollView>
    <View style={ui.dock}><Action title="Use this workout" primary disabled={!day || !!day.exercises.length || !exercises.length}
      onPress={() => { if (day && !day.exercises.length) { state.mergePrefill(day.id, exercises); router.back(); } }} /></View>
  </SafeAreaView>;
}
