import React, { forwardRef } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { redesignColors, redesignFonts } from '@/constants/theme';
import {
  REPORT_SET_TAGS,
  workoutReportText,
  type ReportExercise,
  type ReportSet,
  type WorkoutReport,
} from '@/features/report/workoutReport';

/**
 * The report is drawn on paper rather than Stack's dark ink: it is a document
 * meant to be read by someone else, in a message thread of either theme, so
 * it inverts the redesign tokens (bone page, ink type) and lets the workout's
 * split color appear only as a thin band and on new-best marks.
 */
export const REPORT_PAPER = {
  page: redesignColors.bone,
  ink: redesignColors.ink,
  soft: '#5F574D',
  faint: '#8C8274',
  rule: '#DDD4C6',
  ruleStrong: '#C9BFAF',
  well: '#EDE6DA',
};

/** Logical width the image is laid out at; captured at 3× for a 1080 px export. */
export const REPORT_WIDTH = 360;

export interface WorkoutReportViewProps {
  report: WorkoutReport;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const T = { allowFontScaling: false } as const;

/** Bonus type and new best are independent: a PR attempt that landed shows both. */
function Tags({ set, accent }: { set: ReportSet; accent: string }) {
  if (set.skipped) return null;
  return (
    <>
      {set.kind !== 'working' ? (
        <View style={styles.tag}>
          <Text {...T} style={styles.tagText}>{REPORT_SET_TAGS[set.kind]}</Text>
        </View>
      ) : null}
      {set.record ? (
        <View style={[styles.tag, styles.tagRecord]}>
          <View style={[styles.tagDot, { backgroundColor: accent }]} />
          <Text {...T} style={[styles.tagText, styles.tagRecordText]}>NEW BEST</Text>
        </View>
      ) : null}
    </>
  );
}

/** "80 kg × 10" with the numbers carrying the weight and the units stepping back. */
function SetReading({ text, style, inverted = false }: { text: string; style?: object; inverted?: boolean }) {
  const parts = text.split(/(\d[\d.,:]*)/).filter(Boolean);
  return (
    <Text {...T} numberOfLines={1} style={[styles.reading, style]}>
      {parts.map((part, index) => (
        <Text
          key={index}
          style={/\d/.test(part)
            ? [styles.readingNumber, inverted && styles.readingNumberInverted]
            : [styles.readingUnit, inverted && styles.readingUnitInverted]}
        >
          {part}
        </Text>
      ))}
    </Text>
  );
}

function ExerciseHeader({ exercise, showHint }: { exercise: ReportExercise; showHint: boolean }) {
  return (
    <View style={styles.exerciseHeader}>
      <Text {...T} style={styles.position}>
        {exercise.position === null ? '–' : String(exercise.position).padStart(2, '0')}
      </Text>
      <View style={styles.exerciseTitleColumn}>
        <Text {...T} numberOfLines={3} style={[styles.exerciseName, exercise.skipped && styles.skippedName]}>
          {exercise.name}
        </Text>
        {showHint && !exercise.skipped ? (
          <Text {...T} style={styles.unitHint}>{exercise.unitHint}</Text>
        ) : null}
      </View>
      {exercise.skipped ? (
        <Text {...T} style={styles.exerciseAside}>Skipped</Text>
      ) : exercise.volume ? (
        <Text {...T} style={styles.exerciseAside}>{exercise.volume}</Text>
      ) : null}
    </View>
  );
}

function ComfortableSets({ exercise, accent }: { exercise: ReportExercise; accent: string }) {
  return (
    <View style={styles.setList}>
      {exercise.sets.map((set) => (
        <View key={set.ordinal} style={styles.setRow}>
          <Text {...T} style={styles.ordinal}>{set.ordinal}</Text>
          {set.skipped ? (
            <Text {...T} style={[styles.skippedSet, styles.rowFill]}>Skipped</Text>
          ) : (
            <SetReading text={set.text} style={styles.rowFill} />
          )}
          <Tags set={set} accent={accent} />
        </View>
      ))}
    </View>
  );
}

function CompactSets({ exercise, accent }: { exercise: ReportExercise; accent: string }) {
  return (
    <View style={styles.grid}>
      {exercise.sets.map((set) => (
        <View key={set.ordinal} style={[styles.cell, set.record && styles.cellRecord]}>
          {set.skipped ? (
            <Text {...T} style={[styles.skippedSet, styles.cellSkipped]}>Skipped</Text>
          ) : (
            <SetReading text={set.compactText} style={styles.cellReading} inverted={set.record} />
          )}
          {set.record ? (
            <View style={styles.cellTagRow}>
              <View style={[styles.tagDot, { backgroundColor: accent }]} />
              <Text {...T} style={[styles.cellTag, styles.tagRecordText]}>NEW BEST</Text>
            </View>
          ) : set.kind !== 'working' && !set.skipped ? (
            <Text {...T} style={styles.cellTag}>{REPORT_SET_TAGS[set.kind]}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/**
 * A training receipt: header, a ruled stat line, then every exercise and set
 * in the order performed. Height follows the content; short workouts read as
 * one row per set, long ones flow their sets into a three-column grid.
 */
export const WorkoutReportView = forwardRef<View, WorkoutReportViewProps>(function WorkoutReportView(
  { report, onLayout },
  ref
) {
  const compact = report.density === 'compact';
  const meta = [report.dateLabel, report.timeLabel].filter(Boolean).join(' · ');
  const notes = [report.intensityLabel, ...report.highlights].filter(Boolean);
  // Two stats spread across the full rule look stranded; they sit left instead.
  const spreadStats = report.stats.length >= 3;
  const weighed = report.exercises.some((exercise) => exercise.measure === 'weight_reps' || exercise.measure === 'weight_duration');

  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={onLayout}
      accessible
      accessibilityLabel={workoutReportText(report)}
      style={styles.page}
    >
      <View style={[styles.band, { backgroundColor: report.accent }]} />

      <View style={styles.header}>
        <Text {...T} style={styles.eyebrow}>WORKOUT REPORT</Text>
        <Text {...T} numberOfLines={2} style={styles.title}>{report.title}</Text>
        <Text {...T} style={styles.meta}>{meta}</Text>
      </View>

      {report.stats.length > 0 ? (
        <View style={styles.stats}>
          {report.stats.map((stat, index) => (
            <View key={stat.key} style={[styles.stat, spreadStats ? styles.statSpread : styles.statFixed, index > 0 && styles.statDivided]}>
              <Text {...T} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.statValue}>
                {stat.value}
                {stat.unit ? <Text style={styles.statUnit}> {stat.unit}</Text> : null}
              </Text>
              <Text {...T} style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {notes.length > 0 ? (
        <Text {...T} style={styles.notes}>
          {/* Non-breaking inside each note, so a wrap only ever falls between notes. */}
          {notes.map((note) => note!.replace(/ /g, '\u00A0')).join('  ·  ')}
        </Text>
      ) : null}

      <View style={styles.exercises}>
        {report.exercises.map((exercise, index) => (
          <View key={`${index}-${exercise.name}`} style={[styles.exercise, index > 0 && styles.exerciseDivided]}>
            <ExerciseHeader exercise={exercise} showHint={compact} />
            {exercise.skipped ? null : compact ? (
              <CompactSets exercise={exercise} accent={report.accent} />
            ) : (
              <ComfortableSets exercise={exercise} accent={report.accent} />
            )}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text {...T} style={styles.wordmark}>stack</Text>
        {weighed ? (
          <Text {...T} style={styles.footerMeta}>{report.unit === 'lbs' ? 'Weights in lbs' : 'Weights in kg'}</Text>
        ) : null}
      </View>
    </View>
  );
});

const GUTTER = 24;
const ORDINAL_WIDTH = 28;

const styles = StyleSheet.create({
  page: {
    width: REPORT_WIDTH,
    backgroundColor: REPORT_PAPER.page,
    paddingBottom: 20,
  },
  band: {
    height: 5,
  },
  header: {
    paddingHorizontal: GUTTER,
    paddingTop: 26,
    paddingBottom: 20,
  },
  eyebrow: {
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: REPORT_PAPER.ink,
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.8,
  },
  meta: {
    color: REPORT_PAPER.soft,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 13,
    marginTop: 6,
  },
  stats: {
    flexDirection: 'row',
    marginHorizontal: GUTTER,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderColor: REPORT_PAPER.ruleStrong,
    paddingVertical: 12,
  },
  stat: {
    flexShrink: 1,
    flexBasis: 'auto',
    paddingRight: 8,
  },
  statSpread: {
    flexGrow: 1,
  },
  statFixed: {
    paddingRight: 28,
  },
  statDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderLeftColor: REPORT_PAPER.rule,
    paddingLeft: 11,
  },
  statValue: {
    color: REPORT_PAPER.ink,
    fontFamily: redesignFonts.monoBold,
    fontSize: 17,
    letterSpacing: -0.5,
  },
  statUnit: {
    color: REPORT_PAPER.soft,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    letterSpacing: 0,
  },
  statLabel: {
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  notes: {
    color: REPORT_PAPER.soft,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: GUTTER,
    marginTop: 12,
  },
  exercises: {
    marginTop: 10,
  },
  exercise: {
    marginHorizontal: GUTTER,
    paddingTop: 16,
    paddingBottom: 14,
  },
  exerciseDivided: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: REPORT_PAPER.rule,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  position: {
    width: ORDINAL_WIDTH,
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    lineHeight: 21,
  },
  exerciseTitleColumn: {
    flex: 1,
    paddingRight: 10,
  },
  exerciseName: {
    color: REPORT_PAPER.ink,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.15,
  },
  skippedName: {
    color: REPORT_PAPER.faint,
  },
  unitHint: {
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.mono,
    fontSize: 10,
    marginTop: 1,
  },
  exerciseAside: {
    color: REPORT_PAPER.soft,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    lineHeight: 21,
  },
  setList: {
    marginTop: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 27,
  },
  ordinal: {
    width: ORDINAL_WIDTH,
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
  },
  reading: {
    fontSize: 14.5,
  },
  rowFill: {
    flex: 1,
  },
  readingNumber: {
    color: REPORT_PAPER.ink,
    fontFamily: redesignFonts.monoBold,
  },
  readingUnit: {
    color: REPORT_PAPER.soft,
    fontFamily: redesignFonts.mono,
  },
  readingNumberInverted: {
    color: REPORT_PAPER.page,
  },
  readingUnitInverted: {
    color: '#BDB3A5',
  },
  skippedSet: {
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.uiItalic,
    fontSize: 13,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: REPORT_PAPER.ruleStrong,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  tagRecord: {
    backgroundColor: REPORT_PAPER.ink,
    borderColor: REPORT_PAPER.ink,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
  tagText: {
    color: REPORT_PAPER.soft,
    fontFamily: redesignFonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1,
  },
  tagRecordText: {
    color: REPORT_PAPER.page,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginLeft: ORDINAL_WIDTH,
    gap: 6,
  },
  cell: {
    width: (REPORT_WIDTH - GUTTER * 2 - ORDINAL_WIDTH - 12) / 3,
    backgroundColor: REPORT_PAPER.well,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
  },
  cellRecord: {
    backgroundColor: REPORT_PAPER.ink,
  },
  cellReading: {
    fontSize: 13,
  },
  cellSkipped: {
    fontSize: 12,
  },
  cellTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cellTag: {
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.monoBold,
    fontSize: 7.5,
    letterSpacing: 0.9,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: GUTTER,
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: REPORT_PAPER.ruleStrong,
  },
  wordmark: {
    color: REPORT_PAPER.ink,
    fontFamily: redesignFonts.display,
    fontSize: 15,
    letterSpacing: -0.4,
  },
  footerMeta: {
    color: REPORT_PAPER.faint,
    fontFamily: redesignFonts.mono,
    fontSize: 9.5,
  },
});
