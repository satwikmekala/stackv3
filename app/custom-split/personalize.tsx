import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Action, Header, ui } from '@/components/custom-split/ui';
import { getMuscleColor, MUSCLE_COLOR_PALETTE, type MuscleColor } from '@/constants/muscleColors';
import { workoutMeta } from '@/constants/workouts';
import { loadMuscleColors, saveMuscleColor, useMuscleColors } from '@/store/muscleColors';
import { getWorkoutDisplayName, useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { redesignColors as c, splitColors } from '@/constants/theme';

export default function PersonalizeDay() {
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const state = useCustomSplitDraftStore();
  const colors = useMuscleColors();
  const day = state.draft?.workouts.find(workout => workout.id === state.activeWorkoutId);
  const muscles = [...new Set(day?.exercises.map(exercise => exercise.workoutType) ?? [])];
  return <SafeAreaView style={ui.screen}>
    <Header title="Settings" right={<Action title="Done" compact onPress={() => router.back()} />} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {day ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
        <View style={ui.section}>
          <View style={{ gap: 8 }}>
            <Text style={ui.label}>Workout name</Text>
            <TextInput accessibilityLabel="Workout name" autoFocus={focus === 'name'} maxLength={state.source === 'shared' ? 64 : 48} autoCapitalize="words" returnKeyType="done"
              style={ui.input} value={day.customName} placeholder={getWorkoutDisplayName(day) || 'Workout name'} placeholderTextColor={c.ash}
              onChangeText={name => state.setWorkoutCustomName(day.id, name)} />
            <Text style={ui.label}>Leave blank to use the muscles you’re training.</Text>
          </View>
        </View>
        {state.source === 'shared' ? <View style={ui.section}>
          <Text accessibilityRole="header" style={ui.subtitle}>Workout color</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Workout color" style={[ui.wrap, { gap: 8 }]}>
            {[null, ...Object.keys(MUSCLE_COLOR_PALETTE) as MuscleColor[]].map(color => <Action key={color ?? 'automatic'}
              title={color ? MUSCLE_COLOR_PALETTE[color].name : 'Automatic'} secondary
              label={`Workout color: ${color ? MUSCLE_COLOR_PALETTE[color].name : 'Automatic'}`}
              icon={(day.color ?? null) === color ? <Check color={c.bone} size={14} /> : undefined}
              onPress={() => state.setWorkoutColor(day.id, color)} />)}
          </View>
        </View> : null}
        <View style={ui.section}>
          <Text accessibilityRole="header" style={ui.subtitle}>Muscle colors</Text>
          <Text style={ui.body}>Each muscle’s color applies across the app, including workout cards and the workout logger. Changes save immediately.</Text>
          {!muscles.length ? <Text style={ui.label}>Add exercises to choose their muscle colors.</Text> : null}
          {colors.error ? <View style={{ gap: 8 }}>
            <Text accessibilityRole="alert" style={ui.error}>{colors.error === 'load' ? 'Couldn’t load your colors.' : 'Couldn’t save that color. Your previous choice is still applied.'}</Text>
            {colors.error === 'load' ? <Action title="Retry colors" onPress={() => { void loadMuscleColors(); }} /> : null}
          </View> : null}
          {muscles.map(type => <View key={type} style={ui.section}>
            <View style={ui.row}><View style={[ui.dot, { backgroundColor: getMuscleColor(type) }]} />
              <Text accessibilityRole="header" style={ui.actionText}>{workoutMeta[type].shortLabel}</Text></View>
            <View accessibilityRole="radiogroup" accessibilityLabel={`${workoutMeta[type].shortLabel} color`} style={[ui.card, { padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
              {[null, ...Object.keys(MUSCLE_COLOR_PALETTE) as MuscleColor[]].map(color => {
                const selected = (colors.preferences[type] ?? null) === color;
                return <Pressable key={color ?? 'default'} accessibilityRole="radio"
                  accessibilityLabel={`${workoutMeta[type].shortLabel}: ${color ? MUSCLE_COLOR_PALETTE[color].name : 'Default'}`}
                  accessibilityState={{ selected, disabled: !colors.hydrated || colors.saving }}
                  disabled={!colors.hydrated || colors.saving}
                  onPress={() => { void saveMuscleColor(type, color); }}
                  style={({ pressed }) => [ui.row, { flexDirection: 'column', gap: 6, flexBasis: '30%', minWidth: 88, minHeight: 72, padding: 8, borderRadius: 14, backgroundColor: selected ? c.raised : 'transparent' }, pressed && ui.pressed]}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color ? MUSCLE_COLOR_PALETTE[color].value : splitColors[type] }} />
                  <Text style={[ui.actionText, { textAlign: 'center', fontSize: 14 }]}>{color ? MUSCLE_COLOR_PALETTE[color].name : 'Default'}</Text>
                  {selected ? <View style={{ position: 'absolute', top: 6, right: 6 }}><Check color={c.bone} size={14} /></View> : null}
                </Pressable>;
              })}
            </View>
          </View>)}
        </View>
      </ScrollView> : <View style={ui.content}><Text style={ui.body}>This workout is no longer available.</Text><Action title="Back to routine" onPress={() => router.back()} /></View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
