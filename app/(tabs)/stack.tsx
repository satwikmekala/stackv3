import BuildEntry from '@/features/build/BuildEntry';
import { ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import StackDiscovery from '@/features/build/StackDiscovery';
import Monolith from '@/features/build/Monolith';

/** A destination now; the existing introduction and saved-history renderer are preserved. */
export default function StackTab() {
  if (ONBOARDING_PREVIEW_ENABLED) return <StackDiscovery />;
  return <BuildEntry><Monolith isTab /></BuildEntry>;
}
