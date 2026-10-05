import { Platform, Text, View } from 'react-native';
import { displayExerciseName } from '@/constants/exerciseNames';
import { redesignColors as c } from '@/constants/theme';
import type { PendingImportExercise } from '@/features/routineImport/importDraft';
import type { DraftExercise } from '@/store/customSplitDraft';
import { Action, ui } from './ui';
import { showActions } from './showActions';

const reason = (item: PendingImportExercise) =>
  item.suggestion ? `Did you mean ${displayExerciseName(item.suggestion.name)}?`
    : item.status === 'unresolved' ? 'Stack couldn’t match this to an exercise.' : 'Choose the exercise you meant.';

/** Pasted exercises Stack wasn't sure about. Nothing here is saved until the person decides. */
export function PendingImportList({ items, onResolve, onSearch }: {
  items: PendingImportExercise[];
  onResolve: (key: string, exercise: DraftExercise | null) => void;
  onSearch: (item: PendingImportExercise) => void;
}) {
  const choose = (item: PendingImportExercise) => {
    if (!item.alternatives.length) { onSearch(item); return; }
    // Android alerts hold at most three actions.
    const alternatives = Platform.OS === 'ios' ? item.alternatives : item.alternatives.slice(0, 2);
    showActions(`“${item.rawName}”`, [
      ...alternatives.map(exercise => ({ title: displayExerciseName(exercise.name), onPress: () => onResolve(item.key, exercise) })),
      { title: 'Search all exercises', onPress: () => onSearch(item) },
    ]);
  };
  return <View style={ui.card}>
    <View style={ui.row}>
      <View style={[ui.dot, { backgroundColor: c.accent }]} />
      <Text style={ui.eyebrow}>{items.length === 1 ? '1 EXERCISE TO CHECK' : `${items.length} EXERCISES TO CHECK`}</Text>
    </View>
    <Text style={ui.body}>Stack wasn’t sure about {items.length === 1 ? 'this one' : 'these'}. Choose the right exercise, or remove it.</Text>
    {items.map(item => <View key={item.key} style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text style={[ui.actionText, { textAlign: 'left' }]}>“{item.rawName}”</Text>
        <Text style={ui.label}>{reason(item)}</Text>
      </View>
      <View style={ui.wrap}>
        {item.suggestion ? <Action compact secondary title={`Use ${displayExerciseName(item.suggestion.name)}`}
          onPress={() => onResolve(item.key, item.suggestion)} /> : null}
        <Action compact secondary={!item.suggestion} title={item.suggestion ? 'Something else' : 'Choose exercise'}
          label={`Choose the exercise for ${item.rawName}`} onPress={() => choose(item)} />
        <Action compact destructive title="Remove" label={`Remove ${item.rawName}`} onPress={() => onResolve(item.key, null)} />
      </View>
    </View>)}
  </View>;
}
