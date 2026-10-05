import { Composition, Folder } from 'remotion';
import { Film, type FilmProps } from './Film';
import { FORMATS } from './formats';
import { DURATION, FPS, T } from './timeline';

/** Scene windows (seconds) for fast iteration in the Studio; the master is one continuous take. */
const SCENES: [string, number, number][] = [
  ['1-Hook', 0, 2.6],
  ['2-LogASet', 2.2, 7.8],
  ['3-Momentum', 7.6, 14.3],
  ['4-Transformation', 14.0, 18.6],
  ['5-Time', 18.2, 27.2],
  ['6-Payoff', 27.0, T.end + 0.2],
  ['7-EndFrame', T.end - 0.4, DURATION],
];

export function Root() {
  const vertical = FORMATS.vertical;
  const landscape = FORMATS.landscape;
  return (
    <>
      <Composition id="StackLaunch" component={Film} durationInFrames={Math.round(DURATION * FPS)} fps={FPS}
        width={vertical.width} height={vertical.height} defaultProps={{ format: 'vertical', startAt: 0 } satisfies FilmProps} />
      <Composition id="StackLaunchLandscape" component={Film} durationInFrames={Math.round(DURATION * FPS)} fps={FPS}
        width={landscape.width} height={landscape.height} defaultProps={{ format: 'landscape', startAt: 0 } satisfies FilmProps} />
      <Folder name="Scenes">
        {SCENES.map(([name, from, to]) => (
          <Composition key={name} id={`Scene-${name}`} component={Film} durationInFrames={Math.round((to - from) * FPS)} fps={FPS}
            width={vertical.width} height={vertical.height} defaultProps={{ format: 'vertical', startAt: from } satisfies FilmProps} />
        ))}
      </Folder>
    </>
  );
}
