import { Redirect } from 'expo-router';
import { BUILD_SANDBOX_ENABLED } from '../../features/build/config';
export default function UnpackedWeekRoute() {
  if (!BUILD_SANDBOX_ENABLED) return <Redirect href="/" />;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const UnpackedWeek = require('../../features/build/UnpackedWeek').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BuildEntry = require('../../features/build/BuildEntry').default;
  // The intro gate is read from memory: once seen, this route opens straight to the week.
  return <BuildEntry><UnpackedWeek /></BuildEntry>;
}
