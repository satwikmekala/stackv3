import { requireOptionalNativeModule } from 'expo';

type ProfilerModule = { markStackLiveActivityLatency?: (stage: string, commandId: string, detail: string) => void };
let profiler: ProfilerModule | null | undefined;

// Debug builds only. Native signposts share the command UUID and revision
// emitted by the journal, without changing workout state or command identity.
export function markLiveActivityLatency(stage: string, commandId = '', detail = '') {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  profiler ??= requireOptionalNativeModule<ProfilerModule>('ExpoWidgets');
  profiler?.markStackLiveActivityLatency?.(stage, commandId, detail);
}
