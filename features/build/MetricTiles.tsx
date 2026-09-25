import { StyleSheet, Text, View } from 'react-native';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';

export type MetricTile = { value: string; label: string };

/** The row of stat tiles shared by Your Stack's Overview and an unpacked week. */
export function MetricTiles({ tiles }: { tiles: readonly MetricTile[] }) {
  return <View style={s.row}>{tiles.map((tile) => <View key={tile.label} accessible accessibilityLabel={`${tile.value} ${tile.label.toLowerCase()}`} style={s.tile}>
    <Text maxFontSizeMultiplier={1.5} adjustsFontSizeToFit numberOfLines={1} style={s.value}>{tile.value}</Text>
    <Text style={s.label}>{tile.label}</Text>
  </View>)}</View>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#241E18' },
  value: { color: c.bone, fontFamily: f.display, fontSize: 27, textAlign: 'center' },
  label: { color: c.ash, fontFamily: f.mono, fontSize: 8, marginTop: 4, textAlign: 'center' },
});
