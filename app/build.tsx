import { Redirect } from 'expo-router';
import { BUILD_SANDBOX_ENABLED } from '../features/build/config';

export default function BuildRoute() {
  if (!BUILD_SANDBOX_ENABLED) return <Redirect href="/" />;
  // Keep the renderer outside normal app startup while Build is experimental.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Monolith = require('../features/build/Monolith').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BuildEntry = require('../features/build/BuildEntry').default;
  return <BuildEntry><Monolith /></BuildEntry>;
}
