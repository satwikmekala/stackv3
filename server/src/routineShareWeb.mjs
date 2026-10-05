import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

export const SHARE_PREVIEW_PATH = '/routine-share-assets/stack-routine-v1.png';
export const SHARE_PREVIEW_IMAGE = readFileSync(new URL('../public/stack-routine-v1.png', import.meta.url));
export const SHARE_WEB_ERRORS = {
  broken: 'This routine link is broken.',
  missing: 'This routine is no longer available.',
  failed: 'Couldn’t load this routine. Try again.',
  newer: 'This routine needs a newer Stack. Update to open it.',
};
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const appleAppSiteAssociation = appId => ({
  applinks: { apps: [], details: [{ appID: appId, paths: ['/r/*'] }] },
});

/** Only validated shared structure reaches this document.
 * No exercise definitions, embedded JSON, client scripts or tracking. */
export const renderRoutineSharePage = ({ config, id, split, error }) => {
  const name = split?.name ?? 'Shared routine';
  const workouts = split?.workouts.length ?? 0;
  const exercises = split?.workouts.reduce((total, workout) => total + workout.exercises.length, 0) ?? 0;
  const description = split ? `${workouts} workouts · ${exercises} exercises · Shared from Stack` : SHARE_WEB_ERRORS[error];
  const canonical = split ? `${config.routineSharePublicOrigin}/r/${id}` : null;
  const e = escapeHtml;
  const meta = (property, value) => `<meta property="${property}" content="${e(value)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(name)} · Stack</title>
<meta name="description" content="${e(description)}">${meta('og:title', name)}${meta('og:description', description)}${meta('og:site_name', 'Stack')}${meta('og:type', 'website')}${canonical ? meta('og:url', canonical) + `<link rel="canonical" href="${e(canonical)}">` : ''}${meta('og:image', config.routineSharePublicOrigin + SHARE_PREVIEW_PATH)}${meta('og:image:width', '1200')}${meta('og:image:height', '630')}${meta('og:image:alt', 'Stack — shared routines')}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(name)}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${e(config.routineSharePublicOrigin + SHARE_PREVIEW_PATH)}">${error ? '<meta name="robots" content="noindex">' : ''}
<style>
@font-face{font-family:StackDisplay;src:url('/routine-share-assets/BricolageGrotesque-Latin.woff2') format('woff2');font-weight:700;font-display:swap}
@font-face{font-family:StackUI;src:url('/routine-share-assets/HankenGrotesk-Latin.woff2') format('woff2');font-weight:400 700;font-display:swap}
@font-face{font-family:StackMono;src:url('/routine-share-assets/JetBrainsMono-Latin.woff2') format('woff2');font-weight:400 700;font-display:swap}
:root{color-scheme:dark;--ink:#13110e;--bone:#f5f0e8;--ash:#a99f91;--border:#3a322a;--accent:#ff7a3d}
*{box-sizing:border-box}body{margin:0;background:var(--ink);color:var(--bone);font:400 16px/1.5 StackUI,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:560px;margin:0 auto;padding:48px 24px 40px;min-height:100svh;display:flex;flex-direction:column}header{margin-bottom:64px}.brand{display:inline-flex;align-items:center;gap:10px;font:700 24px/1 StackDisplay,system-ui,sans-serif;letter-spacing:-.5px;color:var(--bone);text-decoration:none}.brand svg{flex:none}
h1{font:700 clamp(36px,8vw,56px)/1.06 StackDisplay,system-ui,sans-serif;letter-spacing:-.035em;margin:16px 0 20px;overflow-wrap:anywhere}p{color:var(--ash);line-height:1.6;margin:0}.label{font:400 11px/1.5 StackMono,monospace;letter-spacing:1.5px;text-transform:uppercase}.counts{margin-bottom:28px}
.workouts{list-style:none;padding:0;margin:0 0 32px;border-top:1px solid var(--border)}.workouts>li{padding:18px 0;border-bottom:1px solid var(--border)}.day{display:flex;justify-content:space-between;align-items:baseline;gap:16px}.day strong{font-size:17px;overflow-wrap:anywhere}.day span{flex:none;color:var(--ash);font-size:13px}.exercises{font-size:14px;margin-top:6px;overflow-wrap:anywhere}
.actions{display:flex;flex-direction:column;gap:12px}.action{display:block;padding:16px 20px;border-radius:999px;text-align:center;text-decoration:none;color:var(--ink);background:var(--bone);font-weight:650}.action.secondary{background:transparent;border:1px solid var(--border);color:var(--bone)}.action:hover{background:#fff;color:var(--ink)}a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.footnote{font-size:14px;margin-top:20px}footer{margin-top:auto;padding-top:48px;font-size:12px;color:#6f6558}@media(min-width:600px){main{padding-top:64px}}
</style></head><body><main><header><a class="brand" href="/" aria-label="Stack home"><svg width="28" height="28" viewBox="0 0 806 806" aria-hidden="true"><rect x="190" y="185" width="616" height="616" rx="176" fill="#FF7A3D" fill-opacity=".3"/><rect x="95" y="92" width="616" height="616" rx="176" fill="#FF7A3D" fill-opacity=".6"/><rect width="616" height="616" rx="176" fill="#FF7A3D"/></svg>Stack</a></header>
<p class="label">Shared from Stack</p><h1>${e(split ? name : description)}</h1>${split ? `<p class="counts">${workouts} workouts · ${exercises} exercises</p>` : ''}
${split ? `<ul class="workouts" aria-label="Workouts">${split.workouts.map((workout, index) => `<li><div class="day"><strong>${e(workout.name || `Workout ${index + 1}`)}</strong><span>${workout.exercises.length} exercises</span></div>${workout.exercises.length ? `<p class="exercises">${workout.exercises.map(exercise => e(exercise.name)).join(' · ')}</p>` : '<p class="exercises">Rest day</p>'}</li>`).join('')}</ul>` : ''}
<div class="actions">${split ? `<a class="action" href="stack://shared-routine?id=${e(id)}">Open in Stack</a>` : ''}${config.stackAppStoreUrl ? `<a class="action secondary" href="${e(config.stackAppStoreUrl)}">Get Stack</a>` : '<a class="action secondary" href="https://www.instagram.com/liftwithstack" rel="noopener noreferrer">Request beta access</a>'}</div>${split ? '<p class="footnote">Open this routine in Stack to review, edit, and save your own copy.</p>' : ''}<footer>Your training, built over time.</footer></main></body></html>`;
};

export const sendRoutineSharePage = (res, status, options) => {
  const html = renderRoutineSharePage(options);
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
  res.end(options.head ? undefined : html);
};
