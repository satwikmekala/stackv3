import type { SQLiteDatabase } from 'expo-sqlite';
import type { WorkoutSession } from './workoutStore';

// Order follows dependencies. Imported files never supply SQL or table names.
export const BACKUP_TABLES = [
  'exercises', 'custom_splits', 'custom_split_workouts', 'custom_split_workout_exercises',
  'split_templates', 'archetype_templates', 'sessions', 'session_workout_types',
  'session_exercises', 'exercise_notes', 'sets', 'profile',
  'imported_exercises', 'imported_routine_groups', 'imported_routines', 'imported_routine_exercises', 'imported_workouts', 'sqlite_sequence',
] as const;
type Table = typeof BACKUP_TABLES[number];
type Cell = string | number | null;
type Row = Record<string, Cell>;
type Database = Pick<SQLiteDatabase, 'getAllSync' | 'getFirstSync' | 'runSync' | 'withTransactionSync' | 'execSync'>;
export type WorkoutBackup = {
  format: 'stack-backup'; version: 1; schemaVersion: number; createdAt: string;
  tables: Record<Table, Row[]>;
};

export function captureWorkoutBackup(db: Database, schemaVersion: number): WorkoutBackup {
  let tables!: WorkoutBackup['tables'];
  db.withTransactionSync(() => {
    tables = Object.fromEntries(BACKUP_TABLES.map(table => [table,
      db.getAllSync<Row>(`SELECT * FROM ${table} ORDER BY rowid`),
    ])) as WorkoutBackup['tables'];
  });
  return { format: 'stack-backup', version: 1, schemaVersion, createdAt: new Date().toISOString(), tables };
}

// Columns added without a schema bump. Older files restore them with these defaults.
const ADDED_COLUMNS: Partial<Record<Table, Row>> = { custom_splits: { is_stack_plan: 0 } };

/** Validate the whole file before the first DELETE. SQL constraints finish validation in the transaction. */
export function prepareWorkoutBackup(value: unknown, db: Database, schemaVersion: number): WorkoutBackup {
  if (!value || typeof value !== 'object') throw Error('Choose a Stack backup file.');
  const backup = withAddedColumns(value as WorkoutBackup);
  const legacy = schemaVersion >= 22 && backup.schemaVersion === 21;
  const beforeImports = schemaVersion >= 23 && [21, 22].includes(backup.schemaVersion);
  const beforeReminders = schemaVersion >= 24 && [21, 22, 23].includes(backup.schemaVersion);
  if (backup.format !== 'stack-backup' || backup.version !== 1 || (backup.schemaVersion !== schemaVersion && !legacy && !beforeImports && !beforeReminders))
    throw Error('This backup is not compatible with this version of Stack.');
  if (!backup.tables || typeof backup.tables !== 'object') throw Error('This backup is incomplete.');
  for (const table of BACKUP_TABLES) {
    if (beforeImports && table.startsWith('imported_')) continue;
    const rows = backup.tables[table];
    const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`).map(column => column.name)
      .filter(column => !legacy || table !== 'profile' || !['program_mode', 'three_day_structure', 'weight_unit_confirmed'].includes(column))
      .filter(column => !beforeReminders || table !== 'profile' || !['reminders_enabled', 'reminder_time'].includes(column));
    if (!Array.isArray(rows)) throw Error('This backup is incomplete.');
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== columns.length ||
          columns.some(column => !Object.hasOwn(row, column)) ||
          Object.values(row).some(cell => cell !== null && typeof cell !== 'string' &&
            !(typeof cell === 'number' && Number.isFinite(cell)))) throw Error('This backup contains invalid data.');
    }
  }
  const profile = backup.tables.profile;
  if (profile.length !== 1 || profile[0].id !== 1 || typeof profile[0].name !== 'string' ||
      typeof profile[0].weekly_goal !== 'number' || !Number.isInteger(profile[0].weekly_goal) ||
      profile[0].weekly_goal < 0 || profile[0].weekly_goal > 7 ||
      typeof profile[0].program_weekly_goal !== 'number' || !Number.isInteger(profile[0].program_weekly_goal) ||
      profile[0].program_weekly_goal < 1 || profile[0].program_weekly_goal > 6 ||
      !['kg', 'lbs'].includes(String(profile[0].weight_unit)) ||
      !['beginner', 'intermediate', 'advanced'].includes(String(profile[0].experience_level)))
    throw Error('This backup has an invalid profile.');
  const selected = profile[0];
  if (schemaVersion >= 24 && !beforeReminders && (typeof selected.reminders_enabled !== 'number' ||
      ![0, 1].includes(selected.reminders_enabled) || typeof selected.reminder_time !== 'string' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(selected.reminder_time)))
    throw Error('This backup has invalid reminder preferences.');
  if ((selected.active_split_id !== null &&
       (typeof selected.active_split_id !== 'number' || !Number.isInteger(selected.active_split_id) || selected.active_split_id <= 0)) ||
      ![0, 1].includes(Number(selected.onboarding_completed)) || typeof selected.onboarding_completed !== 'number' ||
      ![0, 1].includes(Number(selected.auto_increase_weight)) || typeof selected.auto_increase_weight !== 'number')
    throw Error('This backup has an invalid profile.');
  if (!legacy && (!['none', 'stack', 'custom'].includes(String(selected.program_mode)) ||
      !['full-body', 'push-pull-legs'].includes(String(selected.three_day_structure)) ||
      typeof selected.weight_unit_confirmed !== 'number' || ![0, 1].includes(selected.weight_unit_confirmed) ||
      (selected.program_mode === 'custom' ? selected.active_split_id === null : selected.active_split_id !== null)))
    throw Error('This backup has invalid plan preferences.');
  let days: unknown;
  try { days = JSON.parse(String(profile[0].training_days)); } catch { throw Error('This backup has an invalid schedule.'); }
  if (!Array.isArray(days) || days.some(day => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(days).size !== days.length) throw Error('This backup has an invalid schedule.');
  if (backup.tables.sessions.some(session => session.completed !== 1))
    throw Error('Finish the active workout before creating a backup.');
  if (backup.tables.sqlite_sequence.some(row => !BACKUP_TABLES.includes(row.name as Table) ||
      typeof row.seq !== 'number' || !Number.isInteger(row.seq) || row.seq < 0))
    throw Error('This backup contains invalid identifiers.');
  if (!legacy && !beforeImports && !beforeReminders) return backup;
  // Upgrade a copy, after strict schema-21 validation and before any SQL write.
  return { ...backup, schemaVersion, tables: { ...backup.tables,
    ...(beforeImports ? Object.fromEntries(BACKUP_TABLES.filter(table => table.startsWith('imported_')).map(table => [table, []])) : {}),
    profile: [{ ...selected, ...(beforeReminders ? { reminders_enabled: 0, reminder_time: '18:00' } : {}), ...(legacy ? {
    program_mode: selected.active_split_id === null ? 'stack' : 'custom',
    three_day_structure: selected.experience_level === 'beginner' ? 'full-body' : 'push-pull-legs',
    weight_unit_confirmed: 1,
  } : {}) }] } };
}

function withAddedColumns(backup: WorkoutBackup): WorkoutBackup {
  if (!backup.tables || typeof backup.tables !== 'object') return backup;
  let tables = backup.tables;
  for (const [table, defaults] of Object.entries(ADDED_COLUMNS) as [Table, Row][]) {
    const rows = tables[table];
    if (!Array.isArray(rows) || !rows.some(row => row && typeof row === 'object' && Object.keys(defaults).some(column => !Object.hasOwn(row, column)))) continue;
    tables = { ...tables, [table]: rows.map(row => row && typeof row === 'object' && !Array.isArray(row) ? { ...defaults, ...row } : row) };
  }
  return tables === backup.tables ? backup : { ...backup, tables };
}

export function validateWorkoutBackup(value: unknown, db: Database, schemaVersion: number): asserts value is WorkoutBackup {
  prepareWorkoutBackup(value, db, schemaVersion);
}

export function restoreWorkoutBackup(db: Database, value: unknown, schemaVersion: number) {
  const backup = prepareWorkoutBackup(value, db, schemaVersion);
  db.withTransactionSync(() => {
    db.execSync('PRAGMA defer_foreign_keys = ON;');
    // Recovery receipts describe the replaced live database, never a backup.
    db.runSync('DELETE FROM shared_split_import_receipts');
    for (const table of [...BACKUP_TABLES].reverse()) db.runSync(`DELETE FROM ${table}`);
    for (const table of BACKUP_TABLES) {
      // AUTOINCREMENT inserts above create fresh counters; replace them with the saved ones.
      if (table === 'sqlite_sequence') db.runSync('DELETE FROM sqlite_sequence');
      const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`).map(column => column.name);
      const query = `INSERT INTO ${table} (${columns.map(column => `"${column}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
      for (const row of backup.tables[table]) db.runSync(query, ...columns.map(column => row[column]));
    }
    if (db.getAllSync('PRAGMA foreign_key_check').length) throw Error('This backup has broken exercise or workout references.');
    if (db.getFirstSync<{ integrity_check: string }>('PRAGMA integrity_check')?.integrity_check !== 'ok')
      throw Error('This backup couldn’t be verified. Try another backup.');
  });
}

const csvCell = (value: string | number | boolean | null | undefined): string => {
  let text = String(value ?? '');
  // Exercise names and notes must stay text in spreadsheet applications.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export function workoutHistoryCsv(sessions: readonly WorkoutSession[]): string {
  const rows: (string | number | boolean | null | undefined)[][] = [[
    'Workout ID', 'Started at', 'Finished at', 'Origin', 'Exercise', 'Load type', 'Metric',
    'Set', 'Weight (kg)', 'Reps', 'Duration (seconds)', 'Logged', 'Skipped', 'Set type', 'Notes',
  ]];
  for (const session of sessions.filter(session => session.completed)) {
    for (const exercise of session.exercises) exercise.sets.forEach((set, index) => rows.push([
      session.id, session.date, session.completedAt, session.origin, exercise.name, exercise.loadType, exercise.metric,
      index + 1, exercise.loadType === 'bodyweight' ? null : set.weight,
      exercise.metric === 'duration' ? null : set.reps, exercise.metric === 'duration' ? set.durationS : null,
      Boolean(set.completed), Boolean(set.skipped), set.type ?? 'working',
      exercise.notes?.map(note => note.text).join('\n'),
    ]));
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
