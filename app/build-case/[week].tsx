export default function UnpackedWeekRoute() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const UnpackedWeek = require('../../features/build/UnpackedWeek').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BuildEntry = require('../../features/build/BuildEntry').default;
  // The intro gate is read from memory: once seen, this route opens straight to the week.
  return <BuildEntry><UnpackedWeek /></BuildEntry>;
}
