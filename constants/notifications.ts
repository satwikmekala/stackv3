export const NOTIFICATION_PREFIX = 'stack-';
export const NOTIFICATION_DESTINATION = '/(tabs)' as const;
export const DEFAULT_REMINDER_TIME = '18:00';
export const NOTIFICATION_CHANNEL = 'stack-workouts';

export const NOTIFICATION_COPY = {
  withNext: [
    { title: 'Time to stack up.', body: '{next} is next.' },
    { title: 'Your Stack is waiting.', body: 'One workout adds the next piece.' },
    { title: 'Don’t slack. Just stack.', body: '{next} is next.' },
    { title: '{next} is next.', body: 'Your Stack is ready for it.' },
    { title: 'Time to add a piece.', body: '{next} is next.' },
    { title: 'Your next piece is {next}.', body: 'Get it in today.' },
  ],
  noPlan: [{ title: 'Time to stack up.', body: 'Log a workout. Add a piece.' }],
  weekly: [
    { title: 'Stack one more.', body: 'One more training day hits your goal.' },
    { title: 'One to go.', body: '{done} of {goal} training days done this week.' },
    { title: 'Let’s finish the week.', body: 'One training day to your goal.' },
  ],
} as const;

export const REMINDER_SETTINGS_COPY = {
  title: 'Workout reminders',
  off: 'Off',
  days: 'Reminder days',
  time: 'Time',
  chooseDays: 'Pick at least one day to get reminders.',
  deniedIos: 'Notifications are off for Stack. Turn them on in iOS Settings.',
  deniedAndroid: 'Notifications are off for Stack. Turn them on in Android Settings.',
  openSettings: 'Open Settings',
  unavailable: 'Notifications are unavailable in this app build.',
  sharedDays: 'These are the same days as your training schedule.',
  channel: 'Workout reminders',
  done: 'Done',
  cancel: 'Cancel',
} as const;
