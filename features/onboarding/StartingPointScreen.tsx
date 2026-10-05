import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';

function Choice({ title, description, onPress, busy }: { title: string; description: string; onPress: () => void; busy: boolean }) {
  const { fontScale } = useWindowDimensions();
  const displayScale = Math.min(fontScale, 1.5);
  const press = usePressScale('surface');
  // Remount on text-size changes so native measurement cannot keep a stale card height.
  return <Animated.View key={`choice:${fontScale}`} style={press.animatedStyle}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description}
      disabled={busy} accessibilityState={{ disabled: busy }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}
      style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}>
      <View style={styles.choiceText}>
        <Text key={`title:${fontScale}`} allowFontScaling={false}
          style={[styles.choiceTitle, { fontSize: 24 * displayScale, lineHeight: 28 * displayScale }]}>{title}</Text>
        <Text style={styles.body}>{description}</Text>
      </View>
      {/* At accessibility sizes the whole card is the affordance; the description keeps the width. */}
      {fontScale <= 1.3 && <View style={styles.arrow}><ArrowRight color={c.bone} size={18} accessible={false} /></View>}
    </Pressable>
  </Animated.View>;
}

/** Presentation only: both choices carry equal weight; the route owns persistence and navigation. */
export function StartingPointScreen({ busy, onTrack, onProgram, onExplore, status }: {
  busy: boolean; onTrack: () => void; onProgram: () => void; onExplore: () => void; status?: ReactNode;
}) {
  const { fontScale, width } = useWindowDimensions();
  const scale = Math.min(fontScale, 1.5);
  // At accessibility sizes Explore first shares the scroll area so it cannot cover the choices.
  const scrollFooter = fontScale > 1.3;
  const footer = <View key={`footer:${fontScale}`} style={[styles.footer, scrollFooter && styles.scrollingFooter]}>
    {status}
    <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={onExplore}
      style={({ pressed }) => [styles.explore, pressed && styles.explorePressed]}>
      <Text style={styles.exploreText}>Explore first</Text>
    </Pressable>
  </View>;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text key={`title:${fontScale}`} accessibilityRole="header" allowFontScaling={false}
        style={[styles.title, { fontSize: (width < 360 ? 37 : 42) * scale, lineHeight: 46 * scale }]}>How do you want to train?</Text>
      <View style={styles.choices}>
        <Choice title="I have my own workouts" description="Track what you already do." onPress={onTrack} busy={busy} />
        <Choice title="Give me workouts" description="Start with workouts from Stack." onPress={onProgram} busy={busy} />
      </View>
      {scrollFooter && footer}
    </ScrollView>
    {!scrollFooter && footer}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 32, width: '100%', maxWidth: 568, alignSelf: 'center' },
  title: { fontFamily: f.display, color: c.bone, letterSpacing: -1.2 },
  choices: { gap: 12 },
  // A shared minimum keeps both choices the same size when only one title wraps.
  choice: { minHeight: 128, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 22, paddingLeft: 22, paddingRight: 18,
    borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  choicePressed: { backgroundColor: c.raised },
  choiceText: { flex: 1, gap: 6 },
  choiceTitle: { fontFamily: f.display, color: c.bone, letterSpacing: -0.5 },
  body: { fontFamily: f.ui, color: c.ash, fontSize: 16, lineHeight: 22 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.hi },
  footer: { paddingHorizontal: 24, paddingBottom: 8, gap: 4, width: '100%', maxWidth: 568, alignSelf: 'center' },
  scrollingFooter: { paddingHorizontal: 0 },
  explore: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 16 },
  explorePressed: { backgroundColor: c.surface },
  exploreText: { fontFamily: f.uiMedium, fontSize: 16, color: c.ash, textAlign: 'center' },
});
