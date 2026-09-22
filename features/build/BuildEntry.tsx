import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { redesignColors as c, redesignFonts as f, splitColors } from '../../constants/theme';
import { createBuildIntroduction } from './introduction';
import { BuildPreview } from './BuildPreview';
import { useBuildAccessibility } from './useBuildAccessibility';
import type { BuildSlab } from './model';

const introduction = createBuildIntroduction(AsyncStorage);
const layers = [splitColors.chest, splitColors.back, splitColors.legs].map((color, index) => ({ color, height: 1, record: index === 1 }));
const pieces: BuildSlab[] = layers.map((layer, index) => ({ id: `intro:${index}`, layers: [layer], height: 1, sealed: false }));
const block: BuildSlab = { id: 'intro:week', layers, height: 1.05, sealed: true };
const pages = [
  { title: 'You train.\nIt takes shape.', body: 'Each completed workout adds one piece to your Build. Its colour reflects your training. Progress gives it more height; a new personal record earns a fine gold seam.', slabs: pieces.slice(0, 1) },
  { title: 'A week becomes\none layer.', body: 'When a week ends, its pieces become one block. Every workout colour and earned gold seam stays inside. Weeks without workouts add no blocks.', slabs: [block, ...pieces.slice(0, 2)] },
  { title: 'Your sessions,\nkept in the Case.', body: 'Open a week to see the workouts behind it. Your existing logged workouts are already part of your Build. Start with what you’ve done; keep building from here.', slabs: pieces },
];
export default function BuildEntry({ children }: { children: ReactNode }) {
  const accessibility = useBuildAccessibility();
  const router = useRouter();
  const [show, setShow] = useState<boolean | null>(null);
  const [page, setPage] = useState(0);
  useEffect(() => { let mounted = true; void introduction.shouldShow().then((value) => { if (mounted) setShow(value); }); return () => { mounted = false; }; }, []);
  useEffect(() => { if (show && accessibility.screenReader) AccessibilityInfo.announceForAccessibility(`Introduction ${page + 1} of 3. ${pages[page].title.replace(/\n/g, ' ')}`); }, [show, page, accessibility.screenReader]);
  const finish = () => { void introduction.dismiss(); setShow(false); };
  if (show === false) return children;
  if (show === null) return <SafeAreaView style={s.screen}><ActivityIndicator accessibilityLabel="Opening Build" color={c.ash} /></SafeAreaView>;
  const content = pages[page];
  return <SafeAreaView style={s.screen}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Close Build introduction" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.button}><Text style={s.link}>Close</Text></Pressable><Text maxFontSizeMultiplier={1.4} style={s.brand}>STACK / BUILD</Text><Pressable accessibilityRole="button" onPress={finish} style={s.button}><Text style={s.link}>Skip</Text></Pressable></View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.art} accessible={false}><BuildPreview slabs={content.slabs} width={260} height={250} /></View>
      <Text style={s.step}>INTRODUCTION · {page + 1} / 3</Text>
      <Text maxFontSizeMultiplier={2} accessibilityRole="header" accessibilityLiveRegion="polite" style={s.title}>{content.title}</Text><Text style={s.body}>{content.body}</Text>
    </ScrollView>
    <View style={s.footer}>{page > 0 && <Pressable accessibilityRole="button" onPress={() => setPage(page - 1)} style={s.button}><Text style={s.link}>Back</Text></Pressable>}<Pressable accessibilityRole="button" style={s.next} onPress={() => page === 2 ? finish() : setPage(page + 1)}><Text style={s.nextText}>{page === 2 ? 'See my Build' : 'Continue'}</Text></Pressable></View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, button: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }, link: { color: c.ash, fontFamily: f.uiMedium, fontSize: 14 }, brand: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 }, content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24, justifyContent: 'center' }, art: { alignItems: 'center', marginBottom: 20 }, step: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 1 }, title: { color: c.bone, fontFamily: f.display, fontSize: 35, lineHeight: 40, marginTop: 16 }, body: { color: c.ash, fontFamily: f.ui, fontSize: 16, lineHeight: 25, marginTop: 18 }, footer: { padding: 24, flexDirection: 'row', gap: 18, alignItems: 'center' }, next: { flex: 1, minHeight: 52, backgroundColor: c.bone, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 12 }, nextText: { color: c.ink, fontFamily: f.uiSemiBold, fontSize: 16 },
});
