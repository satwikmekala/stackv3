import { loadMuscleColors } from '@/store/muscleColors';
import { loadAppPreferences } from '@/store/appPreferences';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
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
import { startWorkoutLiveActivitySync } from '@/services/liveActivity/sync';
import { startWorkoutLiveActivityInteractions } from '@/services/liveActivity/interaction';
import '@/global.css';
import { BUILD_DEMO_ENABLED } from '@/features/build/config';
import { splitImportRouteFromUrl } from '@/features/sharing/splitLinkRouting';
import { redesignColors } from '@/constants/theme';
import { FIRST_RUN_ROUTE, ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import { clearOnboardingDraft } from '@/store/onboardingDraft';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const hasHiddenSplashRef = useRef(false);
  const lastRedirectRef = useRef<string | null>(null);
  const [initialImport, setInitialImport] = useState<ReturnType<typeof splitImportRouteFromUrl>>(null);
  const [initialLinkRead, setInitialLinkRead] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const profile = useWorkoutStore((state) => state.profile);
  const isHydrated = useWorkoutStore((state) => state.isHydrated);
  const hydrationError = useWorkoutStore((state) => state.hydrationError);
  const inOnboarding = segments[0] === '(onboarding)';
  const inCustomSplitFlow = segments[0] === 'custom-split';
  // A received link can be previewed and saved before first-run setup. Keep
  // its payload on this route instead of losing it to the onboarding redirect.
  const inSplitImport = pathname === '/import-split';
  const inHevyImport = pathname === '/bring-workouts' || pathname === '/hevy-import' || pathname === '/hevy-file-import' ||
    pathname === '/paste-routine';
  const inOnboardingPreview = ONBOARDING_PREVIEW_ENABLED &&
    (pathname === '/onboarding-preview' || pathname.startsWith('/onboarding-preview/') ||
      pathname === '/program-setup' || pathname.startsWith('/program-setup/'));
  const onSplash = pathname === '/' && segments[0] !== '(tabs)';
  const inBuildSandbox = BUILD_DEMO_ENABLED && (pathname === '/build-sandbox' || pathname === '/build' || pathname === '/build-casting'
    || pathname === '/build-case' || pathname.startsWith('/build-case/'));
  const needsOnboardingRedirect =
    initialLinkRead && !initialImport &&
    isHydrated &&
    !profile?.onboardingCompleted &&
    !inOnboarding &&
    !inCustomSplitFlow &&
    !inSplitImport &&
    !inHevyImport &&
    !inBuildSandbox &&
    !inOnboardingPreview &&
    !onSplash;
  const needsAppRedirect =
    initialLinkRead && !initialImport &&
    isHydrated &&
    Boolean(profile?.onboardingCompleted) &&
    (inOnboarding || onSplash && !ONBOARDING_PREVIEW_ENABLED);
  const redirectPending = !initialLinkRead || Boolean(initialImport && !inSplitImport && !hydrationError) ||
    needsOnboardingRedirect || needsAppRedirect;

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
    void loadMuscleColors();
    void loadAppPreferences();
    void initializeWorkoutStore().catch((error) => {
      console.error('Failed to initialize workout database', error);
    });
  }, []);

  useEffect(() => {
    // Retry cleanup after a crash or failed AsyncStorage removal following a
    // committed profile. Completed users still enter the app directly.
    if (isHydrated && profile?.onboardingCompleted) void clearOnboardingDraft().catch(() => {});
  }, [isHydrated, profile?.onboardingCompleted]);

  useEffect(() => {
    let cancelled = false;
    void Linking.getInitialURL().then((url) => {
      if (!cancelled) setInitialImport(splitImportRouteFromUrl(url));
    }).catch(() => {
      // Router still handles its ordinary links if the native lookup fails.
    }).finally(() => {
      if (!cancelled) setInitialLinkRead(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => startWorkoutLiveActivitySync(), []);

  useEffect(() => {
    if ((!fontsLoaded && !fontError) || !isHydrated || hydrationError || redirectPending) return;
    return startWorkoutLiveActivityInteractions((workoutId, needsFeedback) => {
      if (!needsFeedback) return;
      router.navigate({ pathname: '/workout', params: {
        fromActivityCard: '1', finishFromActivity: needsFeedback ? workoutId : '',
      } });
    });
  }, [fontError, fontsLoaded, hydrationError, isHydrated, redirectPending, router]);

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
    if (!initialLinkRead) return;
    if (initialImport && !hydrationError) {
      if (inSplitImport) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Consume the native launch intent only after Router confirms arrival.
        setInitialImport(null);
        lastRedirectRef.current = null;
      } else if ((fontsLoaded || fontError) && isHydrated && lastRedirectRef.current !== 'initial-split-import') {
        lastRedirectRef.current = 'initial-split-import';
        router.replace(initialImport);
      }
      return;
    }
    let target: string | null = null;
    if (hydrationError && !onSplash) {
      target = '/';
    } else if (needsOnboardingRedirect) {
      target = FIRST_RUN_ROUTE;
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
  }, [fontError, fontsLoaded, hydrationError, initialImport, initialLinkRead, inSplitImport, isHydrated,
    needsAppRedirect, needsOnboardingRedirect, onSplash, router]);

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
        <Stack.Screen name="workout-unit" options={{ headerShown: false, presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, contentStyle: { backgroundColor: redesignColors.ink } }} />
        <Stack.Screen name="build-casting" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen
          name="workout-summary"
          options={({ route }) => {
            const fromHistory = !!(route.params && 'source' in route.params && route.params.source === 'history');
            return {
              headerShown: true,
              title: 'Workout summary',
              // iOS: content scrolls under a transparent bar that softens it away (Apple's
              // soft scroll edge on iOS 26, a thin material before) instead of a hard cut.
              ...(Platform.OS === 'ios' ? {
                headerTransparent: true,
                headerStyle: { backgroundColor: 'transparent' },
                ...(Number.parseInt(String(Platform.Version), 10) >= 26
                  ? { scrollEdgeEffects: { top: 'soft', bottom: 'hidden', left: 'hidden', right: 'hidden' } as const }
                  : { headerBlurEffect: 'systemThinMaterialDark' as const }),
              } : { headerStyle: { backgroundColor: redesignColors.ink } }),
              headerTintColor: redesignColors.bone,
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              headerBackVisible: fromHistory,
              gestureEnabled: fromHistory,
              animation: fromHistory ? 'slide_from_right' : 'fade',
              animationTypeForReplace: 'push',
            };
          }}
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
          options={{
            headerShown: true,
            title: 'History',
            headerBackTitle: 'Progress',
            // Keep the system glass/back glyph legible on Stack's dark surface.
            unstable_nativeProps: { headerConfig: { experimental_userInterfaceStyle: 'dark' } },
            headerStyle: { backgroundColor: redesignColors.ink },
            headerTintColor: redesignColors.bone,
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="history-week"
          options={{
            headerShown: true,
            title: 'Weekly history',
            headerBackTitle: 'History',
            unstable_nativeProps: { headerConfig: { experimental_userInterfaceStyle: 'dark' } },
            headerStyle: { backgroundColor: redesignColors.ink },
            headerTintColor: redesignColors.bone,
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="your-splits"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="import-split" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ headerShown: true, presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      {/* Keep import and recap actions unobstructed while a workout stays active. */}
      {!inSplitImport && pathname !== '/workout-summary' && pathname !== '/settings' && pathname !== '/workout-unit' && <ActiveWorkoutBar />}
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
