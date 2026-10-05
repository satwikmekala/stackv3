import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';

export function Action({ title, onPress, primary = false, secondary = false, destructive = false, disabled = false, label, icon, compact = false, pill = false }: {
  title: string; onPress: () => void; primary?: boolean; secondary?: boolean; destructive?: boolean;
  disabled?: boolean; label?: string; icon?: ReactNode; compact?: boolean; pill?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.action, secondary && ui.secondary, primary && ui.primary,
      compact && ui.compactAction, pill && ui.pill, disabled && ui.disabled, pressed && ui.pressed]}>
    {icon}
    <Text style={[ui.actionText, compact && ui.compactText, destructive && ui.destructiveText, primary && ui.primaryText]}>{title}</Text>
  </Pressable>;
}

export function Header({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  const { fontScale, width } = useWindowDimensions();
  const expanded = fontScale > 1.25 || width < 360;
  return <View style={ui.header}>
    <View style={[ui.toolbar, expanded && { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
      {left ?? <View style={{ width: 44 }} />}
      {!expanded ? <Text accessibilityRole="header" style={ui.headerTitle}>{title}</Text> : <View style={{ flex: 1 }} />}
      {right ?? <View style={{ width: 44 }} />}
    </View>
    {expanded ? <Text accessibilityRole="header" style={[ui.headerTitle, ui.expandedHeaderTitle]}>{title}</Text> : null}
  </View>;
}

/** A small content illustration: three days, one Stack. */
export function StackMark() {
  return <View accessible={false} style={ui.stackMark}>
    {[32, 40, 48].map((width, i) => <View key={width} style={{ width, height: 9, borderRadius: 3, backgroundColor: i === 0 ? c.accent : i === 1 ? c.ash : c.hi }} />)}
  </View>;
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24, paddingBottom: 28 },
  header: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48 },
  headerTitle: { flex: 1, color: c.bone, fontFamily: f.uiSemiBold, fontSize: 17, textAlign: 'center' },
  expandedHeaderTitle: { flex: 0, textAlign: 'left', paddingHorizontal: 12, paddingTop: 8 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 32, lineHeight: 38 },
  subtitle: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 22, lineHeight: 28 },
  body: { color: c.ash, fontFamily: f.ui, fontSize: 16, lineHeight: 23 },
  label: { color: c.ash, fontFamily: f.uiMedium, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: c.ash, fontFamily: f.mono, fontSize: 11, letterSpacing: 1.4, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  section: { gap: 12 },
  card: { backgroundColor: c.surface, borderRadius: 20, borderCurve: 'continuous', padding: 18, gap: 14 },
  action: { maxWidth: '100%', minWidth: 44, minHeight: 48, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderCurve: 'continuous' },
  actionText: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 16, lineHeight: 22, textAlign: 'center', flexShrink: 1 },
  compactAction: { paddingHorizontal: 12 },
  compactText: { fontSize: 15 },
  pill: { backgroundColor: c.raised, borderRadius: 999, minHeight: 44, paddingHorizontal: 16, paddingVertical: 10 },
  secondary: { backgroundColor: c.raised },
  primary: { backgroundColor: c.accent, minHeight: 54, borderRadius: 16 },
  primaryText: { color: c.ink, fontFamily: f.uiBold },
  destructiveText: { color: '#FF9A91' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  dock: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: c.ink, gap: 8 },
  input: { color: c.bone, fontFamily: f.ui, fontSize: 18, backgroundColor: c.surface, borderRadius: 14, padding: 16, minHeight: 56 },
  error: { color: c.bone, fontFamily: f.ui, fontSize: 15, lineHeight: 22 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  iconButton: { minWidth: 48, minHeight: 48, padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayTab: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  selectedTab: { backgroundColor: c.raised },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14 },
  number: { minWidth: 24, color: c.ash, fontFamily: f.mono, fontSize: 12, fontVariant: ['tabular-nums'] },
  stackMark: { alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 8 },
});
