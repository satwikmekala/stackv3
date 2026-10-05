import { Children, Fragment, type ComponentType, type ReactNode } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { redesignColors as c } from '@/constants/theme';

const SEGMENT = 60;

/**
 * One floating capsule over the logger holding independent exercise actions,
 * like a native grouped toolbar item. The material sits behind the buttons so
 * each action keeps its own touch target and accessibility element.
 */
export function ExerciseActionPill({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const supportsGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();
  const actions = Children.toArray(children);
  if (actions.length === 0) return null;

  return (
    <View style={[styles.pill, { right: insets.right + 24, bottom: insets.bottom + 20 }]}>
      {supportsGlass ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        />
      ) : <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fallback]} />}
      {actions.map((action, index) => (
        <Fragment key={index}>
          {index > 0 ? <View pointerEvents="none" style={styles.divider} /> : null}
          {action}
        </Fragment>
      ))}
    </View>
  );
}

type ButtonProps = {
  symbol: SFSymbol;
  fallback: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
};

/** One segment of the pill: SF Symbol on iOS, the matching Lucide glyph elsewhere. */
export function ExerciseActionButton({ symbol, fallback: Fallback, accessibilityLabel, accessibilityHint, onPress }: ButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.7}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={styles.segment}
    >
      <SymbolView
        name={symbol}
        size={26}
        weight="medium"
        tintColor={c.bone}
        fallback={<Fallback size={26} color={c.bone} strokeWidth={1.8} />}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center', height: SEGMENT,
    borderRadius: SEGMENT / 2, borderCurve: 'continuous', overflow: 'hidden',
    backgroundColor: '#FFFFFF06', borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFFFFF1F',
  },
  fallback: { backgroundColor: c.raised },
  segment: { width: SEGMENT, height: SEGMENT, alignItems: 'center', justifyContent: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: '#FFFFFF2E' },
});
