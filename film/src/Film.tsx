// The master composition. Layers, back to front:
// stage light → workout screen → Build (3D) → finish sheet + touch → typography.
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { redesignColors } from '../../constants/theme';
import { BuildLayer } from './build/BuildLayer';
import { buildness, cameraAt } from './camera';
import { loadFonts } from './fonts';
import { FORMATS, type Format } from './formats';
import { Overlay } from './overlay/Overlay';
import { SheetLayer, WorkoutLayer } from './ui/WorkoutLayer';
import { smooth } from './ease';
import { T } from './timeline';

/** `sfx`: include the temp mix synthesised from the cue sheet (npm run sfx). */
export type FilmProps = { format: Format['id']; startAt?: number; sfx?: boolean };

/** CastingScreen's stage light: #13110E → #2C1D12 → #13110E, centred on the stack. */
function StageLight({ t, format }: { t: number; format: Format }) {
  const on = buildness(t) * (1 - 0.35 * smooth(t, T.end, T.end + 1));
  const centre = format.id === 'vertical' ? 60 : 55;
  return (
    <AbsoluteFill style={{
      opacity: on,
      background: format.id === 'vertical'
        ? `linear-gradient(180deg, #13110E 0%, #13110E ${centre - 38}%, #2C1D12 ${centre}%, #13110E ${centre + 38}%, #13110E 100%)`
        : 'radial-gradient(ellipse 45% 70% at 70% 55%, #2C1D12 0%, #13110E 100%)',
    }} />
  );
}

export function Film({ format: id, startAt = 0, sfx = true }: FilmProps) {
  loadFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = FORMATS[id];
  const t = startAt + frame / fps;
  const cam = cameraAt(format, t);
  return (
    <AbsoluteFill style={{ backgroundColor: redesignColors.ink, overflow: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
      <StageLight t={t} format={format} />
      <WorkoutLayer t={t} cam={cam} format={format} />
      <BuildLayer t={t} cam={cam} format={format} />
      <AbsoluteFill style={{ zIndex: 2 }}><SheetLayer t={t} cam={cam} format={format} /></AbsoluteFill>
      <AbsoluteFill style={{ zIndex: 3 }}><Overlay t={t} cam={cam} format={format} /></AbsoluteFill>
      {sfx ? <Audio src={staticFile('sfx/temp-sfx.wav')} trimBefore={Math.round(startAt * fps)} /> : null}
    </AbsoluteFill>
  );
}
