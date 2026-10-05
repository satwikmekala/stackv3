// Mirrors of the live workout components. Each takes plain state (no store, no Reanimated),
// so the film can set any frame directly. Style values are copied from the source files named.
import type { CSSProperties } from 'react';
import { FONT } from '../fonts';
import { Icon } from './Icons';
import { c, formatWeight, mix, rgba, Row, Text, View } from './primitives';
import { CARD_H, CHIP_H, CONTENT_W, METRIC_W, OPTION_H, PICKER_H, SET_PROGRESS_H, valueWidth } from './layout';

// ─── components/WorkoutDayLabel.tsx ─────────────────────────────────────────
export function WorkoutDayLabel({ accent, label }: { accent: string; label: string }) {
  return (
    <Row>
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: accent, marginRight: 10 }} />
      <Text font={FONT.monoBold} size={12} spacing={2.5} color={c.ash}>{label.toUpperCase()}</Text>
    </Row>
  );
}

// ─── app/workout.tsx header row ─────────────────────────────────────────────
const roundButton: CSSProperties = {
  width: 42, height: 42, marginLeft: 10, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${c.border}`, backgroundColor: c.surface,
};
export function WorkoutHeader({ accent }: { accent: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', height: 42 }}>
      <WorkoutDayLabel accent={accent} label="Push" />
      <Row>
        <Row style={{ height: 42, marginLeft: 10, paddingLeft: 14, paddingRight: 14, borderRadius: 21, border: `1px solid ${c.border}`, backgroundColor: c.surface }}>
          <Icon name="repeat2" size={18} color={c.ash} strokeWidth={2.2} />
          <Text font={FONT.uiSemiBold} size={15} color={c.ash} style={{ marginLeft: 8 }}>Change</Text>
        </Row>
        <View style={roundButton}><Icon name="chevronDown" size={20} color={c.ash} strokeWidth={2.4} /></View>
        <View style={roundButton}><Icon name="x" size={20} color={c.ash} strokeWidth={2.4} /></View>
      </Row>
    </Row>
  );
}

// ─── Exercise title with the completion check ───────────────────────────────
export function ExerciseTitle({ name, accent, check }: { name: string; accent: string; check: { opacity: number; scale: number } | null }) {
  // adjustsFontSizeToFit, minimumFontScale 0.72: shrink long names like the app does.
  const available = CONTENT_W - (check ? 54 : 0);
  const estimated = name.length * 38 * 0.58;
  const size = 38 * Math.max(0.72, Math.min(1, available / estimated));
  return (
    <Row style={{ height: 44 }}>
      <Text font={FONT.display} size={size} lineHeight={44} spacing={-1.1 * (size / 38)} color={c.bone}
        style={{ flex: 1, minWidth: 0 }}>{name}</Text>
      {check ? (
        <View style={{
          width: 42, height: 42, marginLeft: 12, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
          backgroundColor: accent, boxShadow: `0 0 20px ${rgba(accent, 0.35)}`,
          opacity: check.opacity, transform: `scale(${check.scale})`,
        }}>
          <Icon name="check" size={23} color={c.ink} strokeWidth={3.2} />
        </View>
      ) : null}
    </Row>
  );
}

// ─── ExerciseProgressSegment ────────────────────────────────────────────────
export function ProgressSegments({ segments, accent }: { segments: { fill: number; focus: number }[]; accent: string }) {
  return (
    <Row style={{ gap: 8 }}>
      {segments.map(({ fill, focus }, index) => (
        <View key={index} style={{
          flex: 1, height: 8, borderRadius: 4, backgroundColor: mix(c.hi, accent, fill),
          boxShadow: focus > 0 ? `0 0 ${16 * focus}px ${rgba(accent, 0.55 * focus)}` : 'none',
          transform: `scaleY(${1 + focus * 0.08})`,
        }} />
      ))}
    </Row>
  );
}

// ─── SetPip / SetProgress ───────────────────────────────────────────────────
export type PipState = { fill: number; glow: number; check: { opacity: number; scale: number } | null; label: string; current: boolean };
export function SetProgress({ pips, accent }: { pips: PipState[]; accent: string }) {
  return (
    <Row style={{
      alignItems: 'stretch', height: SET_PROGRESS_H, borderRadius: 22, padding: '12px 14px',
      backgroundColor: c.surface, border: `1px solid ${c.border}`,
    }}>
      {pips.map((pip, index) => (
        <View key={index} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
              position: 'absolute', left: 5, top: 5, width: 30, height: 30, borderRadius: 15, backgroundColor: accent,
              boxShadow: `0 0 34px ${rgba(accent, 0.9)}`, opacity: pip.glow,
            }} />
            <View style={{
              width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${mix(c.border, accent, pip.fill)}`, backgroundColor: mix(c.surface, accent, pip.fill),
              transform: `scale(${0.94 + pip.fill * 0.06})`,
            }}>
              {pip.check ? (
                <div style={{ opacity: pip.check.opacity, transform: `scale(${pip.check.scale})` }}>
                  <Icon name="check" size={17} color={c.ink} strokeWidth={3.2} />
                </div>
              ) : null}
            </View>
          </View>
          <Text font={FONT.monoBold} size={10} lineHeight={13} spacing={pip.current ? 1.2 : 0}
            color={pip.current ? accent : c.ash} style={{ marginTop: 3 }}>{pip.label}</Text>
        </View>
      ))}
    </Row>
  );
}

// ─── components/ActiveSetCard.tsx ───────────────────────────────────────────
export type CardState = {
  setNumber: number;
  weight: string;
  reps: string;
  /** RollingValue's arrival: translateY and opacity of the newest weight label. */
  roll: { y: number; opacity: number };
  delta: string | null;
  info: boolean;
  logPress: number; // 0 → 1 pressed
  plusPress: number;
  /** 0 → 1 as the card turns into its slab's accent-coloured top face. */
  tint: number;
};

function Stepper({ value, width, color, unit, roll, plusPress }: { value: string; width: number; color: string; unit: string; roll?: { y: number; opacity: number }; plusPress?: number }) {
  const compact = value.length >= 4;
  const size = compact ? 29 : 32;
  return (
    <View style={{ alignItems: 'center' }}>
      <Row>
        <View style={{ width: 30, height: 42, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="minus" size={18} color={c.bone} strokeWidth={2.6} />
        </View>
        <View style={{ width, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Text font={FONT.monoBold} size={size} lineHeight={38} color={color}
            style={{ textAlign: 'center', transform: `translateY(${roll?.y ?? 0}px)`, opacity: roll?.opacity ?? 1 }}>{value}</Text>
        </View>
        <View style={{ width: 30, height: 42, alignItems: 'center', justifyContent: 'center', opacity: 1 - 0.3 * (plusPress ?? 0) }}>
          <Icon name="plus" size={18} color={c.bone} strokeWidth={2.6} />
        </View>
      </Row>
      <Text font={FONT.uiSemiBold} size={13} lineHeight={17} color={c.ash} style={{ marginTop: 2 }}>{unit}</Text>
    </View>
  );
}

function MetricBlock({ label, delta, accent, children }: { label: string; delta: string | null; accent: string; children: React.ReactNode }) {
  return (
    <View style={{
      width: METRIC_W, borderRadius: 20, padding: '14px 4px 12px', alignItems: 'center',
      backgroundColor: c.surface, border: `1px solid ${c.border}`,
    }}>
      <Row style={{ height: 20, justifyContent: 'center', marginBottom: 8 }}>
        <Text font={FONT.monoBold} size={10} spacing={1.8} color={c.ash}>{label}</Text>
        {delta ? (
          <View style={{ marginLeft: 6, borderRadius: 7, padding: '3px 6px', backgroundColor: `${accent}24` }}>
            <Text font={FONT.monoBold} size={10} lineHeight={12} color={accent}>{delta}</Text>
          </View>
        ) : null}
      </Row>
      {children}
    </View>
  );
}

export function ActiveSetCard({ state, accent, reveal }: { state: CardState; accent: string; reveal?: { shell: number; button: number; buttonScale: number; label: number } }) {
  const shell = reveal?.shell ?? 1;
  const tint = state.tint;
  return (
    <View style={{
      width: CONTENT_W, height: CARD_H, borderRadius: 27, padding: 18,
      border: `1.5px solid ${rgba(accent, shell)}`, backgroundColor: rgba(c.surface, shell),
      boxShadow: `0 0 52px ${rgba(accent, 0.3 * shell)}`,
    }}>
      <View style={{ opacity: shell, flex: 1 }}>
        <Row style={{ justifyContent: 'space-between', height: 44, marginBottom: 18 }}>
          <Text font={FONT.display} size={26} lineHeight={32} color={c.bone}>{`Set ${state.setNumber}`}</Text>
          <Row>
            {state.info ? (
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 27, height: 27, borderRadius: 14, border: `1px solid ${c.border}`, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="info" size={15} color={c.ash} strokeWidth={2} />
                </View>
              </View>
            ) : null}
            <Row style={{ padding: 3, borderRadius: 12, border: `1px solid ${c.border}`, backgroundColor: c.raised }}>
              <View style={{ position: 'absolute', left: 3, top: 3, width: 39, height: 27, borderRadius: 9, backgroundColor: accent }} />
              {(['KG', 'LBS'] as const).map((unit) => (
                <View key={unit} style={{ width: 39, height: 27, alignItems: 'center', justifyContent: 'center' }}>
                  <Text font={FONT.monoBold} size={10} spacing={0.4} color={unit === 'KG' ? c.ink : c.ash}>{unit}</Text>
                </View>
              ))}
            </Row>
          </Row>
        </Row>
        <Row style={{ gap: 12, alignItems: 'flex-start' }}>
          <MetricBlock label="WEIGHT" delta={state.delta} accent={accent}>
            <Stepper value={state.weight} width={valueWidth(state.weight)} color={accent} unit="kg" roll={state.roll} plusPress={state.plusPress} />
          </MetricBlock>
          <MetricBlock label="REPS" delta={null} accent={accent}>
            <Stepper value={state.reps} width={valueWidth(state.reps)} color={c.bone} unit="reps" />
          </MetricBlock>
        </Row>
      </View>
      <Row style={{ gap: 12, marginTop: 20 }}>
        <Row style={{
          flex: 1, height: 58, borderRadius: 19, justifyContent: 'center', backgroundColor: accent,
          opacity: (reveal?.button ?? 1) * (1 - 0.22 * state.logPress),
          transform: `scale(${(reveal?.buttonScale ?? 1) * (1 - 0.02 * state.logPress)})`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', opacity: reveal?.label ?? 1 }}>
            <Icon name="check" size={22} color={c.ink} strokeWidth={3.2} />
            <Text font={FONT.uiBold} size={19} color={c.ink} style={{ marginLeft: 9 }}>Log it</Text>
          </div>
        </Row>
        <View style={{ width: 94, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${c.border}`, opacity: shell }}>
          <Text font={FONT.uiBold} size={16} color={c.ash}>Skip</Text>
        </View>
      </Row>
      {tint > 0 ? <View style={{ position: 'absolute', inset: -1.5, borderRadius: 27, backgroundColor: accent, opacity: tint }} /> : null}
    </View>
  );
}

// ─── components/ExerciseFinisher.tsx ────────────────────────────────────────
const BONUS = { extra: '#28C8BD', dropset: '#9B72F2', pr: '#E8B84A' }; // BONUS_SET_META colours
const roundToPlate = (weight: number) => Math.round(weight / 2.5) * 2.5;

export function ExerciseFinisher({ sets, next, advancePress }: { sets: { w: number; r: number }[]; next: string | null; advancePress: number }) {
  const last = sets[sets.length - 1];
  const drop = roundToPlate(last.w * 0.8);
  const prWeight = last.w + Math.max(2.5, roundToPlate(last.w * 0.1));
  const prReps = Math.max(1, last.r - Math.max(2, Math.ceil(last.r * 0.35)));
  const option = (title: string, metric: string, color: string, icon: 'plus' | 'arrowDown' | 'trophy') => (
    <View key={title} style={{
      flex: 1, height: OPTION_H, borderRadius: 22, border: `1px solid ${color}80`, backgroundColor: c.surface,
      padding: '14px 8px', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 20px ${rgba(color, 0.12)}`,
    }}>
      <View style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}22`, marginBottom: 7 }}>
        <Icon name={icon} size={icon === 'trophy' ? 23 : 25} color={color} strokeWidth={icon === 'trophy' ? 2.4 : 2.6} />
      </View>
      <Text font={FONT.uiBold} size={14} lineHeight={17} color={c.bone}>{title}</Text>
      <Text font={FONT.monoBold} size={10} lineHeight={13} color={color} style={{ marginTop: 5 }}>{metric}</Text>
    </View>
  );
  return (
    <View style={{ width: CONTENT_W }}>
      <Row style={{ gap: 8, alignItems: 'stretch' }}>
        {sets.map((set, index) => (
          <View key={index} style={{ flex: 1, height: CHIP_H, borderRadius: 14, padding: '10px 7px', backgroundColor: c.surface, border: `1px solid ${c.border}` }}>
            <Text font={FONT.monoBold} size={9} lineHeight={12} spacing={1.1} color={c.ash}>{`SET ${index + 1}`}</Text>
            <Text font={FONT.monoBold} size={13} lineHeight={17} color={c.bone} style={{ marginTop: 5 }}>{`${formatWeight(set.w)} kg`}</Text>
            <Text font={FONT.mono} size={10} lineHeight={13} color={c.ash} style={{ marginTop: 1 }}>{`× ${set.r} reps`}</Text>
          </View>
        ))}
      </Row>
      <Text font={FONT.ui} size={16} lineHeight={22} color={c.ash} style={{ marginTop: 20, marginBottom: 16, whiteSpace: 'normal', height: 44 }}>
        Tap a set to edit it, push a little further, or move on.
      </Text>
      <Row style={{ gap: 9 }}>
        {option('Extra Set', `${formatWeight(last.w)} kg × ${last.r}`, BONUS.extra, 'plus')}
        {option('Drop Set', `${formatWeight(drop)} kg × ${last.r}`, BONUS.dropset, 'arrowDown')}
        {option('PR Attempt', `${formatWeight(prWeight)} kg × ${prReps}`, BONUS.pr, 'trophy')}
      </Row>
      <Row style={{
        height: 56, marginTop: 20, padding: '0 18px', borderRadius: 18, justifyContent: 'center',
        backgroundColor: c.raised, border: `1px solid ${c.border}`,
        opacity: 1 - 0.35 * advancePress, transform: `scale(${1 - 0.02 * advancePress})`,
      }}>
        <Text font={FONT.uiSemiBold} size={16} color={c.bone}>{next ? `Move on to ${next}` : 'Finish workout'}</Text>
        <Icon name="chevronRight" size={20} color={c.ash} style={{ marginLeft: 8 }} />
      </Row>
    </View>
  );
}

// ─── Up next card ───────────────────────────────────────────────────────────
export function UpNext({ name, accent }: { name: string; accent: string }) {
  return (
    <View style={{ width: CONTENT_W, height: 82, borderRadius: 22, border: `1px solid ${c.border}`, backgroundColor: c.surface, padding: '0 18px', justifyContent: 'center' }}>
      <Row>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text font={FONT.monoBold} size={10} spacing={1.8} color={c.ashDim} style={{ marginLeft: 25 }}>UP NEXT</Text>
          <Row style={{ marginTop: 3 }}>
            <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: accent, marginRight: 14 }} />
            <Text font={FONT.uiSemiBold} size={17} lineHeight={21} color={c.bone}>{name}</Text>
          </Row>
        </View>
        <Text font={FONT.monoBold} size={10} spacing={1.1} color={c.ashDim} style={{ marginLeft: 10 }}>3 SETS</Text>
        <Icon name="chevronRight" size={20} color={c.ashDim} style={{ marginLeft: 7 }} />
      </Row>
    </View>
  );
}

// ─── components/home/WorkoutIntensityPicker.tsx (finish variant) ───────────
const LEVELS = [{ value: 0, label: 'TOO EASY' }, { value: 0.5, label: 'JUST RIGHT' }, { value: 1, label: 'TOO HARD' }];
export function FinishSheet({ value, accent }: { value: number; accent: string }) {
  return (
    <View style={{
      width: CONTENT_W + 8, minHeight: PICKER_H, borderRadius: 30, border: `1px solid ${rgba(accent, 0.55)}`,
      padding: '16px 25px 25px', backgroundColor: c.surface, overflow: 'hidden',
    }}>
      <View style={{ width: 38, height: 4, alignSelf: 'center', borderRadius: 2, marginBottom: 29, backgroundColor: c.hi }} />
      <Text font={FONT.monoBold} size={12} lineHeight={16} spacing={1.7} color={accent} style={{ marginBottom: 11 }}>CHEST DAY</Text>
      <Text font={FONT.display} size={32} lineHeight={37} spacing={-0.8} color={c.bone}>How did it feel?</Text>
      <Text font={FONT.ui} size={14} lineHeight={19} color={c.ash} style={{ marginTop: 9, whiteSpace: 'normal', height: 38 }}>
        This helps us adjust your next workout to keep you progressing
      </Text>
      <View style={{ marginTop: 31 }}>
        <View style={{ height: 42, justifyContent: 'center' }}>
          <View style={{ height: 7, borderRadius: 4, backgroundColor: c.hi }}>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${value * 100}%`, borderRadius: 4, backgroundColor: accent }} />
            {LEVELS.map((level) => (
              <View key={level.label} style={{
                position: 'absolute', top: -3, left: `${level.value * 100}%`, width: 13, height: 13, marginLeft: -6.5, borderRadius: 6.5,
                backgroundColor: Math.abs(level.value - value) < 0.14 ? c.bone : c.ashDim,
              }} />
            ))}
            <View style={{
              position: 'absolute', top: -10, left: `${value * 100}%`, width: 27, height: 27, marginLeft: -13.5, borderRadius: 13.5,
              border: `5px solid ${accent}`, backgroundColor: c.bone, boxShadow: `0 4px 16px ${rgba(accent, 0.48)}`,
            }} />
          </View>
        </View>
        <Row style={{ justifyContent: 'space-between', marginTop: 11 }}>
          {LEVELS.map((level, index) => (
            <Text key={level.label} font={FONT.monoBold} size={10} lineHeight={13} spacing={0.7}
              color={Math.abs(level.value - value) < 0.14 ? accent : c.ashDim}
              style={{ width: '33.333%', textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right' }}>{level.label}</Text>
          ))}
        </Row>
      </View>
      <Text font={FONT.monoBold} size={11} lineHeight={14} spacing={1.5} color={c.ash} style={{ alignSelf: 'center', marginTop: 29 }}>SLIDE TO FINISH</Text>
    </View>
  );
}
