import { useRouter } from 'expo-router';
import BuildEntry from '@/features/build/BuildEntry';

export default function StackHelp() {
  const router = useRouter();
  return <BuildEntry forceIntroduction onFinish={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/stack')}>{null}</BuildEntry>;
}
