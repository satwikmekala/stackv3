export const SETTINGS_PAGES = ['name', 'goal', 'schedule', 'program', 'unit', 'adjustments', 'data', 'about'] as const;
export type SettingsPage = typeof SETTINGS_PAGES[number];
type BaseRow = { id: string; label: string; disabled?: boolean };
export type SettingsRow = BaseRow & (
  | { kind: 'link'; page: SettingsPage; value?: string }
  | { kind: 'toggle'; value: boolean; onChange: (value: boolean) => void }
  | { kind: 'choice'; selected: boolean; onPress: () => void }
  | { kind: 'action'; onPress: () => void; destructive?: boolean }
  | { kind: 'input'; value: string; onChange: (value: string) => void }
  | { kind: 'info'; value?: string }
);
export type SettingsSection = { id: string; title?: string; footer?: string; rows: SettingsRow[] };
