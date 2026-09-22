import { Component, useMemo, type ReactNode } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { BUILD_SANDBOX_ENABLED } from '../features/build/config';
import { castingGate, once } from '../features/build/casting';

type Props = { sessionId: string; demo: boolean; forceFailure: boolean; onFinish: () => void };
function NativeCasting(props: Props) {
  // Loading failures are also caught by the boundary; normal startup never loads GL.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Screen = require('../features/build/CastingScreen').default;
  return <Screen {...props} />;
}
class CastingBoundary extends Component<{ children: ReactNode; onFinish: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('[Build casting skipped]', error.message); this.props.onFinish(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function CastingRoute() {
  const params = useLocalSearchParams<{ sessionId?: string; demo?: string; failure?: string }>();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
  const demo = BUILD_SANDBOX_ENABLED && params.demo === '1';
  const router = useRouter();
  const destination = useMemo(() => demo ? { pathname: '/build-sandbox' as const } : { pathname: '/workout-summary' as const, params: { sessionId } }, [demo, sessionId]);
  const finish = useMemo(() => once(() => { castingGate.discard(sessionId); router.replace(destination); }), [router, destination, sessionId]);
  if (!BUILD_SANDBOX_ENABLED) return <Redirect href={destination} />;
  return <CastingBoundary key={`${demo}:${sessionId}`} onFinish={finish}><NativeCasting sessionId={sessionId} demo={demo} forceFailure={params.failure === 'renderer'} onFinish={finish} /></CastingBoundary>;
}
