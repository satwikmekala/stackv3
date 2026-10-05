/** Shared display wording only; persisted identifiers and dates stay unchanged. */
export function workoutEntryLabel(index: number): string {
  return `Workout ${index >= 0 && index < 26 ? String.fromCharCode(65 + index) : index + 1}`;
}

export function shortContentDate(date: Date): string {
  return `${date.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}`;
}

export function longContentDate(date: Date): string {
  return `${date.toLocaleDateString('en-GB', { weekday: 'long' })}, ${shortContentDate(date)}`;
}

export function contentDateRange(start: Date, end: Date): string {
  return start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${shortContentDate(end)}`
    : `${shortContentDate(start)}–${shortContentDate(end)}`;
}

export function spokenTrainingCopy(text: string): string {
  return text.replace(/personal record \(PR\)/gi, 'personal record').replace(/\bPRs\b/gi, 'personal records').replace(/\bPR\b/gi, 'personal record')
    .replace(/\bBW\b/g, 'bodyweight').replace(/\b(UP NEXT|MY STACK|THIS WEEK|OPEN|COMPLETE|MOVED|BLOCKS?|LAYERS?)\b/g, value => value.toLowerCase());
}

const SAVE_ACTIONS: Record<string, string> = {
  saveAdhocRoutine: 'save your routine', createSplit: 'create your routine', renameSplit: 'rename your routine',
  deleteSplit: 'delete your routine', saveCustomSplitDraft: 'save your routine', updateCustomSplitDraft: 'save your routine',
  setProfile: 'save your profile', updateProfile: 'save your settings', setActiveSplit: 'activate your plan',
  chooseNoProgram: 'save your choice', createCustomExercise: 'create this exercise',
  startEmptyWorkout: 'start your workout', startWorkoutFromArchetype: 'start your workout', startWorkoutFromCustomWorkout: 'start your workout',
  completeWorkout: 'save your workout', discardWorkout: 'discard your workout', resetAllData: 'delete your data',
  addWorkout: 'add this workout', renameWorkout: 'rename this workout', deleteWorkout: 'delete this workout',
  moveWorkout: 'move this workout', duplicateWorkout: 'duplicate this workout',
  addExerciseToWorkout: 'add this exercise', removeExerciseFromWorkout: 'remove this exercise',
  swapCurrentSessionExercise: 'swap this exercise', appendExerciseToSession: 'add this exercise',
  logArchetypeCompletedRetroactively: 'save your workout',
};
export function saveActionErrorCopy(action: string): string {
  return `Couldn’t ${SAVE_ACTIONS[action] ?? 'save this change'}. Try again.`;
}
