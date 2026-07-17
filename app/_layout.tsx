import { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_400Regular_Italic,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const profile = useWorkoutStore((state) => state.profile);

  const [fontsLoaded, fontError] = useFonts({
    'Switzer-Regular': require('@/assets/fonts/Switzer-Regular.otf'),
    'Switzer-Medium': require('@/assets/fonts/Switzer-Medium.otf'),
    'Switzer-Semibold': require('@/assets/fonts/Switzer-Semibold.otf'),
    'Switzer-Bold': require('@/assets/fonts/Switzer-Bold.otf'),
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    BricolageGrotesque_700Bold,
    HankenGrotesk_400Regular,
    HankenGrotesk_400Regular_Italic,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (profile === null) {
      return;
    }

    const inOnboarding = segments[0] === '(onboarding)';
    const onSplash = pathname === '/';

    if (!profile.onboardingCompleted && !inOnboarding && !onSplash) {
      router.replace('/(onboarding)/welcome');
    } else if (profile.onboardingCompleted && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [pathname, profile, router, segments]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationTypeForReplace: 'pop',
          }}
        />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
