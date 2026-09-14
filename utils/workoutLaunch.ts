export type WorkoutLaunchOrigin = {
  x: number;
  y: number;
  size: number;
  color: string;
};

// Route parameters are also reachable through deep links. Invalid or stale
// geometry falls back to the normal screen entrance.
export function parseWorkoutLaunchOrigin(value?: string): WorkoutLaunchOrigin | null {
  if (!value) return null;
  try {
    const origin = JSON.parse(value) as WorkoutLaunchOrigin;
    if (
      !origin ||
      !Number.isFinite(origin.x) || !Number.isFinite(origin.y) ||
      !Number.isFinite(origin.size) || origin.size < 24 || origin.size > 200 ||
      typeof origin.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(origin.color)
    ) return null;
    return { x: origin.x, y: origin.y, size: origin.size, color: origin.color };
  } catch {
    return null;
  }
}
