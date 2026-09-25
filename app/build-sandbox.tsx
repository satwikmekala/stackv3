import { Redirect } from 'expo-router';
import { BUILD_DEMO_ENABLED } from '../features/build/config';

export default function BuildSandboxRoute() {
  if (!BUILD_DEMO_ENABLED) return <Redirect href="/" />;
  // Keep the native GL runtime out of the normal workout startup path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sandbox = require('../features/build/BuildSandbox').default;
  return <Sandbox />;
}
