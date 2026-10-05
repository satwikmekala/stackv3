import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { LiftLogCard } from '@/components/LiftLogCard';
import { STAT_STRIP_HEIGHT, STAT_STRIP_WIDTH, StatStripCard } from '@/components/StatStripCard';
import { StackPosterCard, type StackPosterLayer } from '@/components/StackPosterCard';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';

const SCALE = 0.3;

const LAYERS: StackPosterLayer[] = [
  { name: 'Deadlift', color: splitColors.back, weight: 0.55, detail: '3 SETS · 1,098 kg', record: true },
  { name: 'Pull-ups', color: splitColors.back, weight: 0.2, detail: '3 SETS · 24 REPS', record: false },
  { name: 'Barbell Rows', color: splitColors.back, weight: 0.45, detail: '3 SETS · 984 kg', record: false },
  { name: 'Face Pulls', color: splitColors.shoulders, weight: 0.3, detail: '3 SETS · 594 kg', record: false },
  { name: 'Barbell Curl', color: splitColors.arms, weight: 0.32, detail: '3 SETS · 708 kg', record: false },
];

/** Dev-only visual QA for the three share cards, each on a photo-like backdrop. */
export default function DevShareCards() {
  if (!__DEV__) return <Redirect href="/" />;
  const common = { accent: splitColors.back, title: 'Pull', date: 'Oct 4', volumeValue: '3,384', volumeUnit: 'kg', setCount: 15, repCount: 147 };
  const frame = (label: string, card: React.ReactNode) => (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.frame}>
        <View style={styles.photo} />
        <View style={styles.scale}>{card}</View>
      </View>
    </View>
  );
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} horizontal>
      {frame('Stat Strip', <StatStripCard {...common} exerciseCount={5} recordCount={1} />)}
      {frame('Lift Log', <LiftLogCard accent={common.accent} title="Pull" date="Oct 4" volumeValue="3,384" volumeUnit="kg"
        lines={[{ name: 'Deadlift', value: '61', unit: 'kg', scheme: '3 × 6', record: true }, { name: 'Pull-ups', value: '8', unit: 'reps', scheme: '3 × 8', record: false }]} more={0} />)}
      {frame('My Stack', <StackPosterCard {...common} durationLabel="52 min" layers={LAYERS} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  content: { padding: 24, gap: 24 },
  item: { gap: 8 },
  label: { color: redesignColors.ash, fontFamily: redesignFonts.mono, fontSize: 11 },
  frame: { width: STAT_STRIP_WIDTH * SCALE, height: STAT_STRIP_HEIGHT * SCALE, overflow: 'hidden', borderRadius: 12 },
  photo: { ...StyleSheet.absoluteFill, backgroundColor: '#7A6656' },
  scale: { width: STAT_STRIP_WIDTH, height: STAT_STRIP_HEIGHT, transform: [{ scale: SCALE }], transformOrigin: 'top left' },
});
