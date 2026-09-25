import { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { ActiveWorkoutBar } from '@/components/ActiveWorkoutBar';
import { initializeWorkoutStore, useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';
import { BUILD_SANDBOX_ENABLED } from '@/features/build/config';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const hasHiddenSplashRef = useRef(false);
  const lastRedirectRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const profile = useWorkoutStore((state) => state.profile);
  const isHydrated = useWorkoutStore((state) => state.isHydrated);
  const hydrationError = useWorkoutStore((state) => state.hydrationError);
  const inOnboarding = segments[0] === '(onboarding)';
  const inCustomSplitFlow = segments[0] === 'custom-split';
  const onSplash = pathname === '/' && segments[0] !== '(tabs)';
  const inBuildSandbox = BUILD_SANDBOX_ENABLED && (pathname === '/build-sandbox' || pathname === '/build' || pathname === '/build-casting'
    || pathname === '/build-case' || pathname.startsWith('/build-case/'));
  const needsOnboardingRedirect =
    isHydrated &&
    !profile?.onboardingCompleted &&
    !inOnboarding &&
    !inCustomSplitFlow &&
    !inBuildSandbox &&
    !onSplash;
  const needsAppRedirect =
    isHydrated &&
    Boolean(profile?.onboardingCompleted) &&
    (inOnboarding || onSplash);
  const redirectPending = needsOnboardingRedirect || needsAppRedirect;

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
    void initializeWorkoutStore().catch((error) => {
      console.error('Failed to initialize workout database', error);
    });
  }, []);

  useEffect(() => {
    if (
      (fontsLoaded || fontError) &&
      (isHydrated || hydrationError) &&
      !redirectPending &&
      !hasHiddenSplashRef.current
    ) {
      hasHiddenSplashRef.current = true;
      void SplashScreen.hideAsync().catch((error) => {
        console.error('Failed to hide native splash screen', error);
      });
    }
  }, [fontError, fontsLoaded, hydrationError, isHydrated, redirectPending]);

  useEffect(() => {
    let target: string | null = null;
    if (hydrationError && !onSplash) {
      target = '/';
    } else if (needsOnboardingRedirect) {
      target = '/(onboarding)/welcome';
    } else if (needsAppRedirect) {
      target = '/(tabs)';
    }

    if (target !== null) {
      if (target !== lastRedirectRef.current) {
        lastRedirectRef.current = target;
        router.replace(target as Parameters<typeof router.replace>[0]);
      }
    } else {
      // No redirect needed — clear the guard so a genuine future state
      // change (e.g. real logout/re-onboard) is never blocked by a stale ref.
      lastRedirectRef.current = null;
    }
  }, [hydrationError, needsAppRedirect, needsOnboardingRedirect, onSplash, router]);

  if (
    (!fontsLoaded && !fontError) ||
    (!isHydrated && !hydrationError)
  ) {
    return null;
  }

  return (
    <GestureHandlerRootView>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="custom-split"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="workout"
          options={({ route }) => ({
            headerShown: false,
            gestureEnabled: false,
            presentation: 'transparentModal',
            contentStyle: { backgroundColor: 'transparent' },
            // These surfaces own their transitions, including the first frame.
            animation: route.params && (
              ('fromActivityCard' in route.params && route.params.fromActivityCard === '1') ||
              'launchOrigin' in route.params
            ) ? 'none' : 'fade',
            animationTypeForReplace: 'pop',
          })}
        />
        <Stack.Screen name="build-casting" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen
          name="workout-summary"
          options={({ route }) => ({
            headerShown: false,
            gestureEnabled: false,
            animation:
              route.params && 'source' in route.params && route.params.source === 'history'
                ? 'slide_from_right'
                : 'fade',
            animationTypeForReplace: 'push',
          })}
        />
        <Stack.Screen
          name="records"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="record-detail"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="history"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="history-week"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="your-splits"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <ActiveWorkoutBar />
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
