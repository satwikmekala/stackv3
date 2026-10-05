import { ScrollView, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { REMINDER_SETTINGS_COPY as copy } from '@/constants/notifications';
import { redesignColors as c } from '@/constants/theme';
import { useReminderSettings } from './useReminderSettings';
import ReminderTimePicker from './ReminderTimePicker';

export default function RemindersScreen() {
  const model = useReminderSettings();
  if (!model.profile) return null;
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: true, title: copy.title, headerStyle: { backgroundColor: c.ink },
      headerTintColor: c.bone, headerShadowVisible: false }} />
    <ScrollView contentContainerStyle={styles.content}>
      {model.sections.map(section => <View key={section.id} style={styles.section}>
        {section.title && <Text style={styles.footer}>{section.title}</Text>}
        <View style={styles.group}>{section.rows.map(row => row.kind === 'toggle'
          ? <View key={row.id} style={styles.row}><Text style={styles.label}>{row.label}</Text>
            <Switch accessibilityLabel={row.label} value={row.value} onValueChange={row.onChange} disabled={Boolean(row.disabled || model.busy)} />
          </View>
          : row.kind === 'action' ? <Pressable key={row.id} accessibilityRole="button" onPress={row.onPress} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text></Pressable> : null)}</View>
        {section.footer && <Text style={styles.footer}>{section.footer}</Text>}
      </View>)}
      <View style={[styles.group, styles.row]}><Text style={styles.label}>{copy.time}</Text>
        <ReminderTimePicker time={model.profile.reminderTime} disabled={model.busy} onChange={model.setTime} />
      </View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, content: { padding: 20, paddingBottom: 60, gap: 24 },
  section: { gap: 8 }, group: { backgroundColor: c.surface, borderRadius: 18, overflow: 'hidden' },
  row: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1, color: c.bone, fontSize: 16 }, footer: { color: c.ash, fontSize: 13, lineHeight: 19, paddingHorizontal: 12 },
});
