import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';

/** Only failures surface: step saves are local and near-instant, so a "saving" line would just flash and shift the actions. */
export function SetupStatus({ error, retry }: { error?: string | null; retry: () => void }) {
  if (!error) return null;
  return <View style={styles.status}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.body}>{error}</Text>
    <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.label}>Try again</Text></Pressable>
  </View>;
}
export function SetupLoading({ error, retry }: { error: string | null; retry: () => void }) {
  return <SafeAreaView style={styles.screen}>
    <View style={styles.loading}>{!error && <ActivityIndicator color={c.accent} accessibilityLabel="Loading your setup" />}
      <SetupStatus error={error} retry={retry} /></View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  loading: { flex: 1, justifyContent: 'center', padding: 24 },
  status: { gap: 4 },
  body: { fontFamily: f.ui, color: c.ash, fontSize: 16 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12 },
  label: { fontFamily: f.uiSemiBold, fontSize: 17, color: c.bone },
});
