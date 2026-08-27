import { useEffect, type ReactNode } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { ChartNoAxesColumn, Zap } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { redesignColors, splitColors } from '@/constants/theme';
import '@/global.css';

const BAR_WIDTH = 144;
const BAR_HEIGHT = 64;
const BAR_PADDING = 5;
const ITEM_WIDTH = (BAR_WIDTH - BAR_PADDING * 2) / 2;
const ACTIVE_SIZE = 48;

function FloatingTabButton({
  index,
  focused,
  label,
  testID,
  icon,
  onPress,
  onLongPress,
}: {
  index: number;
  focused: boolean;
  label: string;
  testID?: string;
  icon: ReactNode;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      testID={testID}
      hitSlop={4}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabButton, { left: index * ITEM_WIDTH }]}
    >
      {icon}
    </Pressable>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const selectedRoute = state.routes[state.index]?.name;
  const selectedTabIndex = selectedRoute === 'index' ? 0 : 1;
  const selectedIndex = useSharedValue(selectedTabIndex);
  const visibleRoutes = state.routes.filter(
    (route) => route.name === 'index' || route.name === 'profile'
  );

  useEffect(() => {
    selectedIndex.value = withSpring(selectedTabIndex, {
      damping: 18,
      stiffness: 220,
      mass: 0.72,
    });
  }, [selectedIndex, selectedTabIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectedIndex.value * ITEM_WIDTH }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.positioner, { bottom: insets.bottom + 12 }]}>
      <View style={styles.bar}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        <View accessibilityRole="tablist" style={styles.tabRow}>
          {visibleRoutes.map((route, index) => {
            const focused = selectedTabIndex === index;
            const { options } = descriptors[route.key];
            const label =
              options.tabBarAccessibilityLabel ??
              (typeof options.title === 'string' ? options.title : route.name);
            const color = focused ? redesignColors.ink : redesignColors.ashDim;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <FloatingTabButton
                key={route.key}
                index={index}
                focused={focused}
                label={label}
                testID={options.tabBarButtonTestID}
                icon={options.tabBarIcon?.({ focused, color, size: 23 })}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarShowLabel: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarAccessibilityLabel: 'Workout',
          tabBarIcon: ({ color, size, focused }) => (
            <Zap color={color} fill={focused ? color : 'transparent'} size={size} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Progress',
          tabBarAccessibilityLabel: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <ChartNoAxesColumn color={color} size={size} strokeWidth={2.25} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    padding: BAR_PADDING,
    borderRadius: BAR_HEIGHT / 2,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#4A3E34',
    backgroundColor: '#241D18',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 23,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - ACTIVE_SIZE) / 2,
    left: BAR_PADDING + (ITEM_WIDTH - ACTIVE_SIZE) / 2,
    width: ACTIVE_SIZE,
    height: ACTIVE_SIZE,
    borderRadius: ACTIVE_SIZE / 2,
    backgroundColor: splitColors.chest,
    shadowColor: splitColors.chest,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  tabRow: {
    position: 'absolute',
    top: BAR_PADDING,
    left: BAR_PADDING,
    width: BAR_WIDTH - BAR_PADDING * 2,
    height: BAR_HEIGHT - BAR_PADDING * 2,
  },
  tabButton: {
    position: 'absolute',
    top: 0,
    width: ITEM_WIDTH,
    height: BAR_HEIGHT - BAR_PADDING * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
