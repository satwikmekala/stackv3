import { useState } from 'react';
import { Host, TimePickerDialog } from '@expo/ui/jetpack-compose';
import { Pressable, Text } from 'react-native';
import { REMINDER_SETTINGS_COPY as copy } from '@/constants/notifications';
import { redesignColors as c } from '@/constants/theme';
import { reminderTimeDate, reminderTimeLabel } from '@/services/notifications/time';

export default function ReminderTimePicker({ time, disabled, onChange }: { time: string; disabled: boolean; onChange: (date: Date) => void }) {
  const [visible, setVisible] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${copy.time}, ${reminderTimeLabel(time)}`}
      disabled={disabled} onPress={() => setVisible(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: c.bone }}>{reminderTimeLabel(time)}</Text>
    </Pressable>
    {visible && <Host matchContents>
      <TimePickerDialog initialDate={reminderTimeDate(time).toISOString()} confirmButtonLabel={copy.done} dismissButtonLabel={copy.cancel}
        onDateSelected={date => { setVisible(false); onChange(date); }} onDismissRequest={() => setVisible(false)} />
    </Host>}
  </>;
}
