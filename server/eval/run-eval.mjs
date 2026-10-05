#!/usr/bin/env node
/**
 * Runs the pasted-routine test set and reports what matters:
 * parse success, automatic / uncertain / unresolved matches, INCORRECT
 * matches, invalid model responses, latency and OpenRouter cost.
 *
 *   OPENROUTER_API_KEY=… node server/eval/run-eval.mjs           # live, in-process
 *   node server/eval/run-eval.mjs --url https://…/                # live, deployed server
 *   node server/eval/run-eval.mjs --offline                       # resolver + grounding only, no AI
 *   … --runs 3 --case whatsapp --model deepseek/deepseek-v3.2 --concurrency 4
 *
 * Results are written to server/eval/results/ (gitignored). The pasted
 * texts are fixtures, not user data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../src/config.mjs';
import { createRoutineImportService, STACK_CATALOG } from '../src/routineImportService.mjs';
import { createExerciseResolver, looseExerciseKey } from '../src/stack/exerciseResolver.mjs';
import { buildRoutineImportResult } from '../src/stack/routineImportResult.mjs';
import { EVAL_CASES } from './cases.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const offline = args.includes('--offline');
const url = option('url', null);
const runs = Number(option('runs', 1));
const concurrency = Number(option('concurrency', 4));
const onlyCase = option('case', null);
const model = option('model', null);

const config = loadConfig({ ...process.env, ...(model ? { OPENROUTER_MODEL: model } : {}), RATE_LIMIT_PER_MINUTE: '0' });
if (!offline && !url && !config.openRouterApiKey) {
  console.error('Set OPENROUTER_API_KEY (or use --url / --offline).');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Expectations
// ---------------------------------------------------------------------------

const parsePrescription = (text) => {
  if (text === undefined) return undefined;
  if (text === '-') return { sets: null, reps: null, durationSeconds: null };
  let match;
  if ((match = /^(\d+)x(\d+)$/.exec(text))) return { sets: +match[1], reps: { type: 'fixed', value: +match[2] } };
  if ((match = /^(\d+)x(\d+)-(\d+)$/.exec(text))) return { sets: +match[1], reps: { type: 'range', min: +match[2], max: +match[3] } };
  if ((match = /^x(\d+)$/.exec(text))) return { sets: +match[1], reps: null };
  if (/^\d+(,\d+)+$/.test(text)) {
    const values = text.split(',').map(Number);
    return { sets: values.length, reps: values.every((v) => v === values[0]) ? { type: 'fixed', value: values[0] } : { type: 'perSet', values } };
  }
  if ((match = /^(\d+)s$/.exec(text))) return { durationSeconds: +match[1] };
  throw new Error(`Unknown prescription "${text}"`);
};

const prescriptionMatches = (expected, actual) =>
  Object.entries(expected).every(([key, value]) => JSON.stringify(actual[key] ?? null) === JSON.stringify(value));

const sameRaw = (a, b) => {
  const x = looseExerciseKey(a);
  const y = looseExerciseKey(b);
  return x === y || (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x)));
};

/** Pretends to be a perfect model, so offline runs test only Stack's side. */
const idealParse = (testCase) => ({
  routineName: null,
  notes: [],
  unsupported: [],
  workouts: testCase.workouts.map((workout) => ({
    name: workout.name,
    notes: [],
    exercises: workout.exercises.map((exercise) => {
      const p = parsePrescription(exercise.prescription) ?? {};
      const reps = p.reps;
      return {
        rawName: exercise.raw,
        sets: reps?.type === 'perSet' ? null : p.sets ?? null,
        reps: reps?.type === 'fixed' ? reps.value : null,
        repsPerSet: reps?.type === 'perSet' ? reps.values : null,
        repsMin: reps?.type === 'range' ? reps.min : null,
        repsMax: reps?.type === 'range' ? reps.max : null,
        durationSeconds: p.durationSeconds ?? null,
        notes: [],
        group: null,
      };
    }),
  })),
});

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

const service = offline || url ? null : createRoutineImportService({ config });
const resolver = createExerciseResolver(STACK_CATALOG);

const runOne = async (testCase) => {
  const started = performance.now();
  if (offline) {
    return { ok: true, result: buildRoutineImportResult(idealParse(testCase), testCase.text, resolver), meta: { latencyMs: 0, usage: {}, failures: [], attempts: 0 } };
  }
  if (url) {
    const response = await fetch(new URL('/v1/routine-import/parse', url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.STACK_CLIENT_KEY ? { 'x-stack-client-key': process.env.STACK_CLIENT_KEY } : {}) },
      body: JSON.stringify({ text: testCase.text }),
    });
    const body = await response.json();
    const latencyMs = Math.round(performance.now() - started);
    if (!response.ok) return { ok: false, error: body.error, meta: { latencyMs, usage: {}, failures: [{ code: body.error?.code }], attempts: 1 } };
    const { meta, ...result } = body;
    return { ok: true, result, meta: { ...meta, latencyMs, failures: [] } };
  }
  return service.parse(testCase.text);
};

const score = (testCase, outcome) => {
  const row = {
    id: testCase.id,
    category: testCase.category,
    ok: outcome.ok,
    error: outcome.ok ? null : outcome.error?.code,
    latencyMs: outcome.meta.latencyMs,
    costUsd: outcome.meta.usage?.costUsd ?? null,
    promptTokens: outcome.meta.usage?.promptTokens ?? null,
    completionTokens: outcome.meta.usage?.completionTokens ?? null,
    invalidModelResponses: (outcome.meta.failures ?? []).filter((f) => f.code === 'invalid_model_output').length,
    failures: outcome.meta.failures ?? [],
    attempts: outcome.meta.attempts,
    expectedExercises: testCase.workouts.reduce((n, w) => n + w.exercises.length, 0),
    matchedCorrect: 0,
    incorrect: [],
    uncertain: 0,
    uncertainGoodSuggestion: 0,
    unresolved: 0,
    missing: [],
    extra: [],
    prescriptionChecked: 0,
    prescriptionCorrect: 0,
    prescriptionErrors: [],
    workoutCountOk: null,
    exercises: [],
  };
  if (!outcome.ok) return row;
  const { result } = outcome;
  row.workoutCountOk = result.routine.workouts.length === testCase.workouts.length;
  row.importReady = result.importDraft.ready;
  row.warnings = result.warnings.map((w) => w.code);

  const actual = result.routine.workouts.flatMap((w) => w.exercises);
  const used = new Set();
  for (const expected of testCase.workouts.flatMap((w) => w.exercises)) {
    const found = actual.find((exercise) => !used.has(exercise.id) && sameRaw(exercise.rawName, expected.raw));
    if (!found) {
      row.missing.push(expected.raw);
      continue;
    }
    used.add(found.id);
    const accept = expected.accept;
    row.exercises.push({ raw: found.rawName, status: found.status, method: found.matchMethod, matched: found.matchedName, suggested: found.suggestedMatch });
    if (found.status === 'matched') {
      if (accept && accept.includes(found.matchedName)) row.matchedCorrect += 1;
      else row.incorrect.push(`${found.rawName} → ${found.matchedName} (expected ${accept ? accept.join(' / ') : 'no match'})`);
    } else if (found.status === 'uncertain') {
      row.uncertain += 1;
      if (accept && accept.includes(found.suggestedMatch)) row.uncertainGoodSuggestion += 1;
    } else {
      row.unresolved += 1;
    }
    const prescription = parsePrescription(expected.prescription);
    if (prescription) {
      row.prescriptionChecked += 1;
      if (prescriptionMatches(prescription, found)) row.prescriptionCorrect += 1;
      else row.prescriptionErrors.push(`${found.rawName}: got ${JSON.stringify({ sets: found.sets, reps: found.reps, durationSeconds: found.durationSeconds })}, expected ${expected.prescription}`);
    }
  }
  row.extra = actual.filter((exercise) => !used.has(exercise.id)).map((exercise) => `${exercise.rawName} [${exercise.status}${exercise.matchedName ? ` → ${exercise.matchedName}` : ''}]`);
  // Extra exercises that auto-matched are invented or mis-split: count them as incorrect.
  for (const exercise of actual.filter((e) => !used.has(e.id) && e.status === 'matched')) {
    row.incorrect.push(`${exercise.rawName} → ${exercise.matchedName} (not in the expected routine)`);
  }
  if (testCase.expectNotes) {
    const notes = JSON.stringify([result.routine.notes, result.routine.workouts.map((w) => [w.notes, w.exercises.map((e) => e.notes)])]).toLowerCase();
    row.notesKept = testCase.expectNotes.every((note) => notes.includes(note));
  }
  if (testCase.expectGroups) row.groups = new Set(actual.map((e) => e.group).filter(Boolean)).size;
  if (testCase.expectUnsupported) row.unsupportedKept = result.routine.unsupported.length > 0;
  return row;
};

const cases = EVAL_CASES.filter((testCase) => !onlyCase || testCase.id === onlyCase);
const jobs = [];
for (let run = 1; run <= runs; run += 1) for (const testCase of cases) jobs.push({ run, testCase });

const rows = [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
  while (next < jobs.length) {
    const { run, testCase } = jobs[next++];
    const outcome = await runOne(testCase);
    const row = { run, ...score(testCase, outcome) };
    rows.push(row);
    const flag = !row.ok ? `FAILED ${row.error}` : row.incorrect.length ? `INCORRECT ${row.incorrect.length}` : 'ok';
    console.error(`[run ${run}] ${testCase.id.padEnd(20)} ${String(row.latencyMs).padStart(6)} ms  ${flag}`);
  }
}));
rows.sort((a, b) => a.run - b.run || cases.indexOf(cases.find((c) => c.id === a.id)) - cases.indexOf(cases.find((c) => c.id === b.id)));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const sum = (key) => rows.reduce((n, row) => n + (typeof row[key] === 'number' ? row[key] : 0), 0);
const okRows = rows.filter((row) => row.ok);
const latencies = okRows.map((row) => row.latencyMs).sort((a, b) => a - b);
const percentile = (p) => (latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] : null);
const costs = okRows.map((row) => row.costUsd).filter((cost) => typeof cost === 'number');
const totals = {
  mode: offline ? 'offline (ideal parse)' : url ? `live via ${url}` : `live in-process`,
  model: offline ? null : config.model,
  runs,
  routines: rows.length,
  parsedSuccessfully: okRows.length,
  workoutCountCorrect: okRows.filter((row) => row.workoutCountOk).length,
  expectedExercises: sum('expectedExercises'),
  matchedAutomatically: sum('matchedCorrect') + rows.reduce((n, row) => n + row.incorrect.length, 0),
  matchedCorrectly: sum('matchedCorrect'),
  incorrectMatches: rows.reduce((n, row) => n + row.incorrect.length, 0),
  uncertain: sum('uncertain'),
  uncertainWithCorrectSuggestion: sum('uncertainGoodSuggestion'),
  unresolved: sum('unresolved'),
  missingExercises: rows.reduce((n, row) => n + row.missing.length, 0),
  extraExercises: rows.reduce((n, row) => n + row.extra.length, 0),
  prescriptionsCorrect: `${sum('prescriptionCorrect')}/${sum('prescriptionChecked')}`,
  invalidModelResponses: sum('invalidModelResponses'),
  failedParses: rows.length - okRows.length,
  avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
  p50LatencyMs: percentile(50),
  p95LatencyMs: percentile(95),
  avgCostUsd: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null,
  maxCostUsd: costs.length ? Math.max(...costs) : null,
  avgPromptTokens: okRows.length ? Math.round(sum('promptTokens') / okRows.length) : null,
  avgCompletionTokens: okRows.length ? Math.round(sum('completionTokens') / okRows.length) : null,
};

console.log('\nCase                 ok  exp  auto  uncert  unres  wrong  miss  extra  rx      ms');
for (const row of rows) {
  console.log([
    `${runs > 1 ? `${row.run}:` : ''}${row.id}`.padEnd(20),
    row.ok ? ' ✓ ' : ' ✗ ',
    String(row.expectedExercises).padStart(4),
    String(row.matchedCorrect + row.incorrect.length).padStart(5),
    String(row.uncertain).padStart(7),
    String(row.unresolved).padStart(6),
    String(row.incorrect.length).padStart(6),
    String(row.missing.length).padStart(5),
    String(row.extra.length).padStart(6),
    `${row.prescriptionCorrect}/${row.prescriptionChecked}`.padStart(6),
    String(row.latencyMs).padStart(7),
  ].join(' '));
}
const details = rows.filter((row) => row.failures.length || row.incorrect.length || row.missing.length || row.extra.length || row.prescriptionErrors.length || !row.ok);
if (details.length) {
  console.log('\nDetails');
  for (const row of details) {
    console.log(`- ${row.id}${runs > 1 ? ` (run ${row.run})` : ''}`);
    if (!row.ok) console.log(`    failed: ${row.error}`);
    for (const failure of row.failures) console.log(`    attempt failed: ${failure.code} — ${failure.detail}`);
    for (const line of row.incorrect) console.log(`    INCORRECT: ${line}`);
    for (const line of row.missing) console.log(`    missing: ${line}`);
    for (const line of row.extra) console.log(`    extra: ${line}`);
    for (const line of row.prescriptionErrors) console.log(`    prescription: ${line}`);
  }
}
console.log('\nUncertain / unresolved');
for (const row of rows.filter((r) => r.run === 1)) {
  for (const exercise of row.exercises.filter((e) => e.status !== 'matched')) {
    console.log(`  ${row.id.padEnd(20)} ${exercise.raw.padEnd(22)} ${exercise.status.padEnd(10)} ${exercise.suggested ? `→ ${exercise.suggested}` : ''}`);
  }
}
console.log('\nTotals');
console.log(JSON.stringify(totals, null, 2));

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'results');
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}${offline ? '-offline' : ''}.json`);
fs.writeFileSync(file, JSON.stringify({ totals, rows }, null, 2));
console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
