import { Redirect } from 'expo-router';
import { BUILD_SANDBOX_ENABLED } from '../features/build/config';
export default function CaseRoute() {
  if (!BUILD_SANDBOX_ENABLED) return <Redirect href="/" />;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Case = require('../features/build/Case').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BuildEntry = require('../features/build/BuildEntry').default;
  return <BuildEntry><Case /></BuildEntry>;
}
