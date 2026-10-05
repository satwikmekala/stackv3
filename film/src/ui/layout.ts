// Point geometry of the workout screen, derived from the style objects in app/workout.tsx,
// components/ActiveSetCard.tsx, ExerciseFinisher.tsx and WorkoutIntensityPicker.tsx.
// Components render with these exact heights, so touch targets and hand-offs line up.

export const SCREEN_W = 393;
export const SCREEN_H = 852;
export const PAD_X = 24; // content paddingHorizontal
export const CONTENT_W = SCREEN_W - PAD_X * 2; // 345

export const HEADER_Y = 16; // paddingTop 16
export const HEADER_H = 42;
export const TITLE_Y = HEADER_Y + HEADER_H + 18; // marginTop 18 → 76
export const TITLE_H = 44;
export const SEGMENTS_Y = TITLE_Y + TITLE_H + 20; // → 140
export const BODY_Y = SEGMENTS_Y + 8 + 24; // → 172 (SetProgress top)
export const SET_PROGRESS_H = 96;
export const CARD_Y = BODY_Y + SET_PROGRESS_H + 24; // → 292

// ActiveSetCard: border 1.5, padding 18, heading row 44 (info button), 18 gap, metric blocks,
// 20 gap, 58 buttons, padding 18, border 1.5.
export const METRIC_H = 117; // 1 + 14 + 20 + 8 + 42 + (2 + 17) + 12 + 1
export const CARD_H = 1.5 + 18 + 44 + 18 + METRIC_H + 20 + 58 + 18 + 1.5; // 296
export const CARD_INNER_W = CONTENT_W - 3 - 36; // 306
export const METRIC_W = (CARD_INNER_W - 12) / 2; // 147
export const METRIC_Y = CARD_Y + 1.5 + 18 + 44 + 18; // 373.5
export const STEPPER_CY = METRIC_Y + 1 + 14 + 20 + 8 + 21; // 437.5
export const BUTTONS_Y = METRIC_Y + METRIC_H + 20; // 510.5
export const LOG_BUTTON = { x: PAD_X + 1.5 + 18, y: BUTTONS_Y, w: CARD_INNER_W - 12 - 94, h: 58 };
export const LOG_CENTER = { x: LOG_BUTTON.x + LOG_BUTTON.w / 2, y: LOG_BUTTON.y + LOG_BUTTON.h / 2 };
export const CARD_CENTER = { x: SCREEN_W / 2, y: CARD_Y + CARD_H / 2 };

export const UP_NEXT_Y = CARD_Y + CARD_H + 22 + 2; // 612
export const UP_NEXT_H = 82;
export const UI_BOTTOM = UP_NEXT_Y + UP_NEXT_H; // 694
export const UI_CENTER = { x: SCREEN_W / 2, y: (HEADER_Y + UI_BOTTOM) / 2 };

/** RollingValue: compact labels (≥ 4 chars) render at 29 pt in a wider box. */
export const valueWidth = (label: string) => (label.length >= 4 ? Math.max(66, Math.ceil(label.length * 29 * 0.6)) : 52);
/** Centre of the weight stepper's + for a given displayed value. */
export function plusCenter(label: string) {
  const row = 30 + valueWidth(label) + 30;
  const left = PAD_X + 1.5 + 18 + (METRIC_W - row) / 2;
  return { x: left + 30 + valueWidth(label) + 15, y: STEPPER_CY };
}

// ExerciseFinisher (replaces SetProgress + card once every set is logged).
export const CHIP_H = 70;
export const FINISHER_TEXT_Y = BODY_Y + CHIP_H + 20;
export const OPTIONS_Y = FINISHER_TEXT_Y + 44 + 16;
export const OPTION_H = 132;
export const ADVANCE_Y = OPTIONS_Y + OPTION_H + 20;
export const ADVANCE_CENTER = { x: SCREEN_W / 2, y: ADVANCE_Y + 28 };

// Finish sheet (WorkoutIntensityPicker), centred on the screen.
export const PICKER_H = 327;
export const PICKER_Y = (SCREEN_H - PICKER_H) / 2;
export const PICKER_TRACK = { x: 20 + 1 + 25, w: SCREEN_W - 40 - 2 - 50, y: PICKER_Y + 1 + 16 + 4 + 29 + 16 + 11 + 37 + 9 + 38 + 31 + 21 };
