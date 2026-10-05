import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { redesignColors as c } from '@/constants/theme';
import { SETTINGS_TITLES, useSettings } from './useSettings';
import type { SettingsRow } from './types';

export default function SettingsScreen() {
  const model = useSettings();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.4;
  if (!model.profile) return null;
  const renderRow = (row: SettingsRow, index: number) => {
    const body = <>
      <Text style={[styles.label, row.kind === 'action' && row.destructive && styles.destructive]}>{row.label}</Text>
      {row.kind === 'toggle' ? <Switch accessibilityLabel={row.label} value={row.value} disabled={Boolean(row.disabled || model.busy)} onValueChange={row.onChange} /> : null}
      {(row.kind === 'link' || row.kind === 'info') && row.value ? <Text style={styles.value}>{row.value}</Text> : null}
      {row.kind === 'link' ? <ChevronRight color={c.ashDim} size={18} /> : null}
      {row.kind === 'choice' && row.selected ? <Check size={20} color={c.bone} /> : null}
    </>;
    const style = [styles.row, index > 0 && styles.separated, largeText && styles.largeRow];
    if (row.kind === 'input') return <TextInput key={row.id} accessibilityLabel={row.label} value={row.value} onChangeText={row.onChange}
      placeholder={row.label} placeholderTextColor={c.ash} maxLength={80} autoFocus autoCapitalize="words" autoCorrect={false}
      returnKeyType="done" onSubmitEditing={model.saveName} style={[styles.row, styles.input]} />;
    if (row.kind === 'toggle' || row.kind === 'info') return <View key={row.id} style={style}>{body}</View>;
    return <Pressable key={row.id} accessibilityRole={row.kind === 'choice' ? 'radio' : 'button'}
      accessibilityState={{ disabled: Boolean(row.disabled || model.busy), ...(row.kind === 'choice' ? { checked: row.selected } : {}) }}
      accessibilityLabel={`${row.label}${row.kind === 'link' && row.value ? `, ${row.value}` : ''}`}
      disabled={Boolean(row.disabled || model.busy)}
      onPress={() => row.kind === 'link' ? model.open(row.page) : row.onPress()}
      style={({ pressed }) => [...style, pressed && styles.pressed, (row.disabled || model.busy) && styles.disabled]}>{body}</Pressable>;
  };
  return <SafeAreaView style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right', gestureEnabled: !model.busy }} />
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={model.back} disabled={Boolean(model.busy)} style={styles.headerButton}><ChevronLeft color={c.bone} size={25} /></Pressable>
      <Text accessibilityRole="header" style={styles.title}>{model.page ? SETTINGS_TITLES[model.page] : 'Settings'}</Text>
      {model.page === 'name' && <Pressable accessibilityRole="button" accessibilityLabel="Save name"
        disabled={Boolean(model.busy) || (model.page === 'name' && !model.name.trim())}
        onPress={model.saveName} style={styles.headerButton}>
        <Text style={styles.label}>Done</Text>
      </Pressable>}
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={styles.content}>
      {model.sections(model.page).map(section => <View key={section.id} style={styles.section}>
        {section.title && <Text style={styles.sectionTitle}>{section.title}</Text>}
        {section.rows.length > 0 && <View style={styles.group}>{section.rows.map(renderRow)}</View>}
        {section.footer && <Text style={styles.footer}>{section.footer}</Text>}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { color: c.bone, fontSize: 30, fontWeight: '700', flex: 1, letterSpacing: -0.6 },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44, width: '100%', maxWidth: 660, alignSelf: 'center' },
  section: { marginBottom: 28 },
  sectionTitle: { color: c.ash, fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  group: { backgroundColor: c.surface, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  row: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  largeRow: { flexWrap: 'wrap' },
  separated: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  label: { color: c.bone, fontSize: 17, flex: 1, flexShrink: 1 },
  value: { color: c.ash, fontSize: 17, flexShrink: 1, textAlign: 'right', ...(Platform.OS === 'web' ? { maxWidth: '50%' } : {}) },
  input: { color: c.bone, fontSize: 17 },
  footer: { color: c.ash, fontSize: 13, lineHeight: 19, marginHorizontal: 16, marginTop: 8 },
  destructive: { color: '#FF6961' },
  pressed: { backgroundColor: c.raised },
  disabled: { opacity: 0.45 },
});
