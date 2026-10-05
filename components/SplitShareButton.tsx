import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { shareSavedSplit } from '@/features/sharing/shareSavedSplit';

export function SplitShareButton({ splitId, name, compact = false }: { splitId: number; name: string; compact?: boolean }) {
  const locked = useRef(false);
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    if (locked.current) return;
    locked.current = true;
    setSharing(true);
    try {
      await shareSavedSplit(splitId);
    } catch (error) {
      Alert.alert("Couldn’t share this routine", error instanceof Error ? error.message : 'Try again.');
    } finally {
      locked.current = false;
      setSharing(false);
    }
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Share routine: ${name}`}
      accessibilityState={{ disabled: sharing, busy: sharing }} disabled={sharing}
      onPress={() => { void share(); }} style={({ pressed }) => [styles.button, compact && styles.compact, sharing && styles.dimmed, pressed && { opacity: 0.65 }]}>
      {sharing ? <ActivityIndicator color={redesignColors.ash} size="small" /> :
        <Share2 color={redesignColors.ash} size={16} />}
      <Text style={styles.text}>{sharing ? 'Sharing…' : compact ? 'Share' : 'Share routine'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, borderTopWidth: 1, borderTopColor: redesignColors.border },
  compact: { marginHorizontal: 0, borderTopWidth: 0, paddingHorizontal: 12, borderRadius: 14 },
  dimmed: { opacity: 0.6 },
  text: { color: redesignColors.ash, fontFamily: redesignFonts.uiSemiBold, fontSize: 14 },
});
