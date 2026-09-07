import { Stack } from 'expo-router';

export default function CustomSplitLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="review" />
      <Stack.Screen
        name="new-exercise"
        options={{
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
          presentation: 'transparentModal',
        }}
      />
    </Stack>
  );
}
