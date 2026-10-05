import { useState } from 'react';
import { Text, View } from 'react-native';
import { Action, ui } from '@/components/custom-split/ui';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';
import type { ImportExercise, ImportSet, ImportTemplate } from './models';

export function importedSetLabel(set: ImportSet, unit: WeightUnit): string {
  const values: string[] = [];
  if (set.weightKg !== null) values.push(`${formatWeight(set.weightKg, unit)} ${unitLabel(unit)}`);
  if (set.reps !== null) values.push(`${set.reps} reps`);
  if (set.repRange) values.push(`${set.repRange.start ?? '—'}–${set.repRange.end ?? '—'} target reps`);
  if (set.durationS !== null) values.push(`${set.durationS} sec`);
  if (set.distanceM !== null) values.push(`${set.distanceM} m`);
  if (set.rpe !== null) values.push(`RPE ${set.rpe}`);
  if (set.customMetric !== null) values.push(`Other measurement: ${set.customMetric}`);
  const kind = ({ normal: 'Working', warmup: 'Warmup', dropset: 'Drop', failure: 'Failure' } as Record<string, string>)[set.kind] ?? 'Other';
  return `${set.index + 1}. ${kind} · ${values.join(' · ') || 'No measurements recorded'}`;
}

/** Reference facts are distinct from Stack's comparable sets and editable routine prescriptions. */
export function ImportedFacts({ exercises, templates, notes, unit, durationS }: {
  exercises: ImportExercise[]; templates?: ImportTemplate[]; notes?: string; unit: WeightUnit; durationS?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const groups = [...new Set(exercises.flatMap(exercise => exercise.supersetId === null ? [] : [exercise.supersetId]))];
  return <View style={ui.card}>
    <Action title={expanded ? 'Hide original Hevy details' : 'Original Hevy details'} secondary onPress={() => setExpanded(value => !value)} />
    {expanded ? <>
      <Text style={ui.label}>Original values, including measurements Stack cannot compare yet.</Text>
      {durationS !== undefined ? <Text style={ui.body}>Workout length · {durationS} seconds</Text> : null}
      {notes ? <Text style={ui.body}>{notes}</Text> : null}
      {exercises.map(exercise => { const template = templates?.find(item => item.id === exercise.templateId);
        const label = (value: string) => value.replaceAll('_', ' ');
        return <View key={exercise.index} style={ui.section}>
        <Text style={ui.subtitle}>{exercise.name}</Text>
        {template ? <><Text style={ui.label}>{[template.primaryMuscle, ...template.secondaryMuscles].map(label).join(' · ')}</Text>
          <Text style={ui.label}>{template.equipment === 'none' ? 'No equipment' : label(template.equipment)}{template.isCustom ? ' · Custom exercise in Hevy' : ''}</Text></> : null}
        {exercise.supersetId !== null ? <Text style={ui.label}>Superset group {groups.indexOf(exercise.supersetId) + 1}</Text> : null}
        {exercise.restS !== null && exercise.restS !== undefined ? <Text style={ui.label}>Rest · {exercise.restS} seconds</Text> : null}
        {exercise.notes ? <Text style={ui.body}>{exercise.notes}</Text> : null}
        {exercise.sets.map(set => <Text key={set.index} style={ui.label}>{importedSetLabel(set, unit)}</Text>)}
      </View>; })}
    </> : null}
  </View>;
}
