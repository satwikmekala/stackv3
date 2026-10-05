import { NativeTabs } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { redesignColors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      tintColor="#FFFFFF"
      blurEffect="systemChromeMaterialDark"
      // Fix the native container's appearance, including iOS 26 Liquid Glass.
      // A dark background alone still lets UIKit choose a light glass material.
      unstable_nativeProps={{ colorScheme: 'dark' }}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets contentStyle={{ backgroundColor: redesignColors.ink }}>
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }}
          // One asynchronous fallback prevents a selected bitmap resolving
          // before its default. Native SF Symbols retain both iOS states.
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="barbell-outline" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" disableAutomaticContentInsets contentStyle={{ backgroundColor: redesignColors.ink }}>
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          renderingMode="template"
          src={{
            default: require('@/assets/icons/progress-outline.png'),
            selected: require('@/assets/icons/progress-filled.png'),
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stack" disableAutomaticContentInsets contentStyle={{ backgroundColor: redesignColors.ink }}>
        <NativeTabs.Trigger.Label>My Stack</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          renderingMode="template"
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="layers-outline" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
