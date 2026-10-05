import { Text, View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { SplitPressable } from './SplitPressable';
import { redesignColors, redesignFonts } from '@/constants/theme';

export function SplitActivationPill({ active, name, disabled = false, onPress }: {
  active: boolean; name: string; disabled?: boolean; onPress: () => void;
}) {
  const content = <View style={[styles.pill, active && styles.active]}>
    {active && <Check size={14} color="#82DB92" />}
    <Text style={[styles.label, active && styles.activeLabel]}>{active ? 'In use' : 'Activate'}</Text>
  </View>;
  if (active) return <View accessible accessibilityRole="text" accessibilityLabel={`${name} is in use`} style={styles.target}>{content}</View>;
  return <SplitPressable accessibilityRole="button" accessibilityLabel={`Activate ${name}`}
    accessibilityHint={name === 'Stack’s plan' ? 'Use Stack’s plan for your upcoming workouts' : 'Use this routine for your upcoming workouts'} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.target, (pressed || disabled) && styles.dimmed]}>{content}</SplitPressable>;
}

const styles = StyleSheet.create({
  target: { minHeight: 44, minWidth: 44, maxWidth: '100%', justifyContent: 'center', alignItems: 'flex-start' },
  pill: { minHeight: 36, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: redesignColors.raised, flexDirection: 'row', alignItems: 'center', gap: 6 },
  active: { backgroundColor: '#55C96B1F' },
  label: { color: redesignColors.bone, fontFamily: redesignFonts.uiSemiBold, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  activeLabel: { color: '#82DB92' },
  dimmed: { opacity: 0.55 },
});
