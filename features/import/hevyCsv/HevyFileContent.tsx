import { ActivityIndicator, Text, View } from 'react-native';
import { Action, ui } from '@/components/custom-split/ui';
import { redesignColors as c } from '@/constants/theme';
import type { HevyFileState } from './flow';

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
export function HevyFileContent({ state, choose, save, finish }: {
  state: HevyFileState; choose: () => void; save: () => void; finish: () => void;
}) {
  const plan = state.plan;
  return <>
    {state.stage === 'instructions' ? <>
      <View style={ui.section}><Text accessibilityRole="header" style={ui.title}>Import your Hevy history</Text>
        <Text style={ui.body}>Export your workouts from Hevy, then choose the file here.</Text></View>
      <View style={ui.card}>
        <Text style={ui.body}>1. Open Hevy</Text>
        <Text style={ui.body}>2. Go to Profile → Settings</Text>
        <Text style={ui.body}>3. Export &amp; Import Data → Export Data → Export Workouts</Text>
        <Text style={ui.body}>4. Save the CSV file</Text>
        <Text style={ui.body}>5. Return to Stack</Text>
      </View>
      <Action title="Choose export file" primary onPress={choose} />
    </> : null}
    {state.stage === 'reading' || state.stage === 'importing' ? <View style={ui.section}>
      <Text accessibilityRole="header" style={ui.title}>{state.stage === 'reading' ? 'Reading your Hevy export…' : 'Importing from Hevy…'}</Text>
      <ActivityIndicator color={c.bone} accessibilityLabel={state.stage === 'reading' ? 'Reading Hevy export' : 'Saving your workouts'} />
    </View> : null}
    {state.stage === 'preview' && plan ? <>
      <Text accessibilityRole="header" style={ui.title}>Ready to import</Text>
      <View style={ui.card}>
        <Text style={ui.subtitle}>{count(plan.newWorkouts, 'workout')}</Text>
        <Text style={ui.body}>{count(plan.resolutions.length, 'exercise')}</Text>
        <Text style={ui.label}>Workout history only</Text>
        {plan.customExercises ? <Text style={ui.body}>{count(plan.customExercises, 'custom exercise')} will be added. Stack couldn’t confidently match these exercises.</Text> : null}
        {plan.existingWorkouts ? <Text style={ui.label}>{count(plan.existingWorkouts, 'workout')} already in Stack will be kept.</Text> : null}
      </View>
      <Text style={ui.body}>Hevy exports don’t include a time zone. Dates use {Intl.DateTimeFormat().resolvedOptions().timeZone}. Check this matches your Hevy history.</Text>
      <Text style={ui.label}>Unchanged workouts already imported from a file will be kept. Edited workouts or different export settings may add duplicates.</Text>
      <Text style={ui.label}>If you already brought this history over with Hevy Pro, importing this file may add it again.</Text>
      {plan.warnings.map(warning => <Text key={warning} style={ui.body}>{warning}</Text>)}
      <Action title="Import from Hevy" primary onPress={save} />
      <Action title="Choose another file" secondary onPress={choose} />
    </> : null}
    {state.stage === 'done' && state.result ? <>
      <Text accessibilityRole="header" style={ui.title}>Imported from Hevy</Text>
      <Text style={ui.subtitle}>{count(state.result.workouts, 'workout')}</Text>
      <Text style={ui.body}>Your workout history is now in Stack.</Text>
      {state.result.alreadyImported ? <Text style={ui.label}>{count(state.result.alreadyImported, 'workout')} already in Stack kept.</Text> : null}
      <Action title="Continue" primary onPress={finish} />
    </> : null}
    {state.error ? <Text accessibilityRole="alert" style={ui.error}>{state.error}</Text> : null}
  </>;
}
