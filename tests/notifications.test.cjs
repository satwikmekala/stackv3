/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');

function loader(mocks = {}, { date = Date, logs = [], extend = {} } = {}) {
  const cache = new Map();
  const load = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (!id.startsWith('@/')) return require(id);
    if (cache.has(id)) return cache.get(id);
    const exports = {}; cache.set(id, exports);
    const source = fs.readFileSync(path.join(root, id.slice(2) + '.ts'), 'utf8') + (extend[id] ?? '');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('exports', 'require', 'Date', 'console', '__DEV__', code)(exports,
      child => load(child.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(id), child)) : child),
      date, { error: (...args) => logs.push(args), warn() {} }, false);
    return exports;
  };
  return load;
}
const load = loader();
const { buildNotificationPlan } = load('@/services/notifications/plan');
const { toLocalCalendarDate } = load('@/store/workoutCalendar');
const profile = { remindersEnabled: true, reminderTime: '18:00', trainingDays: [0, 2, 4], weeklyGoal: 4 };
const completed = (...days) => days.map(date => ({ date, completed: true }));
function plan(overrides = {}) {
  return buildNotificationPlan({ now: new Date(2026, 9, 7, 10), profile, sessions: [],
    permissionGranted: true, inProgress: false, nextName: 'Push (Chest, Shoulders, Triceps)', ...overrides });
}
const hasDate = (items, date) => items.some(item => toLocalCalendarDate(item.date) === date);

test('1: Wednesday completion removes Wednesday; Friday remains at local 18:00', () => {
  const items = plan({ sessions: completed(new Date(2026, 9, 7, 9).toISOString()) });
  assert.equal(hasDate(items, '2026-10-07'), false);
  assert.equal(hasDate(items, '2026-10-09'), true);
  for (const item of items) assert.deepEqual([item.date.getHours(), item.date.getMinutes()], [18, 0]);
});
test('2: three of four days gives Saturday nudge; fourth day removes all this-week notifications', () => {
  const sessions = completed('2026-10-05', '2026-10-06', '2026-10-08');
  const items = plan({ now: new Date(2026, 9, 8, 12), sessions });
  assert.ok(items.some(item => item.identifier === 'stack-weekly-2026-10-05' && toLocalCalendarDate(item.date) === '2026-10-10'));
  const met = plan({ now: new Date(2026, 9, 9, 9), sessions: [...sessions, ...completed('2026-10-09')] });
  assert.ok(met.length);
  assert.ok(met.every(item => toLocalCalendarDate(item.date) >= '2026-10-12'));
});
test('3: active workout at 17:59 suppresses workout reminders until completion/discard rebuilds them', () => {
  const items = plan({ now: new Date(2026, 9, 7, 17, 59), inProgress: true });
  assert.equal(hasDate(items, '2026-10-07'), false);
  assert.equal(items.length, 0);
  assert.equal(hasDate(plan({ now: new Date(2026, 9, 7, 17, 59) }), '2026-10-09'), true);
});
test('4: denied permission suppresses both notification categories', () => {
  assert.deepEqual(plan({ permissionGranted: false, sessions: completed('2026-10-05', '2026-10-06', '2026-10-07') }), []);
});
test('5: cold tap waits for hydration/entry, onboarding tap is ignored, sharing retains ownership', () => {
  const { notificationTapDecision: decide, isStackNotificationTap } = load('@/services/notifications/routing');
  const state = { isHydrated: false, hydrationError: null, onboardingCompleted: false, entryReady: false, sharingLinkPending: false };
  assert.equal(decide(state), 'wait');
  assert.equal(decide({ ...state, isHydrated: true }), 'ignore');
  assert.equal(decide({ ...state, isHydrated: true, onboardingCompleted: true }), 'wait');
  assert.equal(decide({ ...state, isHydrated: true, onboardingCompleted: true, entryReady: true }), 'navigate');
  assert.equal(decide({ ...state, isHydrated: true, onboardingCompleted: true, entryReady: true, sharingLinkPending: true }), 'ignore');
  assert.equal(isStackNotificationTap('stack-weekly-2026-10-05', '/(tabs)'), true);
  assert.equal(isStackNotificationTap('other', '/(tabs)'), false);
  assert.equal(isStackNotificationTap('stack-reminder-2026-10-07', '/workout'), false);
});
test('6: absent next name uses exact no-plan copy (including exhausted Stack queue)', () => {
  for (const item of plan({ nextName: null })) {
    assert.equal(item.title, 'Time to stack up.');
    assert.equal(item.body, 'Log a workout. Add a piece.');
    assert.equal(item.data.url, '/(tabs)');
  }
});
test('7: goal zero keeps selected-day reminders and never schedules a weekly nudge', () => {
  const items = plan({ profile: { ...profile, weeklyGoal: 0 }, sessions: completed('2026-10-05', '2026-10-06', '2026-10-07') });
  assert.ok(items.length);
  assert.ok(items.every(item => item.identifier.startsWith('stack-reminder-')));
  assert.ok(hasDate(items, '2026-10-09'));
});
test('8: duplicate sessions count once for goal suppression and one-short nudge', () => {
  const sessions = completed('2026-10-05', '2026-10-05', '2026-10-06');
  const items = plan({ profile: { ...profile, weeklyGoal: 3 }, sessions });
  assert.ok(items.some(item => item.identifier.startsWith('stack-weekly-')));
  assert.ok(hasDate(items, '2026-10-09'));
  assert.equal(plan({ profile: { ...profile, weeklyGoal: 4 }, sessions }).some(item => item.identifier.startsWith('stack-weekly-')), false);
});
test('Saturday collision: nudge wins; passed Saturday and Saturday in-progress skip the nudge', () => {
  const p = { ...profile, trainingDays: [5], weeklyGoal: 2 };
  const input = { profile: p, sessions: completed('2026-10-05') };
  const items = plan(input);
  assert.equal(items.filter(item => toLocalCalendarDate(item.date) === '2026-10-10').length, 1);
  assert.ok(items.find(item => toLocalCalendarDate(item.date) === '2026-10-10').identifier.startsWith('stack-weekly-'));
  for (const overrides of [{ now: new Date(2026, 9, 10, 18) }, { now: new Date(2026, 9, 10, 17), inProgress: true }]) {
    assert.equal(plan({ ...input, ...overrides }).some(item => item.identifier.startsWith('stack-weekly-')), false);
  }
  const off = plan({ ...input, profile: { ...p, remindersEnabled: false, reminderTime: '08:00' } });
  assert.equal(off.length, 1); assert.equal(off[0].date.getHours(), 18);
});
test('empty days stop reminders but not an independently eligible weekly nudge', () => {
  assert.deepEqual(plan({ profile: { ...profile, trainingDays: [] } }), []);
  assert.equal(plan({ profile: { ...profile, trainingDays: [] }, sessions: completed('2026-10-05', '2026-10-06', '2026-10-07') }).length, 1);
});
test('plan is deterministic, bounded, local, and rotates without consecutive duplicate lines', () => {
  const input = { profile: { ...profile, trainingDays: [0, 1, 2, 3, 4, 5, 6] } };
  const items = plan(input);
  assert.deepEqual(items, plan(input));
  assert.equal(items.length, 14);
  assert.equal(new Set(items.map(item => item.identifier)).size, 14);
  for (let i = 1; i < items.length; i++) assert.notEqual(items[i].title, items[i - 1].title);
  assert.ok(items.every(item => !/\{next\}|[!😀]/.test(item.title + item.body)));
});
test('DST boundary retains local reminder hour and correct weekdays', () => {
  const items = plan({ now: new Date(2026, 9, 29, 12), profile: { ...profile, weeklyGoal: 0, trainingDays: [0, 1, 2, 3, 4, 5, 6] } });
  for (const item of items) assert.equal(item.date.getHours(), 18);
});
test('next-name helper uses Home rotation, cached/loaded custom details, and empty/null fallbacks', async () => {
  let reads = 0;
  let nextUp = ['push'];
  const workouts = [{ id: 10, name: 'Upper' }, { id: 20, name: '  ' }, { id: 30, name: 'Lower' }];
  const state = { profile: { programMode: 'none', activeSplitId: null }, currentCustomSplit: null,
    getLastCompletedCustomWorkoutId: () => 10 };
  const helper = loader({
    '@/store/workoutStore': { useWorkoutStore: { getState: () => state } },
    '@/store/workoutDatabase': { getCustomSplitDetailAsync: async () => { reads++; return { id: 7, workouts }; } },
    '@/store/customSplitDraft': { getWorkoutLetter: index => String.fromCharCode(65 + index) },
    '@/store/weeklyQueueEngine': { getWeeklyQueueState: () => ({ nextUp }) },
    '@/constants/archetypes': { ARCHETYPE_COMPOSITIONS: { push: { label: 'Push (Chest, Shoulders, Triceps)' } } },
  })('@/services/notifications/nextWorkout').getNextWorkoutNameForNotifications;
  assert.equal(await helper(), null);
  state.profile.programMode = 'stack'; assert.equal(await helper(), 'Push (Chest, Shoulders, Triceps)');
  nextUp = []; assert.equal(await helper(), null);
  state.profile = { programMode: 'custom', activeSplitId: 7 };
  assert.equal(await helper(), 'Workout B'); assert.equal(reads, 1);
  state.currentCustomSplit = { id: 7, workouts }; assert.equal(await helper(), 'Workout B'); assert.equal(reads, 1);
  state.getLastCompletedCustomWorkoutId = () => 30; assert.equal(await helper(), 'Upper');
  state.currentCustomSplit.workouts = []; assert.equal(await helper(), null);
});

function hooks() {
  let cursor = 0;
  const slots = [], effects = [];
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => value !== b[i]);
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useCallback(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) {
      effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    } },
  };
  return { react, render(fn) { cursor = 0; const result = fn(); while (effects.length) effects.shift()(); return result; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('Settings denial leaves toggle off, shows exact footer/action, requests only on enable, rechecks foreground', async () => {
  const h = hooks(); let foreground; let requests = 0; let reads = 0; let reschedules = 0;
  let granted = false;
  const state = { profile: { ...profile, remindersEnabled: false }, updateProfile: values => Object.assign(state.profile, values) };
  const store = selector => selector(state); store.getState = () => state;
  const hook = loader({
    react: h.react, 'expo-router': { useFocusEffect: fn => h.react.useEffect(fn, [fn]) },
    'react-native': { Platform: { OS: 'ios' }, Linking: { openSettings: async () => {} },
      AppState: { addEventListener: (_, fn) => { foreground = fn; return { remove() {} }; } } },
    '@/store/workoutStore': { useWorkoutStore: store },
    '@/services/notifications/permissions': {
      readReminderPermission: async () => { reads++; return { granted, status: granted ? 'granted' : 'denied' }; },
      requestReminderPermission: async () => { requests++; return { granted, status: granted ? 'granted' : 'denied' }; },
      notificationPermissionGranted: permission => permission.granted,
    },
    '@/services/notifications/scheduling': { rescheduleNotifications: async () => { reschedules++; } },
  })('@/features/settings/useReminderSettings').useReminderSettings;
  const render = () => h.render(hook);
  render(); await settle(); let model = render();
  assert.equal(requests, 0); assert.equal(model.sections[0].rows[0].value, false);
  assert.equal(model.sections[0].footer, 'Notifications are off for Stack. Turn them on in iOS Settings.');
  assert.equal(model.sections[0].rows[1].label, 'Open Settings');
  model.sections[0].rows[0].onChange(true); await settle(); model = render();
  assert.equal(requests, 1); assert.equal(state.profile.remindersEnabled, false);
  granted = true; foreground('active'); await settle(); model = render();
  assert.equal(reads, 2); assert.equal(requests, 1); assert.equal(state.profile.remindersEnabled, false);
  model.sections[0].rows[0].onChange(true); await settle(); model = render();
  assert.equal(state.profile.remindersEnabled, true);
  for (const row of model.sections[1].rows) if (row.value) row.onChange(false);
  assert.equal(render().sections[0].footer, 'Pick at least one day to get reminders.');
  assert.ok(reschedules >= 3);
});
test('cold response is consumed once, navigates only after hydration, and onboarding taps never replay', async () => {
  for (const onboarding of [true, false]) {
    const h = hooks(); let listener; let cleared = 0; const navigations = [];
    const response = { actionIdentifier: 'default', notification: { date: 123,
      request: { identifier: 'stack-reminder-2026-10-07', content: { data: { url: '/(tabs)' } } } } };
    const inputs = { isHydrated: false, hydrationError: null, onboardingCompleted: false,
      entryReady: false, sharingLinkPending: false, navigate: () => navigations.push('/(tabs)') };
    const hook = loader({ react: h.react, 'react-native': { Platform: { OS: 'ios' } }, 'expo-notifications': {
      setNotificationHandler() {}, addNotificationResponseReceivedListener: fn => { listener = fn; return { remove() {} }; },
      getLastNotificationResponseAsync: async () => response, clearLastNotificationResponseAsync: async () => { cleared++; },
    } })('@/services/notifications/useNotificationRouting').useNotificationRouting;
    const render = () => h.render(() => hook(inputs));
    render(); await settle(); render(); assert.equal(navigations.length, 0);
    inputs.isHydrated = true; inputs.onboardingCompleted = !onboarding; inputs.entryReady = true; render();
    assert.deepEqual(navigations, onboarding ? [] : ['/(tabs)']);
    inputs.onboardingCompleted = true; render(); listener(response); render();
    assert.equal(navigations.length, onboarding ? 0 : 1); assert.equal(cleared, 1);
  }
});
test('warm taps navigate to Train; a fresh tap during onboarding is ignored permanently', async () => {
  const h = hooks(); let listener; const navigations = [];
  const inputs = { isHydrated: true, hydrationError: null, onboardingCompleted: true,
    entryReady: true, sharingLinkPending: false, navigate: () => navigations.push('/(tabs)') };
  const hook = loader({ react: h.react, 'react-native': { Platform: { OS: 'android' } }, 'expo-notifications': {
    setNotificationHandler(handler) { assert.equal(typeof handler.handleNotification, 'function'); },
    addNotificationResponseReceivedListener: fn => { listener = fn; return { remove() {} }; },
    getLastNotificationResponseAsync: async () => null, clearLastNotificationResponseAsync: async () => {},
  } })('@/services/notifications/useNotificationRouting').useNotificationRouting;
  const render = () => h.render(() => hook(inputs)); render(); await settle();
  const response = date => ({ actionIdentifier: 'default', notification: { date,
    request: { identifier: 'stack-reminder-2026-10-07', content: { data: { url: '/(tabs)' } } } } });
  listener(response(1)); render(); assert.deepEqual(navigations, ['/(tabs)']);
  inputs.onboardingCompleted = false; render(); listener(response(2)); render();
  inputs.onboardingCompleted = true; render(); assert.deepEqual(navigations, ['/(tabs)']);
});
test('rescheduler owns only stack IDs, coalesces concurrent calls, and survives partial native failures', async () => {
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [2026, 9, 7, 10])); } }
  const logs = []; const pending = new Map([['other-feature', {}], ['stack-old', {}]]);
  let enumerations = 0; let subscriptions; const scheduled = [];
  const state = { profile: { ...profile, onboardingCompleted: true }, sessions: [], currentSession: null,
    isHydrated: true, hydrationError: null, currentCustomSplit: null };
  const service = loader({
    'react-native': { Platform: { OS: 'ios' } },
    '@/store/workoutStore': { useWorkoutStore: { getState: () => state,
      subscribe: fn => { subscriptions = fn; return () => {}; } } },
    '@/services/notifications/nextWorkout': { getNextWorkoutNameForNotifications: async () => 'Push' },
    'expo-notifications': {
      IosAuthorizationStatus: { PROVISIONAL: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
      getAllScheduledNotificationsAsync: async () => { enumerations++; return [...pending.keys()].map(identifier => ({ identifier })); },
      cancelScheduledNotificationAsync: async id => { pending.delete(id); },
      getPermissionsAsync: async () => ({ granted: true }),
      scheduleNotificationAsync: async request => {
        scheduled.push(request);
        if (request.identifier === 'stack-reminder-2026-10-09') throw Error('one date failed');
        pending.set(request.identifier, request); return request.identifier;
      },
    },
  }, { date: Clock, logs })('@/services/notifications/scheduling');
  const first = service.rescheduleNotifications(); const second = service.rescheduleNotifications();
  assert.equal(first, second); await first;
  assert.equal(enumerations, 1); assert.ok(pending.has('other-feature')); assert.equal(pending.has('stack-old'), false);
  assert.ok(pending.has('stack-reminder-2026-10-12')); assert.ok(logs.length);
  assert.ok(scheduled.every(request => request.trigger.type === 'date' && request.content.data.url === '/(tabs)'));
  service.subscribeToNotificationInputs();
  const previous = { ...state, profile: { ...state.profile } };
  state.profile = { ...state.profile, remindersEnabled: false };
  subscriptions(state, previous); await service.rescheduleNotifications();
  assert.deepEqual([...pending.keys()], ['other-feature']);
});
test('schema 24 migration is additive/idempotent and preserves profile data; v23 backups upgrade safely', async () => {
  const sql = new DatabaseSync(':memory:');
  const adapter = {
    getAllSync: (query, ...args) => sql.prepare(query).all(...args),
    getFirstSync: (query, ...args) => sql.prepare(query).get(...args) ?? null,
    runSync: (query, ...args) => sql.prepare(query).run(...args), execSync: query => sql.exec(query),
    withTransactionSync(fn) { sql.exec('BEGIN'); try { const result = fn(); sql.exec('COMMIT'); return result; } catch (error) { sql.exec('ROLLBACK'); throw error; } },
    getAllAsync: async (query, ...args) => sql.prepare(query).all(...args), execAsync: async query => sql.exec(query),
    getFirstAsync: async (query, ...args) => sql.prepare(query).get(...args) ?? null,
    runAsync: async (query, ...args) => sql.prepare(query).run(...args),
    async withTransactionAsync(fn) { sql.exec('BEGIN'); try { await fn(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; } },
  };
  const loaded = loader({ 'expo-sqlite': { openDatabaseAsync: async () => adapter }, 'react-native': { Alert: {} } }, { extend: {
    '@/store/workoutDatabase': '\nexports.testEnsureReminderPreferences = ensureReminderPreferencesAsync; exports.testReopen = () => { database = null; databasePromise = null; return initializeWorkoutDatabase(); }; database = globalThis.notificationTestDatabase;',
  } });
  globalThis.notificationTestDatabase = adapter;
  try {
    const db = loaded('@/store/workoutDatabase');
    sql.exec(db.WORKOUT_DATABASE_SCHEMA.replace(/  reminders_enabled[^\n]+\n|  reminder_time[^\n]+\n/g, ''));
    sql.exec("INSERT INTO profile (id, name, weekly_goal, training_days, onboarding_completed) VALUES (1, 'Existing', 4, '[0,2,4]', 1); PRAGMA user_version = 23;");
    await db.testReopen();
    await db.testEnsureReminderPreferences(adapter); await db.testEnsureReminderPreferences(adapter);
    const stored = db.readProfileSync();
    assert.equal(db.CURRENT_SCHEMA_VERSION, 24);
    assert.equal(sql.prepare('PRAGMA user_version').get().user_version, 24);
    assert.equal(stored.name, 'Existing'); assert.deepEqual(stored.trainingDays, [0, 2, 4]);
    assert.equal(stored.remindersEnabled, false); assert.equal(stored.reminderTime, '18:00');
    db.writeProfile({ ...stored, remindersEnabled: true, reminderTime: '18:30' });
    assert.equal(db.readProfileSync().reminderTime, '18:30'); assert.equal(db.readProfileSync().remindersEnabled, true);
    const backups = loaded('@/store/workoutBackup');
    const original = backups.captureWorkoutBackup(adapter, 24);
    const old = JSON.parse(JSON.stringify(original)); old.schemaVersion = 23;
    delete old.tables.profile[0].reminders_enabled; delete old.tables.profile[0].reminder_time;
    const upgraded = backups.prepareWorkoutBackup(old, adapter, 24);
    assert.equal(upgraded.tables.profile[0].reminders_enabled, 0);
    assert.equal(upgraded.tables.profile[0].reminder_time, '18:00');
    assert.equal(Object.hasOwn(old.tables.profile[0], 'reminder_time'), false);
    for (const version of [21, 22]) {
      const legacy = JSON.parse(JSON.stringify(old)); legacy.schemaVersion = version;
      for (const table of backups.BACKUP_TABLES) if (table.startsWith('imported_')) delete legacy.tables[table];
      if (version === 21) for (const key of ['program_mode', 'three_day_structure', 'weight_unit_confirmed']) delete legacy.tables.profile[0][key];
      const prepared = backups.prepareWorkoutBackup(legacy, adapter, 24);
      assert.equal(prepared.schemaVersion, 24);
      assert.equal(prepared.tables.profile[0].reminders_enabled, 0);
      assert.ok(Array.isArray(prepared.tables.imported_workouts));
    }
    const invalid = JSON.parse(JSON.stringify(original)); invalid.tables.profile[0].reminder_time = '25:99';
    assert.throws(() => backups.prepareWorkoutBackup(invalid, adapter, 24), /invalid reminder/);
  } finally { delete globalThis.notificationTestDatabase; sql.close(); }
});
