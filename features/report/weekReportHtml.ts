import { REPORT_SET_TAGS, type ReportExercise, type ReportSet } from '@/features/report/workoutReport';
import type { WeekReport, WeekReportWorkout, WeekSlab } from '@/features/report/weekReport';

/*
 * Week report document. A dark, full-bleed A4 PDF in the Build palette: a
 * cover with the week's stack drawn as vector isometric slabs, then every
 * workout set by set. The page is printed with zero margins, so a small
 * in-document script lays the flowing content into fixed pages, giving each
 * one its own header, footer and padding over the full-bleed background.
 */

/** A4 in PDF points. Styles use pt so the document maps 1:1 onto the page (WebKit prints CSS px at 96 dpi). */
export const WEEK_REPORT_PAGE = { width: 595.28, height: 841.89 } as const;

export type WeekReportFonts = Partial<Record<'display' | 'ui' | 'uiSemiBold' | 'uiBold' | 'uiItalic' | 'mono' | 'monoBold', string>>;
/** Base64 files embedded in the document: the app's typefaces and the official logo (assets/images/logo.png). */
export type WeekReportAssets = { fonts?: WeekReportFonts; logo?: string };

const INK = '#13110E';
const GOLD = '#FFE84A';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

// ---------------------------------------------------------------------------
// Isometric slabs (same footprint, chamfer and face lighting as the 3D Build)
// ---------------------------------------------------------------------------

const COS = Math.cos(Math.PI / 6);
const CUT = 0.24;
const FOOTPRINT: [number, number][] = [[-1, -1], [1, -1], [1, 1 - CUT], [1 - CUT, 1], [-1, 1]];
/** Visible side faces: right (+x), the chamfered key face, left (+z). */
const FACES = [{ edge: 1, light: 0.66 }, { edge: 3, light: 0.86 }, { edge: 2, light: 1.1 }];

function shade(hex: string, light: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6);
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  if (channels.some((channel) => !Number.isFinite(channel))) return hex;
  const mixed = channels.map((channel) => light <= 1 ? channel * light : channel + (255 - channel) * (light - 1));
  return `#${mixed.map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0')).join('')}`;
}

type Projector = (x: number, z: number, y: number) => [number, number];
const projector = (cx: number, cy: number, size: number): Projector => (x, z, y) =>
  [cx + (x - z) * COS * size, cy + (x + z) * 0.5 * size - y];
const pts = (points: [number, number][]) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/** One slab from `bottom` to `bottom + height` (screen px), drawn back to front. */
function slabSvg(project: Projector, bottom: number, height: number, color: string, record: boolean, scale = 1): string {
  const top = bottom + height;
  const ring = FOOTPRINT.map(([x, z]) => [x * scale, z * scale] as [number, number]);
  const seam = record ? Math.min(height * 0.28, Math.max(1.2, height * 0.12)) : 0;
  let svg = '';
  for (const { edge, light } of FACES) {
    const a = ring[edge];
    const b = ring[(edge + 1) % ring.length];
    svg += `<polygon points="${pts([project(a[0], a[1], bottom), project(b[0], b[1], bottom), project(b[0], b[1], top - seam), project(a[0], a[1], top - seam)])}" fill="${shade(color, light)}"/>`;
    if (seam) svg += `<polygon points="${pts([project(a[0], a[1], top - seam), project(b[0], b[1], top - seam), project(b[0], b[1], top), project(a[0], a[1], top)])}" fill="${shade(GOLD, light < 1 ? 0.82 + light * 0.18 : 1)}"/>`;
  }
  svg += `<polygon points="${pts(ring.map(([x, z]) => project(x, z, top)))}" fill="${shade(color, 1.04)}" stroke="${shade(color, record ? 1 : 1.25)}" stroke-opacity="${record ? 0 : 0.55}" stroke-width="0.6"/>`;
  if (record) svg += `<polyline points="${pts([ring[4], ring[3], ring[2], ring[1]].map(([x, z]) => project(x, z, top)))}" fill="none" stroke="${GOLD}" stroke-width="1.1"/>`;
  return svg;
}

function plinthSvg(project: Projector, height: number): string {
  const ring = FOOTPRINT.map(([x, z]) => [x * 1.13, z * 1.13] as [number, number]);
  let svg = '';
  for (const { edge, light } of FACES) {
    const a = ring[edge];
    const b = ring[(edge + 1) % ring.length];
    svg += `<polygon points="${pts([project(a[0], a[1], -height), project(b[0], b[1], -height), project(b[0], b[1], 0), project(a[0], a[1], 0)])}" fill="${shade('#3C3328', light)}"/>`;
  }
  svg += `<polygon points="${pts(ring.map(([x, z]) => project(x, z, 0)))}" fill="#4A3F32"/>`;
  return svg;
}

/**
 * The week's hero: every workout as a slab, oldest at the bottom, with labelled leaders.
 * The contact shadow is returned separately and painted in CSS: SVG gradient opacity prints as solid black.
 */
function heroStack(slabs: readonly WeekSlab[], width: number, height: number): { svg: string; shadow: string } {
  const size = 58;
  const cx = 168;
  const footprintDepth = 4 * 0.5 * size;
  const gap = slabs.length > 6 ? 3 : 5;
  const budget = height - footprintDepth - 58;
  const totalUnits = slabs.reduce((sum, slab) => sum + slab.height, 0);
  const unit = Math.min(30, (budget - gap * Math.max(0, slabs.length - 1)) / Math.max(1, totalUnits));
  const stackHeight = totalUnits * unit + gap * Math.max(0, slabs.length - 1);
  // Centre the whole object (footprint + stack + plinth) in the card.
  const objectHeight = footprintDepth + stackHeight + 10;
  const baseY = (height - objectHeight) / 2 + stackHeight + footprintDepth / 2 + 4;
  const project = projector(cx, baseY, size);

  let body = plinthSvg(project, 9);
  const [shadowX, shadowY] = project(0.15, 0.15, -12);
  const anchors: { y: number; x: number; slab: WeekSlab }[] = [];
  let bottom = 0;
  slabs.forEach((slab) => {
    const h = slab.height * unit;
    body += slabSvg(project, bottom, h, slab.color, slab.record);
    const [ax, ay] = project(1, -1, bottom + h / 2);
    anchors.push({ x: ax, y: ay, slab });
    bottom += h + gap;
  });

  // Labels sit in a column on the right, spread so they never collide; newest on top.
  const labelX = cx + 2 * COS * size + 46;
  const minGap = slabs.length > 6 ? 26 : 32;
  const ordered = [...anchors].sort((a, b) => a.y - b.y);
  const ys = ordered.map((anchor) => anchor.y);
  for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + minGap);
  // Centre the label column on the slabs it names, then keep it inside the card.
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const shift = mean(ordered.map((anchor) => anchor.y)) - mean(ys);
  for (let i = 0; i < ys.length; i++) ys[i] += shift;
  const overflow = ys.length ? ys[ys.length - 1] - (height - 22) : 0;
  if (overflow > 0) for (let i = 0; i < ys.length; i++) ys[i] -= overflow;
  for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], 24 + i * minGap);
  ordered.forEach((anchor, index) => {
    const y = ys[index];
    const elbow = labelX - 14;
    body += `<polyline points="${pts([[anchor.x + 3, anchor.y], [elbow - 10, anchor.y], [elbow, y], [labelX - 6, y]])}" fill="none" stroke="#F5F0E8" stroke-opacity="0.28" stroke-width="0.7"/>`;
    body += `<circle cx="${(anchor.x + 3).toFixed(1)}" cy="${anchor.y.toFixed(1)}" r="1.8" fill="#F5F0E8"/>`;
    body += `<rect x="${labelX}" y="${(y - 9).toFixed(1)}" width="3" height="18" rx="1" fill="${anchor.slab.color}"/>`;
    body += `<text x="${labelX + 10}" y="${(y - 1.5).toFixed(1)}" class="svg-label">${escapeHtml(truncate(anchor.slab.label, 22))}</text>`;
    body += `<text x="${labelX + 10}" y="${(y + 9.5).toFixed(1)}" class="svg-detail">${escapeHtml(anchor.slab.detail)}${anchor.slab.record ? ' <tspan fill="#FFE84A">· PR</tspan>' : ''}</text>`;
  });
  return {
    svg: `<svg width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
    shadow: `radial-gradient(ellipse ${(2.6 * COS * size).toFixed(0)}pt ${(0.62 * size).toFixed(0)}pt at ${shadowX.toFixed(0)}pt ${shadowY.toFixed(0)}pt, rgba(0,0,0,0.62), rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)`,
  };
}

/** A small stack (a day cell, a workout header, the wordmark). */
function miniStackSvg(slabs: readonly Pick<WeekSlab, 'color' | 'height' | 'record'>[], width: number, height: number, size: number, plinth = true): string {
  const gap = Math.max(1.5, size * 0.12);
  const unit = Math.min(size * 0.38, (height - 2 * size - 8 - gap * Math.max(0, slabs.length - 1)) / Math.max(1, slabs.reduce((sum, slab) => sum + slab.height, 0)));
  const stackHeight = slabs.reduce((sum, slab) => sum + slab.height * unit, 0) + gap * Math.max(0, slabs.length - 1);
  const project = projector(width / 2, (height - 2 * size - stackHeight) / 2 + stackHeight + size, size);
  let body = plinth ? plinthSvg(project, Math.max(2, size * 0.18)) : '';
  let bottom = 0;
  for (const slab of slabs) {
    const h = slab.height * unit;
    body += slabSvg(project, bottom, h, slab.color, slab.record);
    bottom += h + gap;
  }
  return `<svg width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

/** An empty day: just the outline of where a slab would sit. */
function emptyDaySvg(width: number, height: number, size: number): string {
  const project = projector(width / 2, height / 2 + 2, size);
  return `<svg width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${pts(FOOTPRINT.map(([x, z]) => project(x, z, 0)))}" fill="none" stroke="#51483A" stroke-width="0.8" stroke-dasharray="2 2"/></svg>`;
}

const truncate = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/** Vector stand-in for the official mark (three cascading rounded squares) if the logo file can't be read. */
const LOGO_FALLBACK = `<svg viewBox="0 0 806 806" xmlns="http://www.w3.org/2000/svg"><rect x="190" y="187" width="616" height="616" rx="182" fill="#FF7A3D" fill-opacity="0.3"/><rect x="94" y="94" width="616" height="616" rx="182" fill="#FF7A3D" fill-opacity="0.72"/><rect x="0" y="3" width="616" height="616" rx="182" fill="#FF7A3D"/></svg>`;

/** The official Stack logo beside the name, as on the welcome screen. */
const wordmark = (logo?: string) =>
  `<div class="brand">${logo ? `<span class="brand-mark"><img src="data:image/png;base64,${logo}" alt="Stack logo"></span>` : `<span class="brand-mark">${LOGO_FALLBACK}</span>`}<span>STACK</span></div>`;

function cover(report: WeekReport, brand: string): string {
  const slabs = report.workouts.map((workout) => workout.slab);
  const stats = report.stats.map((stat) => `<div class="tile"><div class="tile-value">${escapeHtml(stat.value)}${stat.unit ? `<span>${escapeHtml(stat.unit)}</span>` : ''}</div><div class="tile-label">${escapeHtml(stat.label.toUpperCase())}</div></div>`).join('');
  const days = report.days.map((item, index) => `<div class="day${item.slabs.length ? ' active' : ''}">
    <div class="day-name">${escapeHtml(item.weekday.toUpperCase())}</div>
    <div class="day-date">${escapeHtml(item.date)}</div>
    <div class="day-art">${item.slabs.length ? miniStackSvg(item.slabs, 58, 54, 11) : emptyDaySvg(58, 54, 11)}</div>
    <div class="day-count">${item.slabs.length ? (item.slabs.length === 1 ? escapeHtml(truncate(item.slabs[0].label, 12)) : `${item.slabs.length} workouts`) : 'Rest'}</div>
  </div>`).join('');
  const split = report.split.length > 0 ? `<div class="section-label">WHERE THE WEIGHT WENT</div>
    <div class="split-bar">${report.split.map((part) => `<i style="width:${(part.share * 100).toFixed(2)}%;background:${part.color}"></i>`).join('')}</div>
    <div class="split-legend">${report.split.map((part) => `<span><b style="background:${part.color}"></b>${escapeHtml(truncate(part.label, 22))} <em>${Math.round(part.share * 100)}%</em></span>`).join('')}</div>` : '';
  const shown = report.records.slice(0, 3);
  const more = report.records.length - shown.length;
  const records = shown.length ? `<div class="section-label">PRs${more > 0 ? ` <span>+${more} MORE INSIDE</span>` : ''}</div>
    <div class="records">${shown.map((record) => `<div class="record"><div class="record-star">★</div><div class="record-body"><div class="record-name">${escapeHtml(truncate(record.exercise, 26))}</div><div class="record-value">${escapeHtml(record.value)}</div><div class="record-from"><b style="background:${record.color}"></b>${escapeHtml(truncate(record.workout.toUpperCase(), 26))}</div></div></div>`).join('')}</div>` : '';
  const glow = slabs.at(-1)?.color ?? '#FF7A3D';
  const hero = heroStack(slabs, 515, 252);
  return `<section class="page cover">
  <div class="cover-top">${brand}<div class="brand-right">WEEKLY REPORT</div></div>
  <div class="eyebrow">${escapeHtml(report.eyebrow)}</div>
  <h1>${escapeHtml(report.title)}</h1>
  <div class="hero" style="background:${hero.shadow}, radial-gradient(ellipse 60% 70% at 32% 52%, ${glow}2E, transparent 70%), radial-gradient(ellipse 80% 60% at 30% 100%, #2A231C, transparent 75%), #1A1612">
    ${hero.svg}
    <div class="hero-caption">${slabs.length} ${slabs.length === 1 ? 'LAYER' : 'LAYERS'} · OLDEST AT THE BASE</div>
  </div>
  <div class="tiles">${stats}</div>
  <div class="section-label">THE WEEK</div>
  <div class="days">${days}</div>
  ${split}
  ${records}
  <div class="page-foot"><span>Generated with Stack · ${escapeHtml(report.generatedLabel)}</span><span class="page-number"></span></div>
</section>`;
}

function setPill(set: ReportSet, exercise: ReportExercise): string {
  const tag = set.kind !== 'working' ? `<u>${escapeHtml(REPORT_SET_TAGS[set.kind])}</u>` : '';
  const classes = ['pill', set.skipped && 'skipped', set.record && 'record', set.kind !== 'working' && 'bonus'].filter(Boolean).join(' ');
  const text = exercise.measure === 'reps' && !set.skipped ? set.text : set.compactText;
  return `<span class="${classes}" title="${escapeHtml(set.kind !== 'working' ? REPORT_SET_TAGS[set.kind] : '')}"><i>${set.ordinal}</i>${set.record ? 'PR · ' : ''}${escapeHtml(text)}${tag}</span>`;
}

/** Sets beyond this flow into continuation blocks, so one exercise never outgrows a page. */
const SETS_PER_BLOCK = 28;

function exerciseBlocks(exercise: ReportExercise, color: string): string[] {
  const index = exercise.position === null ? '—' : String(exercise.position).padStart(2, '0');
  const meta = [exercise.unitHint, exercise.volume].filter(Boolean).map((part) => escapeHtml(part!)).join(' · ');
  const chunks: ReportSet[][] = [];
  for (let i = 0; i < exercise.sets.length; i += SETS_PER_BLOCK) chunks.push(exercise.sets.slice(i, i + SETS_PER_BLOCK));
  if (chunks.length === 0) chunks.push([]);
  const notes = exercise.notes.map((note) => `<p class="note" style="border-color:${color}">${escapeHtml(note)}</p>`).join('');
  return chunks.map((sets, chunk) => {
    const body = exercise.skipped
      ? `<span class="status">${exercise.notLogged ? 'Not logged' : 'Skipped'}</span>`
      : sets.map((set) => setPill(set, exercise)).join('');
    const continued = chunk > 0 ? ' <em>continued</em>' : '';
    return `<div class="blk exercise${exercise.skipped ? ' is-skipped' : ''}">
      <div class="ex-head"><span class="ex-index" style="color:${exercise.hasRecord ? GOLD : '#6F6558'}">${index}</span><div><div class="ex-name">${escapeHtml(exercise.name)}${continued}</div>${meta ? `<div class="ex-meta">${meta}</div>` : ''}</div></div>
      <div class="ex-sets">${body}</div>
      ${chunk === chunks.length - 1 && notes ? `<div class="ex-notes">${notes}</div>` : ''}
    </div>`;
  });
}

function workoutBlocks(workout: WeekReportWorkout, index: number): string[] {
  const { report, slab } = workout;
  const meta = [report.timeLabel, report.durationLabel, report.intensityLabel].filter((part): part is string => Boolean(part));
  const stats = report.stats.filter((stat) => stat.key !== 'duration').map((stat) => `<div><b>${escapeHtml(stat.value)}${stat.unit ? `<small>${escapeHtml(stat.unit)}</small>` : ''}</b><span>${escapeHtml(stat.label.toUpperCase())}</span></div>`).join('');
  const highlights = report.highlights.map((item) => `<span class="${/^\d+ PRs?$/.test(item) ? 'gold' : ''}">${/^\d+ PRs?$/.test(item) ? '★ ' : ''}${escapeHtml(item)}</span>`).join('');
  const header = `<div class="wk-head" style="--accent:${slab.color}">
    <div class="wk-art">${miniStackSvg([slab], 64, 58, 17)}</div>
    <div class="wk-title">
      <div class="wk-eyebrow" style="color:${slab.color}">${String(index + 1).padStart(2, '0')} · ${escapeHtml(workout.eyebrow)}</div>
      <h2>${escapeHtml(report.title)}</h2>
      ${meta.length ? `<div class="wk-meta">${meta.map(escapeHtml).join('<i>·</i>')}</div>` : ''}
    </div>
    ${stats ? `<div class="wk-stats">${stats}</div>` : ''}
  </div>
  ${highlights ? `<div class="wk-highlights">${highlights}</div>` : ''}
  <div class="wk-rule" style="background:linear-gradient(90deg, ${slab.color}, ${slab.color}00)"></div>`;
  const exercises = report.exercises.flatMap((exercise) => exerciseBlocks(exercise, slab.color));
  if (exercises.length === 0) return [`<div class="blk workout-start">${header}<p class="empty">No logged exercises.</p></div>`];
  // The header never ends a page on its own: it travels with the first exercise.
  const [first, ...rest] = exercises;
  return [`<div class="blk workout-start">${header}${first}</div>`, ...rest];
}

function fontFaces(fonts: WeekReportFonts): string {
  const face = (family: string, weight: number, style: string, data?: string) => data
    ? `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: ${style}; src: url(data:font/ttf;base64,${data}) format('truetype'); }`
    : '';
  return [
    face('Bricolage', 700, 'normal', fonts.display),
    face('Hanken', 400, 'normal', fonts.ui),
    face('Hanken', 600, 'normal', fonts.uiSemiBold),
    face('Hanken', 700, 'normal', fonts.uiBold),
    face('Hanken', 400, 'italic', fonts.uiItalic),
    face('JBMono', 400, 'normal', fonts.mono),
    face('JBMono', 700, 'normal', fonts.monoBold),
  ].join('\n');
}

const STYLES = `
  @page { size: ${WEEK_REPORT_PAGE.width}pt ${WEEK_REPORT_PAGE.height}pt; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: ${INK}; }
  body { color: #F5F0E8; font: 400 10pt/1.4 'Hanken', -apple-system, 'Helvetica Neue', sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; }
  .display { font-family: 'Bricolage', 'Hanken', -apple-system, sans-serif; }
  .mono, .eyebrow, .brand, .brand-right, .tile-label, .section-label, .day-name, .day-count, .page-foot, .run-head, .hero-caption, .wk-eyebrow, .ex-meta, .ex-index, .pill, .wk-stats span, .wk-highlights { font-family: 'JBMono', 'Menlo', monospace; }

  .page { position: relative; width: ${WEEK_REPORT_PAGE.width}pt; height: ${WEEK_REPORT_PAGE.height - 0.5}pt; padding: 34pt 40pt 0; overflow: hidden; background: ${INK}; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .page-foot { position: absolute; left: 40pt; right: 40pt; bottom: 22pt; display: flex; justify-content: space-between; font-size: 6.5pt; letter-spacing: 1.2pt; color: #6F6558; }
  .page-number { color: #A99F91; }

  .cover-top { display: flex; justify-content: space-between; align-items: center; }
  .brand { display: flex; align-items: center; gap: 6pt; font-size: 9pt; font-weight: 700; letter-spacing: 3.2pt; }
  .brand-mark { display: block; width: 21pt; height: 21pt; overflow: hidden; }
  /* logo.png pads its mark: the 806px mark square sits at (378, 378) on the 1563px canvas. */
  .brand-mark img { display: block; width: 193.92%; margin: -46.9% 0 0 -46.9%; }
  .brand-mark svg { display: block; width: 100%; height: 100%; }
  .run-head .brand-mark { width: 15pt; height: 15pt; }
  .brand-right { font-size: 7pt; letter-spacing: 2pt; color: #A99F91; padding: 4pt 8pt; border: 0.6pt solid #3A322A; border-radius: 20pt; }
  .eyebrow { margin-top: 24pt; font-size: 7.5pt; letter-spacing: 2.4pt; color: #A99F91; }
  h1 { margin: 5pt 0 0; font: 700 46pt/1 'Bricolage', 'Hanken', -apple-system, sans-serif; letter-spacing: -2pt; color: #F5F0E8; }
  .hero { position: relative; margin-top: 16pt; height: 252pt; border-radius: 18pt; border: 0.6pt solid #2A231C; overflow: hidden; }
  .hero svg { display: block; }
  .hero-caption { position: absolute; left: 16pt; bottom: 12pt; font-size: 6pt; letter-spacing: 1.6pt; color: #6F6558; }
  .svg-label { font: 600 10.5px 'Hanken', -apple-system, sans-serif; fill: #F5F0E8; }
  .svg-detail { font: 400 6.6px 'JBMono', 'Menlo', monospace; letter-spacing: 0.8px; fill: #A99F91; }

  .tiles { display: flex; gap: 6pt; margin-top: 10pt; }
  .tile { flex: 1; padding: 11pt 12pt 10pt; border-radius: 12pt; background: #1D1915; }
  .tile-value { font: 700 21pt/1.05 'Bricolage', 'Hanken', -apple-system, sans-serif; letter-spacing: -0.6pt; white-space: nowrap; }
  .tile-value span { font: 600 9pt 'Hanken', -apple-system, sans-serif; letter-spacing: 0; color: #A99F91; margin-left: 3pt; }
  .tile-label { margin-top: 5pt; font-size: 6pt; letter-spacing: 1.6pt; color: #A99F91; }

  .section-label { margin: 16pt 0 7pt; font-size: 6.5pt; letter-spacing: 2pt; color: #6F6558; }
  .days { display: flex; gap: 5pt; }
  .day { flex: 1; padding: 7pt 4pt 6pt; border-radius: 10pt; text-align: center; background: #18140F; border: 0.6pt solid #221D17; }
  .day.active { background: #1D1915; border-color: #3A322A; }
  .day-name { font-size: 6pt; letter-spacing: 1.4pt; color: #6F6558; }
  .day.active .day-name { color: #A99F91; }
  .day-date { font: 700 15pt/1.1 'Bricolage', 'Hanken', -apple-system, sans-serif; color: #6F6558; margin-top: 2pt; }
  .day.active .day-date { color: #F5F0E8; }
  .day-art svg { display: block; margin: 0 auto; }
  .day-count { font-size: 5.6pt; letter-spacing: 0.6pt; color: #6F6558; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .day.active .day-count { color: #A99F91; }

  .split-bar { display: flex; height: 7pt; border-radius: 4pt; overflow: hidden; gap: 2pt; }
  .split-bar i { display: block; height: 100%; }
  .split-legend { margin-top: 8pt; display: flex; flex-wrap: wrap; gap: 4pt 14pt; font-size: 8.5pt; color: #F5F0E8; }
  .split-legend b { display: inline-block; width: 6pt; height: 6pt; border-radius: 2pt; margin-right: 5pt; vertical-align: 0; }
  .split-legend em { font-style: normal; color: #A99F91; font-family: 'JBMono', 'Menlo', monospace; font-size: 7.5pt; margin-left: 2pt; }

  .section-label span { color: ${GOLD}99; margin-left: 6pt; }
  .records { display: flex; gap: 6pt; }
  .record { flex: 1; display: flex; gap: 8pt; padding: 9pt 11pt; border-radius: 10pt; background: ${GOLD}0D; box-shadow: inset 0 0 0 0.6pt ${GOLD}40; max-width: 33.333%; }
  .record-star { color: ${GOLD}; font-size: 10pt; line-height: 1; padding-top: 1pt; }
  .record-body { min-width: 0; }
  .record-name { font: 600 9pt/1.2 'Hanken', -apple-system, sans-serif; color: #F5F0E8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .record-value { margin-top: 3pt; font: 700 14pt/1.1 'Bricolage', 'Hanken', -apple-system, sans-serif; color: ${GOLD}; letter-spacing: -0.3pt; white-space: nowrap; }
  .record-from { margin-top: 5pt; font: 400 5.6pt 'JBMono', 'Menlo', monospace; letter-spacing: 1pt; color: #A99F91; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .record-from b { display: inline-block; width: 5pt; height: 5pt; border-radius: 1.5pt; margin-right: 4pt; vertical-align: -0.5pt; }

  .run-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10pt; margin-bottom: 18pt; border-bottom: 0.6pt solid #2A231C; font-size: 6.5pt; letter-spacing: 1.8pt; color: #A99F91; }
  .run-head .brand { font-size: 7pt; letter-spacing: 2.6pt; color: #F5F0E8; }
  .page-body { height: ${WEEK_REPORT_PAGE.height - 34 - 28 - 52}pt; overflow: hidden; }

  .blk { break-inside: avoid; page-break-inside: avoid; }
  .workout-start { padding-top: 6pt; }
  .page-body > .workout-start:not(:first-child) { margin-top: 18pt; }
  .wk-head { display: flex; align-items: center; gap: 12pt; }
  .wk-art svg { display: block; }
  .wk-title { flex: 1; min-width: 0; }
  .wk-eyebrow { font-size: 6.8pt; letter-spacing: 1.8pt; }
  h2 { margin: 3pt 0 0; font: 700 23pt/1.08 'Bricolage', 'Hanken', -apple-system, sans-serif; letter-spacing: -0.7pt; color: #F5F0E8; }
  .wk-meta { margin-top: 4pt; font-size: 8.5pt; color: #A99F91; }
  .wk-meta i { font-style: normal; margin: 0 5pt; color: #51483A; }
  .wk-stats { display: flex; gap: 14pt; text-align: right; }
  .wk-stats b { display: block; font: 700 15pt/1.1 'Bricolage', 'Hanken', -apple-system, sans-serif; letter-spacing: -0.3pt; white-space: nowrap; }
  .wk-stats small { font: 600 7.5pt 'Hanken', -apple-system, sans-serif; color: #A99F91; margin-left: 2pt; letter-spacing: 0; }
  .wk-stats span { display: block; margin-top: 2pt; font-size: 5.6pt; letter-spacing: 1.4pt; color: #6F6558; }
  .wk-highlights { margin-top: 10pt; display: flex; flex-wrap: wrap; gap: 5pt; font-size: 6.6pt; letter-spacing: 0.6pt; text-transform: uppercase; }
  .wk-highlights span { padding: 3pt 7pt; border-radius: 10pt; color: #A99F91; border: 0.6pt solid #3A322A; }
  .wk-highlights .gold { color: ${GOLD}; border-color: ${GOLD}66; background: ${GOLD}12; }
  .wk-rule { height: 1.4pt; margin: 12pt 0 8pt; border-radius: 1pt; opacity: 0.9; }
  .empty { color: #6F6558; font-size: 9pt; }

  .exercise { display: flex; gap: 12pt; padding: 10pt 12pt; margin-top: 5pt; border-radius: 10pt; background: #1A1612; border: 0.6pt solid #241E18; flex-wrap: wrap; }
  .ex-head { width: 36%; display: flex; gap: 8pt; align-items: flex-start; }
  .ex-index { font-size: 7.5pt; padding-top: 2.5pt; letter-spacing: 0.5pt; min-width: 12pt; }
  .ex-name { font: 600 10.5pt/1.25 'Hanken', -apple-system, sans-serif; color: #F5F0E8; overflow-wrap: anywhere; }
  .ex-name em { font: 400 7pt 'JBMono', 'Menlo', monospace; color: #6F6558; text-transform: uppercase; letter-spacing: 1pt; }
  .ex-meta { margin-top: 3pt; font-size: 6.4pt; letter-spacing: 0.6pt; color: #A99F91; }
  .ex-sets { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 4pt; align-content: flex-start; }
  .pill { display: inline-flex; align-items: baseline; gap: 4pt; padding: 4pt 7pt 4pt 6pt; border-radius: 6pt; background: #2A231C; font-size: 8.4pt; color: #F5F0E8; white-space: nowrap; }
  .pill i { font-style: normal; font-size: 5.6pt; color: #6F6558; }
  .pill u { text-decoration: none; font-size: 5.4pt; letter-spacing: 0.8pt; padding: 1pt 3pt; border-radius: 3pt; background: #3D3228; color: #F5F0E8; }
  .pill.record { background: ${GOLD}14; color: ${GOLD}; box-shadow: inset 0 0 0 0.7pt ${GOLD}; }
  .pill.record i { color: ${GOLD}AA; }
  .pill.skipped { background: transparent; color: #6F6558; box-shadow: inset 0 0 0 0.6pt #3A322A; text-decoration: line-through; }
  .status { font-size: 8.5pt; color: #6F6558; padding-top: 2pt; }
  .is-skipped .ex-name { color: #A99F91; }
  .ex-notes { width: 100%; }
  .note { margin: 2pt 0 0 20pt; padding: 1pt 0 1pt 8pt; border-left: 1.4pt solid; font: italic 400 8.6pt/1.45 'Hanken', -apple-system, sans-serif; color: #A99F91; white-space: pre-wrap; overflow-wrap: anywhere; }

  .closing { margin-top: 28pt; text-align: center; color: #6F6558; font: 400 6.5pt 'JBMono', 'Menlo', monospace; letter-spacing: 2pt; }
  .closing svg { display: block; margin: 0 auto 8pt; }

  #source { position: absolute; left: -10000pt; top: 0; width: ${WEEK_REPORT_PAGE.width - 80}pt; }
  @media screen { body { background: #050403; } .page { margin: 0 auto 16pt; } }
`;

/**
 * Lays the flowing blocks into fixed pages. Runs synchronously so the layout
 * exists before the print formatter reads the document, then again once web
 * fonts settle in case they changed any block's height.
 */
const PAGINATE = `(function () {
  function run() {
    var source = document.getElementById('source');
    var pages = document.getElementById('pages');
    var template = document.getElementById('page-template');
    if (!source || !pages || !template) return;
    // The cover is fixed; everything after it is rebuilt.
    while (pages.children.length > 1) pages.removeChild(pages.lastChild);
    var blocks = Array.prototype.slice.call(source.children);
    var body = null;
    function open() {
      var page = template.content ? template.content.firstElementChild.cloneNode(true) : template.firstElementChild.cloneNode(true);
      pages.appendChild(page);
      body = page.querySelector('.page-body');
    }
    open();
    blocks.forEach(function (block) {
      var clone = block.cloneNode(true);
      body.appendChild(clone);
      if (body.scrollHeight > body.clientHeight + 0.5 && body.children.length > 1) {
        body.removeChild(clone);
        open();
        body.appendChild(clone);
      }
    });
    var all = document.querySelectorAll('.page-number');
    for (var i = 0; i < all.length; i++) all[i].textContent = String(i + 1).padStart(2, '0') + ' / ' + String(all.length).padStart(2, '0');
  }
  try { run(); } catch (error) { document.getElementById('source').removeAttribute('id'); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { try { run(); } catch (error) {} });
})();`;

export function weekReportHtml(report: WeekReport, { fonts = {}, logo }: WeekReportAssets = {}): string {
  const brand = wordmark(logo);
  const blocks = report.workouts.flatMap((workout, index) => workoutBlocks(workout, index));
  blocks.push(`<div class="blk closing">${miniStackSvg(report.workouts.slice(-4).map((workout) => workout.slab), 40, 40, 10)}END OF ${escapeHtml(report.eyebrow.split(' · ')[0])}</div>`);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${WEEK_REPORT_PAGE.width}">
<title>Stack · ${escapeHtml(report.title)}</title>
<style>${fontFaces(fonts)}${STYLES}</style></head><body>
<div id="pages">${cover(report, brand)}</div>
<template id="page-template"><section class="page"><div class="run-head">${brand}<span>${escapeHtml(report.rangeLabel)}</span></div><div class="page-body"></div><div class="page-foot"><span>Weekly report</span><span class="page-number"></span></div></section></template>
<div id="source">${blocks.join('')}</div>
<script>${PAGINATE}</script>
</body></html>`;
}

/** "Stack - Week of 28 Sep 2026.pdf"; safe for Files, Mail and WhatsApp. */
export function weekReportFilename(report: Pick<WeekReport, 'id'>): string {
  const [year, month, date] = report.id.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = year && month && date ? `${date} ${months[month - 1]} ${year}` : 'this week';
  return `Stack - Week of ${label}.pdf`;
}
