import { Button, HStack, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  accessibilityLabel,
  buttonStyle,
  contentTransition,
  disabled,
  background,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  offset,
  padding,
  rotationEffect,
  scaleEffect,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { WorkoutLiveActivityDisplayState } from '@/services/liveActivity/state';

export const WorkoutLiveActivityLayout = (state: WorkoutLiveActivityDisplayState) => {
  'widget';

  const orange = '#FF8246';
  const white = '#F7F4F0';
  const accent = '#FF7B36';
  const muted = '#A69E90';
  const segmentCount = Math.max(1, Math.min(state.totalSets, 6));

  // Keep these helpers inside the widget closure so Expo can serialize the layout.
  const stackMark = (
    <ZStack modifiers={[frame({ width: 14, height: 15 })]}>
      <RoundedRectangle
        cornerRadius={3.5}
        modifiers={[
          frame({ width: 11, height: 11 }),
          foregroundStyle('#9C4927'),
          offset({ x: 1.5, y: 2 }),
        ]}
      />
      <RoundedRectangle
        cornerRadius={3.5}
        modifiers={[
          frame({ width: 11, height: 11 }),
          foregroundStyle(accent),
          offset({ x: -1, y: -1.5 }),
        ]}
      />
    </ZStack>
  );

  const progress = (
    <HStack spacing={5} modifiers={[frame({ maxWidth: Infinity })]}>
      {Array.from({ length: segmentCount }, (_, index) => (
        <RoundedRectangle
          key={index}
          cornerRadius={1}
          modifiers={[
            // The native fixed-frame overload ignores maxWidth when height is
            // supplied alongside it, so apply flexible width in a separate frame.
            frame({ height: 2 }),
            frame({ maxWidth: Infinity }),
            foregroundStyle(
              index < state.setNumber - 1
                ? accent
                : index === state.setNumber - 1
                  ? '#8C3D1D'
                  : '#282725'
            ),
          ]}
        />
      ))}
    </HStack>
  );

  // Pure, isolated presentation callback. Native execution re-renders the layout
  // with its latest props for every press, so this never closes over old values.
  const localPress = (action: string) => {
    const model = state.interaction;
    if (!model) return state;
    const format = (kg: number, factor: number) => {
      const value = kg * factor;
      return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
    };
    if (action === 'completeSet') {
      const next = model.next;
      const display = next || state;
      return { ...display, completionPending: true,
        actions: next ? { ...display.actions, completeSet: undefined } : {},
        interaction: display.interaction ? { ...display.interaction, next: undefined } : undefined,
      };
    }
    let weightKg = model.weightKg;
    let reps = Number(state.reps);
    if (action === 'increaseWeight') weightKg += model.weightStepKg;
    if (action === 'decreaseWeight') weightKg = Math.max(0, weightKg - model.weightStepKg);
    if (action === 'increaseReps') reps += 1;
    if (action === 'decreaseReps') reps = Math.max(1, reps - 1);
    if (!Number.isFinite(weightKg) || !Number.isInteger(reps)) return state;
    let next = model.next;
    if (next?.interaction) {
      const nextKg = model.nextWeightOffsetKg !== undefined ? weightKg + model.nextWeightOffsetKg : next.interaction.weightKg;
      next = { ...next,
        weight: next.unit ? format(nextKg, next.interaction.displayFactor) : '—',
        reps: model.nextRepsFromCurrent ? reps : next.reps,
        interaction: { ...next.interaction, weightKg: nextKg },
      };
    }
    return { ...state, weight: state.unit ? format(weightKg, model.displayFactor) : '—', reps,
      interaction: { ...model, weightKg, next },
    };
  };

  const control = (action: string | undefined, label: string, content: React.ReactElement) => (
    state.actions ? (
      <Button
        target={action ? (state.actionTarget || '') + action : undefined}
        onPress={() => action ? localPress(action) : state}
        modifiers={[buttonStyle('plain'), disabled(!action), accessibilityLabel(label)]}
      >
        {content}
      </Button>
    ) : content
  );

  const valueGroup = (value: number | string, unit: string, expanded: boolean, weight: boolean) => (
    // Baseline alignment centres −/+ on the number, not on the number+unit
    // stack. Each control keeps a 20pt tap width with its slack facing the
    // number, so the visible gap is the same on both sides at any digit count.
    <HStack alignment="firstTextBaseline" spacing={2}>
      {control(weight ? state.actions?.decreaseWeight : state.actions?.decreaseReps, weight ? 'Decrease weight' : 'Decrease reps',
        <Text modifiers={[frame({ width: 20, alignment: 'leading' }), font({ size: 22 }), foregroundStyle('#8E8D87')]}>−</Text>
      )}
      {/* Unit sits under the value so three-digit weights get the full width.
          The minimum width keeps −/+ still for common values; longer ones push out. */}
      <VStack spacing={1} modifiers={[frame({ minWidth: weight ? 52 : 36 })]}>
        {/* ActivityKit animates each update; numericText rolls the changed
            digits like the in-app counter instead of swapping the whole value. */}
        <Text modifiers={[font({ size: expanded ? 24 : 26, weight: 'bold' }), monospacedDigit(), contentTransition('numericText'), lineLimit(1), minimumScaleFactor(0.5)]}>
          {value}
        </Text>
        <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted), fixedSize()]}>
          {unit}
        </Text>
      </VStack>
      {control(weight ? state.actions?.increaseWeight : state.actions?.increaseReps, weight ? 'Increase weight' : 'Increase reps',
        <Text modifiers={[frame({ width: 20, alignment: 'trailing' }), font({ size: 22 }), foregroundStyle('#8E8D87')]}>+</Text>
      )}
    </HStack>
  );

  // Tapping Done shrinks the button slightly until the app confirms the set,
  // then it returns to full size. ActivityKit animates between the two
  // updates, giving a small press pulse without changing the colour.
  const done = (diameter: number) => (
    <ZStack
      modifiers={[
        frame({ width: diameter, height: diameter }),
        background(accent, shapes.circle()),
        scaleEffect(state.completionPending ? 0.86 : 1),
      ]}
    >
      {/* Two round-ended strokes form the reference's short, bold angled check. */}
      <RoundedRectangle
        cornerRadius={1.5}
        modifiers={[
          frame({ width: 8, height: 3 }),
          foregroundStyle('#17120F'),
          rotationEffect(45),
          offset({ x: -4.5, y: 2 }),
        ]}
      />
      <RoundedRectangle
        cornerRadius={1.5}
        modifiers={[
          frame({ width: 15, height: 3 }),
          foregroundStyle('#17120F'),
          rotationEffect(-45),
          offset({ x: 2.5, y: 0 }),
        ]}
      />
    </ZStack>
  );

  const controller = (expanded: boolean) => (
    <VStack
      spacing={0}
      modifiers={[
        padding({ horizontal: expanded ? 14 : 22, top: expanded ? 0 : 18, bottom: expanded ? 14 : 20 }),
        frame({ maxWidth: Infinity }),
        foregroundStyle(white),
      ]}
    >
      {/* No extra inset: the mark lines up with the progress bar and − control. */}
      <HStack spacing={0}>
        <HStack spacing={7}>
          {stackMark}
          <Text modifiers={[font({ size: expanded ? 20 : 21, weight: 'semibold' }), lineLimit(1), minimumScaleFactor(0.85)]}>
            {state.exerciseName}
          </Text>
        </HStack>
        <Spacer minLength={8} />
        <HStack alignment="firstTextBaseline" spacing={5} modifiers={[fixedSize()]}>
          <Text modifiers={[font({ size: 10, weight: 'medium' }), kerning(1.4), foregroundStyle(muted)]}>
            SET
          </Text>
          <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accent)]}>
            {state.setNumber}
          </Text>
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(muted)]}>
            / {state.totalSets}
          </Text>
        </HStack>
      </HStack>

      {/* Title descenders add visual space, so equal spacers read as equal gaps. */}
      <Spacer modifiers={[frame({ height: 14 })]} />
      {progress}
      <Spacer modifiers={[frame({ height: 14 })]} />

      {/* Temporary tap presentation is reconciled by the authoritative store.
          Equal flexible spacers keep the divider centred between the groups. */}
      <HStack spacing={0}>
        {valueGroup(state.weight, state.unit, expanded, true)}
        <Spacer minLength={10} />
        <RoundedRectangle
          cornerRadius={0.5}
          modifiers={[frame({ width: 1, height: 32 }), foregroundStyle('#282725')]}
        />
        <Spacer minLength={10} />
        {valueGroup(state.reps, 'reps', expanded, false)}
        <Spacer minLength={10} />
        {control(state.actions?.completeSet, 'Complete set', done(expanded ? 50 : 52))}
      </HStack>
    </VStack>
  );

  return {
    banner: (
      <VStack spacing={0} modifiers={[background('#000000'), activityBackgroundTint('#000000')]}>
        {controller(false)}
      </VStack>
    ),
    // Inset from the island's rounded ends so the text doesn't hug the corners.
    // iOS already insets the trailing region less, so it gets more padding to
    // leave the same visible gap on both ends.
    compactLeading: (
      <Text modifiers={[padding({ leading: 6 }), font({ size: 12, weight: 'semibold' }), lineLimit(1), foregroundStyle(white)]}>
        {state.compactName}
      </Text>
    ),
    compactTrailing: (
      <HStack spacing={0} modifiers={[padding({ trailing: 11 })]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(orange)]}>
          {state.setNumber}
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(white)]}>
          /{state.totalSets}
        </Text>
      </HStack>
    ),
    minimal: <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(orange)]}>S</Text>,
    // The full-width region below the camera keeps the header on one row and
    // aligns the progress/control rows to the same content edges.
    expandedBottom: controller(true),
  };
};
