import { SetupLoading } from '@/features/onboarding/SetupLoading';
import { ProgramScreenFrame } from '@/features/program/ProgramScreenFrame';
import { ProgramPreviewScreen } from '@/features/program/ProgramPreviewScreen';
import { useProgramSetup } from '@/features/program/useProgramSetup';

export default function PreviewRoute() {
  const flow = useProgramSetup('program-preview');
  if (!flow.ready) return <SetupLoading error={flow.error} retry={flow.retry} />;
  return <ProgramScreenFrame title={flow.context === 'onboarding' ? 'Your starting lineup.' : 'Stack’s plan'} number={2} busy={flow.busy} error={flow.error} retry={flow.retry} back={flow.back}
    primary={flow.context === 'onboarding' ? 'Use these workouts' : 'Use Stack’s plan'} disabled={flow.frequency === null || flow.loadingWorkouts || Boolean(flow.workoutError || flow.error) || flow.lineup.length !== flow.frequency} onPrimary={flow.useWorkouts}
    secondary={flow.context === 'onboarding' ? 'Explore without a program' : 'Skip for now'} onSecondary={flow.skip}>
    <ProgramPreviewScreen onboarding={flow.context === 'onboarding'} frequency={flow.frequency} structure={flow.structure} busy={flow.busy} selectStructure={flow.selectStructure}
      lineup={flow.lineup} loading={flow.loadingWorkouts} error={flow.workoutError} retry={flow.retryWorkouts} />
  </ProgramScreenFrame>;
}
