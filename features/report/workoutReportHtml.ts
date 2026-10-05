import { REPORT_SET_TAGS, type WorkoutReport } from '@/features/report/workoutReport';

/** Treat names and notes as text, never as markup in the exported document. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

/** Selectable text and paginated tables, rather than a screenshot of a long view. */
export function workoutReportHtml(report: WorkoutReport): string {
  const stats = report.stats.map((stat) => `<td><strong>${escapeHtml(stat.value)}${stat.unit ? ` <small>${escapeHtml(stat.unit)}</small>` : ''}</strong><span>${escapeHtml(stat.label)}</span></td>`).join('');
  const exercises = report.exercises.map((exercise) => {
    const rows = exercise.sets.map((set) => {
      const tags = [set.kind !== 'working' ? REPORT_SET_TAGS[set.kind] : '', set.record ? 'PR' : ''].filter(Boolean);
      return `<tr${set.skipped ? ' class="skipped"' : ''}><td>${set.ordinal}</td><td>${escapeHtml(set.text)}</td><td>${escapeHtml(tags.join(' · '))}</td></tr>`;
    }).join('');
    const sets = rows ? `<table class="sets"><thead><tr><th>Set</th><th>Result</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted">Not logged</p>';
    const notes = exercise.notes.map((note) => `<p class="note"><strong>Note</strong> ${escapeHtml(note)}</p>`).join('');
    const needsPageFlow = exercise.sets.length > 12 || exercise.notes.join('').length > 600;
    return `<section class="exercise${needsPageFlow ? ' long-exercise' : ''}"><h2>${exercise.position !== null ? `${exercise.position}. ` : ''}${escapeHtml(exercise.name)}</h2>${exercise.volume ? `<p class="exercise-volume">Moved: ${escapeHtml(exercise.volume)}</p>` : ''}${sets}${notes}</section>`;
  }).join('');
  const details = [report.timeLabel, report.intensityLabel].filter((value): value is string => Boolean(value));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(report.title)} - Workout report</title>
<style>
  @page { size: A4; margin: 32pt; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #211e1a; background: #fff; font: 11pt -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; line-height: 1.45; }
  .brand { font-size: 10pt; font-weight: 700; letter-spacing: 2pt; color: #655d53; border-bottom: 2pt solid #211e1a; padding-bottom: 10pt; }
  h1 { font-size: 28pt; line-height: 1.15; margin: 20pt 0 8pt; overflow-wrap: anywhere; }
  .date, .details { color: #655d53; margin: 3pt 0; }
  .stats { width: 100%; border-collapse: collapse; margin: 20pt 0 14pt; table-layout: fixed; }
  .stats td { padding: 10pt 8pt; background: #f4f1eb; vertical-align: top; }
  .stats strong { display: block; font-size: 18pt; line-height: 1.25; }
  .stats small { font-size: 10pt; }
  .stats span { display: block; margin-top: 4pt; font-size: 9pt; color: #655d53; }
  .highlights { color: #655d53; margin-bottom: 20pt; }
  .exercise { margin: 22pt 0; break-inside: avoid; page-break-inside: avoid; }
  .long-exercise { break-inside: auto; page-break-inside: auto; }
  .compact .exercise { margin: 16pt 0; }
  .compact .sets th, .compact .sets td { padding-top: 5pt; padding-bottom: 5pt; }
  h2 { font-size: 15pt; line-height: 1.3; margin: 0 0 8pt; break-after: avoid; page-break-after: avoid; overflow-wrap: anywhere; }
  .exercise-volume { margin: 0 0 8pt; color: #655d53; font-size: 10pt; break-after: avoid; page-break-after: avoid; }
  .sets { border-collapse: collapse; width: 100%; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { text-align: left; padding: 7pt 8pt; border-bottom: 0.5pt solid #dfd9cf; overflow-wrap: anywhere; }
  th { font-size: 9pt; color: #655d53; background: #f4f1eb; }
  .sets th:first-child, .sets td:first-child { width: 12%; }
  .sets th:nth-child(2), .sets td:nth-child(2) { width: 48%; }
  .sets td:last-child { font-size: 9pt; color: #655d53; }
  .skipped, .muted { color: #81786d; }
  .note { white-space: pre-wrap; overflow-wrap: anywhere; margin: 10pt 0 0; color: #655d53; orphans: 3; widows: 3; }
</style></head><body class="${report.density === 'compact' ? 'compact' : 'comfortable'}">
<div class="brand">STACK / WORKOUT REPORT</div>
<h1>${escapeHtml(report.title)}</h1><p class="date">${escapeHtml(report.dateLabel)}</p>
${details.length ? `<p class="details">${details.map(escapeHtml).join(' · ')}</p>` : ''}
${stats ? `<table class="stats"><tbody><tr>${stats}</tr></tbody></table>` : ''}
${report.highlights.length ? `<p class="highlights">${report.highlights.map(escapeHtml).join(' · ')}</p>` : ''}
${exercises || '<p class="muted">No logged exercises.</p>'}
</body></html>`;
}

/** Avoid path separators and keep a useful name in WhatsApp and Files. */
export function workoutReportFilename(report: Pick<WorkoutReport, 'title' | 'id'>): string {
  const title = report.title.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'Workout';
  const id = report.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'session';
  return `${title} - ${id} - Workout report.pdf`;
}
