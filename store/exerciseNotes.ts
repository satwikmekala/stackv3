export interface ExerciseNote {
  id: number;
  exerciseId: number;
  workoutId: string | null;
  text: string;
  createdAt: string;
}

export const EXERCISE_NOTE_MAX_LENGTH = 2000;

export function normalizeExerciseNote(value: string): string {
  const text = value.trim();
  if (!text) throw new Error('Write a note before saving.');
  if (text.length > EXERCISE_NOTE_MAX_LENGTH) {
    throw new Error(`Keep your note under ${EXERCISE_NOTE_MAX_LENGTH.toLocaleString()} characters.`);
  }
  return text;
}
