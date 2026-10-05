import { SetupLoading } from '@/features/onboarding/SetupLoading';
import { ProgramScreenFrame } from '@/features/program/ProgramScreenFrame';
import { ProgramFrequencyScreen } from '@/features/program/ProgramFrequencyScreen';
import { useProgramSetup } from '@/features/program/useProgramSetup';

export default function FrequencyRoute() {
  const flow = useProgramSetup('frequency');
  if (!flow.ready) return <SetupLoading error={flow.error} retry={flow.retry} />;
  return <ProgramScreenFrame title={flow.context === 'onboarding' ? 'How many workouts should Stack plan each week?' : 'How many workouts a week?'} number={1}
    busy={flow.busy} error={flow.error} retry={flow.retry} back={flow.back}
    primary={flow.context === 'onboarding' ? 'See my workouts' : 'Preview workouts'} disabled={flow.frequency === null || Boolean(flow.error)} onPrimary={flow.seeWorkouts}
    secondary={flow.context === 'onboarding' ? 'Decide later' : 'Skip for now'} onSecondary={flow.skip}>
    <ProgramFrequencyScreen onboarding={flow.context === 'onboarding'} frequency={flow.frequency} structure={flow.structure} busy={flow.busy} select={flow.selectFrequency} />
  </ProgramScreenFrame>;
}
