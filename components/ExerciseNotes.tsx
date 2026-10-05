import { useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Alert, InputAccessoryView, Modal, Platform, TouchableOpacity,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MessageCircle, Trash2, X } from 'lucide-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseActionButton } from '@/components/ExerciseActionPill';
import { ExerciseNotesDone } from '@/components/ExerciseNotesDone';

import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { EXERCISE_NOTE_MAX_LENGTH, type ExerciseNote } from '@/store/exerciseNotes';
import { readExerciseNotesSync } from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';

type Props = { workoutId: string; exerciseId: number; exerciseName: string };

/** Right-hand action of the logger's floating pill; the native sheet keeps writing within reach. */
export function ExerciseNotes({ workoutId, exerciseId, exerciseName }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const accessoryId = useId();
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [initial] = useState(() => {
    try { return { notes: readExerciseNotesSync(exerciseId), failed: false }; }
    catch { return { notes: [] as ExerciseNote[], failed: true }; }
  });
  const [notes, setNotes] = useState(initial.notes);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState(initial.failed);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const input = useRef<TextInput>(null);
  const history = useRef<ScrollView>(null);
  const addNote = useWorkoutStore((state) => state.addExerciseNote);
  const deleteNote = useWorkoutStore((state) => state.deleteExerciseNote);

  const groups = useMemo(() => {
    const result = new Map<string, ExerciseNote[]>();
    for (const note of notes) {
      const label = note.workoutId === workoutId ? 'This workout' : new Date(note.createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
      const group = result.get(label) ?? [];
      group.push(note);
      result.set(label, group);
    }
    return [...result.entries()];
  }, [notes, workoutId]);

  const refresh = useCallback(() => {
    try {
      setNotes(readExerciseNotesSync(exerciseId));
      setReadError(false);
    } catch {
      setReadError(true);
    }
  }, [exerciseId]);

  const close = () => {
    if (!draft.trim()) { setVisible(false); return; }
    Alert.alert('Discard this draft?', 'Your saved notes will stay here.', [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Discard draft', style: 'destructive', onPress: () => {
        setDraft(''); setError(null); setVisible(false);
      } },
    ]);
  };

  const save = () => {
    if (!draft.trim() || saving.current) return;
    saving.current = true;
    try {
      addNote(workoutId, exerciseId, draft);
      setDraft('');
      setError(null);
      setSaved(true);
      input.current?.blur();
      refresh();
      history.current?.scrollTo({ y: 0, animated: !reducedMotion });
      AccessibilityInfo.announceForAccessibility('Note saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t save your note. Try again.');
    } finally {
      saving.current = false;
    }
  };

  const done = () => {
    if (draft.trim()) save();
    else input.current?.blur();
  };

  const remove = (note: ExerciseNote) => {
    Alert.alert('Delete this note?', 'It will also be removed from its workout report.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete note', style: 'destructive', onPress: () => {
        try { deleteNote(exerciseId, note.id); setError(null); refresh(); }
        catch { setError('Couldn’t delete this note. Try again.'); }
      } },
    ]);
  };

  return (
    <>
      <ExerciseActionButton
        symbol="bubble.left"
        fallback={MessageCircle}
        accessibilityLabel={`${exerciseName} notes${notes.length ? `, ${notes.length} saved` : ''}`}
        accessibilityHint="Read previous notes or write a note for this exercise"
        onPress={() => { refresh(); setSaved(false); setVisible(true); }}
      />

      <Modal
        visible={visible}
        presentationStyle="pageSheet"
        animationType={reducedMotion ? 'none' : 'slide'}
        allowSwipeDismissal={false}
        onRequestClose={close}
      >
        <View style={[styles.sheet, { paddingTop: Platform.OS === 'ios' ? 28 : insets.top + 16 }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>Exercise notes</Text>
              <Text style={styles.exerciseName}>{exerciseName}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel="Close exercise notes"
              onPress={close} style={styles.close}
            >
              <X size={20} color={c.bone} />
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={history}
            style={styles.history}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          >
            <View style={styles.composer}>
              {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
              <TextInput
                ref={input}
                accessibilityLabel={`New note for ${exerciseName}`}
                placeholder="Write a note…"
                placeholderTextColor={c.ash}
                multiline
                textAlignVertical="top"
                maxLength={EXERCISE_NOTE_MAX_LENGTH}
                value={draft}
                onChangeText={(value) => { setDraft(value); setError(null); setSaved(false); }}
                style={styles.input}
                keyboardAppearance="dark"
                inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
                onFocus={() => setEditing(true)}
                onBlur={() => setEditing(false)}
              />
              <View style={styles.composerActions}>
                <Text accessibilityLiveRegion="polite" style={styles.caption}>
                  {draft.length > EXERCISE_NOTE_MAX_LENGTH - 200
                    ? `${draft.length} / ${EXERCISE_NOTE_MAX_LENGTH}`
                    : saved ? 'Note saved' : 'Done saves your note'}
                </Text>
                {((!editing && Boolean(draft.trim())) || Platform.OS !== 'ios') && <ExerciseNotesDone onPress={done} />}
              </View>
            </View>
            {readError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Couldn’t load your notes</Text>
                <TouchableOpacity activeOpacity={0.7} accessibilityRole="button" onPress={refresh} style={styles.retry}>
                  <Text style={styles.retryLabel}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.empty}>Your notes will stay with this exercise for next time and appear in its workout report.</Text>
              </View>
            ) : groups.map(([label, items]) => (
              <View key={label} style={styles.group}>
                <Text accessibilityRole="header" style={styles.groupLabel}>{label}</Text>
                {items.map((note) => (
                  <View key={note.id} style={styles.note}>
                    <Text accessible={false} importantForAccessibility="no" style={styles.bullet}>•</Text>
                    <Text selectable style={styles.noteText}>{note.text}</Text>
                    <TouchableOpacity activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete note: ${note.text}`}
                      onPress={() => remove(note)}
                      style={styles.delete}
                    >
                      <Trash2 size={16} color={c.ash} strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          {visible && Platform.OS === 'ios' && (
            <InputAccessoryView nativeID={accessoryId}>
              <ExerciseNotesDone accessory onPress={done} />
            </InputAccessoryView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: c.ink },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 24, paddingBottom: 20 },
  heading: { flex: 1 },
  title: { fontFamily: f.display, color: c.bone, fontSize: 28 },
  exerciseName: { fontFamily: f.uiMedium, color: c.ash, fontSize: 16, marginTop: 4 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  history: { flex: 1 },
  content: { paddingHorizontal: 24 },
  emptyState: { alignItems: 'flex-start', marginTop: 24, gap: 12 },
  emptyTitle: { fontFamily: f.uiSemiBold, color: c.bone, fontSize: 20 },
  empty: { fontFamily: f.ui, color: c.ash, fontSize: 16, lineHeight: 24 },
  group: { marginTop: 24 },
  groupLabel: { fontFamily: f.uiMedium, color: c.ash, fontSize: 13, marginBottom: 8 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  bullet: { fontFamily: f.ui, fontSize: 17, color: c.ash, paddingTop: 9 },
  noteText: { flex: 1, fontFamily: f.ui, color: c.bone, fontSize: 17, paddingTop: 9 },
  delete: { width: 44, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  composer: { gap: 12 },
  input: { minHeight: 132, maxHeight: 200, borderRadius: 16, backgroundColor: c.surface, padding: 16, fontFamily: f.ui, fontSize: 17, color: c.bone },
  composerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  caption: { flex: 1, fontFamily: f.ui, fontSize: 13, color: c.ash },
  error: { fontFamily: f.uiMedium, color: c.bone, fontSize: 14, marginBottom: 12 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  retryLabel: { fontFamily: f.uiBold, color: c.bone, fontSize: 16 },
});
