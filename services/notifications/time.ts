import { DEFAULT_REMINDER_TIME } from '@/constants/notifications';

export function validReminderTime(value: string): string {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : DEFAULT_REMINDER_TIME;
}

export function reminderTimeDate(time: string, day = new Date()): Date {
  const [hour, minute] = validReminderTime(time).split(':').map(Number);
  const date = new Date(day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function reminderTimeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function reminderTimeLabel(time: string): string {
  const [hour, minute] = validReminderTime(time).split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}
