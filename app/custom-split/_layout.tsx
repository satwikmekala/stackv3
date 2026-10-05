import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { redesignColors } from '@/constants/theme';

export default function CustomSplitLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: redesignColors.ink },
      headerStyle: { backgroundColor: redesignColors.ink }, headerTintColor: redesignColors.bone,
      headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ headerShown: true, title: 'Edit routine' }} />
      <Stack.Screen name="review" options={{ headerShown: true, title: 'Review routine' }} />
      <Stack.Screen name="exercises" options={{ presentation: 'modal', headerShown: Platform.OS === 'ios', title: '',
        headerStyle: { backgroundColor: redesignColors.ink }, headerTintColor: redesignColors.bone, headerShadowVisible: false }} />
      <Stack.Screen name="personalize" options={{ presentation: 'modal' }} />
      <Stack.Screen name="template" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="new-exercise"
        options={{
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
