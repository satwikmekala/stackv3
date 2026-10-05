/**
 * Reads Stack's exercise catalog and existing aliases straight from the app
 * source, so the server never keeps a hand-maintained copy:
 *
 *   store/workoutDatabase.ts   EXERCISE_SEEDS, ARCHETYPE_EXERCISE_SEEDS
 *                              ARCHETYPE_TEMPLATE_SEEDS (exerciseName → matchingExerciseName)
 *   constants/exerciseInfo.ts  title → its single catalog alias
 *
 * The literals are pure data; they're located with the TypeScript AST and
 * evaluated in isolation (image `require`s are stubbed). Runs at sync time
 * only, never on Railway.
 */
const fs = require('node:fs');
const path = require('node:path');

const loadTypeScript = (root) => require(require.resolve('typescript', { paths: [root] }));

const findArrayLiterals = (ts, file, names) => {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true);
  const found = {};
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text)) {
      let init = node.initializer;
      // defineExerciseSeeds([...]) → [...]
      if (init && ts.isCallExpression(init)) init = init.arguments[0];
      if (!init || !ts.isArrayLiteralExpression(init)) throw new Error(`${node.name.text} is not an array literal`);
      found[node.name.text] = new Function('require', `return (${init.getText(source)});`)(() => null);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const name of names) if (!found[name]) throw new Error(`${name} not found in ${file}`);
  return found;
};

/** Mirrors `defineExerciseSeeds` in store/workoutDatabase.ts. */
const withSeedDefaults = (seed) => ({
  name: seed.name,
  workoutType: seed.workoutType,
  primaryMuscle: seed.primaryMuscle,
  loadType: seed.loadType ?? 'external_weight',
  metric: seed.metric ?? 'reps',
});

const extractStackCatalog = (root) => {
  const ts = loadTypeScript(root);
  const db = findArrayLiterals(ts, path.join(root, 'store/workoutDatabase.ts'), [
    'EXERCISE_SEEDS',
    'ARCHETYPE_EXERCISE_SEEDS',
    'ARCHETYPE_TEMPLATE_SEEDS',
  ]);
  const { exerciseInfo } = findArrayLiterals(ts, path.join(root, 'constants/exerciseInfo.ts'), ['exerciseInfo']);

  const exercises = [...db.EXERCISE_SEEDS, ...db.ARCHETYPE_EXERCISE_SEEDS].map(withSeedDefaults);
  const names = new Set(exercises.map((exercise) => exercise.name));
  const aliases = [];
  const seen = new Set();
  const add = (alias, name, source) => {
    const id = `${alias}\u0000${name}`;
    if (alias === name || !names.has(name) || seen.has(id)) return;
    seen.add(id);
    aliases.push({ alias, name, source });
  };
  for (const seed of db.ARCHETYPE_TEMPLATE_SEEDS) add(seed.exerciseName, seed.matchingExerciseName, 'stack_template');
  for (const info of exerciseInfo) {
    if (names.has(info.title)) continue;
    const targets = (info.aliases ?? []).filter((alias) => names.has(alias));
    // A title covering several catalog exercises is not an alias for any one.
    if (targets.length === 1) add(info.title, targets[0], 'exercise_info');
  }
  return { exercises, aliases };
};

module.exports = { extractStackCatalog, loadTypeScript };
