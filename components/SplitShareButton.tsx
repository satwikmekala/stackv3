import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { shareSavedSplit } from '@/features/sharing/shareSavedSplit';

export function SplitShareButton({ splitId, name }: { splitId: number; name: string }) {
  const locked = useRef(false);
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    if (locked.current) return;
    locked.current = true;
    setSharing(true);
    try {
      await shareSavedSplit(splitId);
    } catch (error) {
      Alert.alert("Can't share this split", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      locked.current = false;
      setSharing(false);
    }
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Share Split: ${name}`}
      accessibilityState={{ disabled: sharing, busy: sharing }} disabled={sharing}
      onPress={() => { void share(); }} style={[styles.button, sharing && styles.dimmed]}>
      {sharing ? <ActivityIndicator color={redesignColors.ash} size="small" /> :
        <Share2 color={redesignColors.ash} size={16} />}
      <Text style={styles.text}>{sharing ? 'Sharing…' : 'Share Split'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, borderTopWidth: 1, borderTopColor: redesignColors.border },
  dimmed: { opacity: 0.6 },
  text: { color: redesignColors.ash, fontFamily: redesignFonts.uiSemiBold, fontSize: 14 },
});
