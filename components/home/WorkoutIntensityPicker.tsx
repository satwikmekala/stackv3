import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '@/services/haptics';
import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';

type IntensityLevelOption = { value: number; label: string };
type WorkoutIntensityPickerProps = {
  visible: boolean;
  workoutLabel: string;
  accent: string;
  levels?: readonly IntensityLevelOption[];
  heading?: string;
  prompt?: string;
  subtext?: string;
  confirmLabel?: string;
  onChoose: (value: number) => void;
  onClose: () => void;
};

const DEFAULT_LEVELS: readonly IntensityLevelOption[] = [
  { value: 0, label: 'Too easy' },
  { value: 0.5, label: 'Just right' },
  { value: 1, label: 'Too hard' },
];

type FeedbackContentProps = Omit<WorkoutIntensityPickerProps, 'visible'>;

// Mount only while the message is open, so each visit starts with a fresh selection.
function FeedbackContent({ workoutLabel, accent, levels = DEFAULT_LEVELS,
  heading = 'Good work!', prompt = 'How did this workout feel?', subtext = 'Don’t forget to stretch it out.',
  confirmLabel = 'Save workout', onChoose, onClose }: FeedbackContentProps) {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  const [value, setValue] = useState(0.5);
  const [submitting, setSubmitting] = useState(false);
  const committed = useRef(false);

  const select = (next: number) => {
    if (committed.current || next === value) return;
    setValue(next);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };
  const finish = () => {
    if (committed.current) return;
    committed.current = true;
    setSubmitting(true);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChoose(value);
  };

  return <View accessibilityViewIsModal style={[styles.card, { maxHeight: height - insets.top - insets.bottom - 48 }]}>
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.contextRow}>
        <View style={styles.context}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={styles.workoutLabel}>{workoutLabel}</Text>
        </View>
        <WorkoutTouchable accessibilityRole="button" accessibilityLabel="Close workout feedback"
          disabled={submitting} onPress={onClose} activeOpacity={0.7} style={styles.close}>
          <X color={c.bone} size={20} strokeWidth={2} />
        </WorkoutTouchable>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{heading}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
      <Text style={styles.question}>{prompt}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Workout effort"
        style={[styles.choices, stacked && styles.stackedChoices]}>
        {levels.map(level => {
          const selected = level.value === value;
          return <WorkoutTouchable key={level.value} accessibilityRole="radio"
            accessibilityLabel={level.label} accessibilityState={{ checked: selected, disabled: submitting }}
            disabled={submitting} activeOpacity={0.75} onPress={() => select(level.value)}
            style={[styles.choice, stacked && styles.stackedChoice, selected && styles.selectedChoice]}>
            <Text style={[styles.choiceLabel, selected && styles.selectedLabel]}>{level.label}</Text>
          </WorkoutTouchable>;
        })}
      </View>
    </ScrollView>
    <View style={styles.footer}>
      <WorkoutTouchable accessibilityRole="button" accessibilityLabel={confirmLabel}
        accessibilityHint="Save this rating and complete your workout"
        accessibilityState={{ disabled: submitting }} disabled={submitting}
        activeOpacity={0.8} onPress={finish}
        style={[styles.finish, { backgroundColor: accent }, submitting && styles.disabled]}>
        <Text style={styles.finishLabel}>{confirmLabel}</Text>
      </WorkoutTouchable>
    </View>
  </View>;
}

export function WorkoutIntensityPicker({ visible, ...props }: WorkoutIntensityPickerProps) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  return <Modal transparent visible={visible} animationType={reducedMotion ? 'none' : 'fade'}
    statusBarTranslucent onRequestClose={props.onClose}>
    {visible ? <View style={[styles.modal, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close workout feedback"
        onPress={props.onClose} style={styles.backdrop} />
      <FeedbackContent key={props.workoutLabel} {...props} />
    </View> : null}
  </Modal>;
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.68)' },
  card: {
    width: '100%', maxWidth: 440, alignSelf: 'center', overflow: 'hidden',
    borderRadius: 30, borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    backgroundColor: c.surface,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  context: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  workoutLabel: { flex: 1, color: c.ash, fontFamily: f.uiMedium, fontSize: 14, lineHeight: 20 },
  close: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.raised, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  title: { color: c.bone, fontFamily: f.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  subtext: { marginTop: 8, color: c.ash, fontFamily: f.ui, fontSize: 14, lineHeight: 20 },
  question: { marginTop: 24, color: c.bone, fontFamily: f.uiSemiBold, fontSize: 18, lineHeight: 24 },
  choices: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stackedChoices: { flexDirection: 'column' },
  choice: { flex: 1, minHeight: 52, paddingHorizontal: 10, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderCurve: 'continuous',
    backgroundColor: c.raised, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  stackedChoice: { flex: 0 },
  selectedChoice: { backgroundColor: c.bone, borderColor: c.bone },
  choiceLabel: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  selectedLabel: { color: c.ink },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  finish: { minHeight: 54, padding: 16, borderRadius: 16, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
  finishLabel: { color: c.ink, fontFamily: f.uiBold, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  disabled: { opacity: 0.55 },
});
