import { DatePicker, Form, Host, Section, Text } from '@expo/ui/swift-ui';
import { background, disabled, font, foregroundStyle, listRowBackground, scrollContentBackground } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { REMINDER_SETTINGS_COPY as copy } from '@/constants/notifications';
import { redesignColors as c } from '@/constants/theme';
import { reminderTimeDate } from '@/services/notifications/time';
import { Row } from './SettingsScreen.ios';
import { useSettings } from './useSettings';
import { useReminderSettings } from './useReminderSettings';

export default function RemindersScreen() {
  const model = useSettings();
  const reminders = useReminderSettings();
  if (!reminders.profile) return null;
  return <>
    <Stack.Screen options={{ headerShown: true, title: copy.title, presentation: 'card', animation: 'slide_from_right',
      headerBackButtonDisplayMode: 'minimal', headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone,
      headerShadowVisible: false, gestureEnabled: !reminders.busy, headerBackVisible: !reminders.busy,
      unstable_nativeProps: { headerConfig: { experimental_userInterfaceStyle: 'dark' } } }} />
    <Host colorScheme="dark" style={{ flex: 1, backgroundColor: c.ink }}>
      <Form modifiers={[scrollContentBackground('hidden'), background(c.ink)]}>
        {reminders.sections.map(section => <Section key={section.id} title={section.title}
          footer={section.footer ? <Text modifiers={[foregroundStyle(c.ash), font({ textStyle: 'footnote' })]}>{section.footer}</Text> : undefined}>
          {section.rows.map(row => <Row key={row.id} row={row} busy={reminders.busy} model={model} />)}
        </Section>)}
        <Section>
          <DatePicker title={copy.time} selection={reminderTimeDate(reminders.profile.reminderTime)}
            displayedComponents={['hourAndMinute']} onDateChange={reminders.setTime}
            modifiers={[listRowBackground(c.surface), foregroundStyle(c.bone), disabled(reminders.busy)]} />
        </Section>
      </Form>
    </Host>
  </>;
}
