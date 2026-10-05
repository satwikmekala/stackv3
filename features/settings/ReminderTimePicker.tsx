import { Text } from 'react-native';
import { redesignColors as c } from '@/constants/theme';
import { reminderTimeLabel } from '@/services/notifications/time';

export default function ReminderTimePicker({ time }: { time: string; disabled: boolean; onChange: (date: Date) => void }) {
  return <Text style={{ color: c.bone }}>{reminderTimeLabel(time)}</Text>;
}
