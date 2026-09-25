import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { formatWeight, type WeightUnit } from '../../store/weightUnits';
import { getSessionLocalDate } from '../../store/workoutCalendar';
import type { BuildState, SetPerformance } from './evidence';

const volumeLabel = (kg: number, unit: WeightUnit): string | null => {
  if (!(kg > 0)) return null;
  if (unit === 'lbs') {
    const rounded = Math.round(Number(formatWeight(kg, unit)));
    return rounded > 0 ? `${rounded.toLocaleString('en-US')} LB` : null;
  }
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} T`;
  const rounded = Math.round(kg);
  return rounded > 0 ? `${rounded.toLocaleString('en-US')} KG` : null;
};
const countLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

export function EvidenceInspector({ state, visible, onClose, unit, example }: {
  state: BuildState; visible: boolean; onClose: () => void; unit: WeightUnit; example: boolean;
}) {
  const setText = (set: SetPerformance) => `${formatWeight(set.weightKg, unit)} ${unit} × ${set.reps}`;
  const summary = [
    state.metrics.workouts ? countLabel(state.metrics.workouts, 'piece', 'pieces') : null,
    volumeLabel(state.metrics.volumeKg, unit) ? `${volumeLabel(state.metrics.volumeKg, unit)} moved` : null,
    state.metrics.records ? countLabel(state.metrics.records, 'PR', 'PRs') : null,
  ].filter((value): value is string => Boolean(value)).join(' · ');
  return <Modal visible={visible} animationType="none" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><Text style={styles.title}>What earned it</Text><Pressable accessibilityRole="button" accessibilityLabel="Close evidence" onPress={onClose} style={styles.close}><X size={21} color={c.bone} /></Pressable></View>
      <FlatList
        data={[...state.pieces].reverse()} keyExtractor={(piece) => piece.id} contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={styles.note}>{example ? 'Example sessions · fixed at 23 Sep 2026' : 'Saved workout history · read only'}{summary ? `\n${summary}` : ''}{state.issues.length ? `\n${state.issues.length} dated entries excluded; see diagnostics below.` : ''}</Text>}
        ListEmptyComponent={<Text style={styles.note}>No pieces yet. Only completed pieces appear here.</Text>}
        ListFooterComponent={<>{state.issues.map((issue) => <Text key={issue.sessionId} style={styles.note}>Session {issue.sessionId}: {issue.reason}</Text>)}</>}
        renderItem={({ item: piece }) => <View style={styles.piece}>
          <Text style={[styles.label, { color: piece.color }]}>{piece.label} · {getSessionLocalDate(piece.date)}</Text>
          <Text style={styles.summary}>{[`${piece.height.toFixed(2)}×`, piece.metrics.liftsUp ? `${countLabel(piece.metrics.liftsUp, 'lift', 'lifts')} up` : null, piece.metrics.records ? countLabel(piece.metrics.records, 'PR', 'PRs') : null].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.note}>Session {piece.sessionId} · week of {piece.weekStart}{'\n'}{piece.eligibleExercises ? `${piece.eligibleExercises} comparable exercises · ` : ''}{volumeLabel(piece.metrics.volumeKg, unit) ? `${volumeLabel(piece.metrics.volumeKg, unit)} moved` : ''}</Text>
          {piece.comparisons.map((comparison) => <View key={`${comparison.exerciseName}:${comparison.loadType}`} style={styles.evidence}>
            <Text style={styles.label}>{comparison.exerciseName}</Text>
            <Text style={styles.note}>{comparison.previousSessionId ? `Compared with session ${comparison.previousSessionId} · ${comparison.comparableSets} matched sets` : 'No earlier comparable session: baseline thickness'}</Text>
            {comparison.improvedSets.map((set) => <Text style={styles.note} key={set.regularSetIndex}>Set {set.regularSetIndex + 1}: {setText(set.previous)} → {setText(set.current)}</Text>)}
            {comparison.previousSessionId && !comparison.improvedSets.length ? <Text style={styles.note}>No validated progression.</Text> : null}
          </View>)}
          {piece.records.map((record) => <View key={record.exerciseName} style={styles.evidence}>
            <Text style={styles.gold}>{record.exerciseName} · new personal best</Text>
            <Text style={styles.note}>{setText({ weightKg: record.previous.weight, reps: record.previous.reps })} → {setText({ weightKg: record.current.weight, reps: record.current.reps })}{'\n'}Previous best: session {record.previous.sessionId}</Text>
          </View>)}
        </View>}
      />
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  title: { fontFamily: f.display, color: c.bone, fontSize: 28 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 20 }, piece: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 20, gap: 10 },
  label: { fontFamily: f.uiSemiBold, color: c.bone, fontSize: 15 }, summary: { fontFamily: f.uiBold, color: c.bone, fontSize: 19 },
  note: { fontFamily: f.ui, color: c.ash, fontSize: 13, lineHeight: 20 }, evidence: { gap: 4, paddingTop: 6 }, gold: { fontFamily: f.uiSemiBold, color: '#FFD35A', fontSize: 14 },
});
