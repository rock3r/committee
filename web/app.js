'use strict';
/* Committee · Review workspace. Plain script; CSP: script-src 'self'. */

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- DOM helpers ----------
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') throw Error('html not allowed');
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}
function icon(name, cls) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

const sessionKey = s => `${s.eventId}:${s.id}`;
const workspaceSession = s => ({ ...s, sourceId: s.id, id: sessionKey(s) });
const initialParams = new URLSearchParams(location.search);
// ---------- State ----------
const state = {
  token: '', profile: 'collaborative', q: '', topic: initialParams.get('topic') || '', event: initialParams.get('event') || '', sort: 'title', openOnly: false,
  all: [], view: [], labels: {}, status: null, loaded: false,
  selected: initialParams.get('event') && initialParams.get('session') ? `${initialParams.get('event')}:${initialParams.get('session')}` : initialParams.get('session'),
  compare: null, compareOpener: null, origin: null,
  expanded: new Set(), openForm: null, serial: 0,
};

// ---------- Reader mode (published copy) ----------
// The hosting Worker serves these same files. Off loopback, or with a #connect= fragment, the page reads a published
// bundle with a reviewer connection code instead of the local API. Read-only: no corrections, no sync, no local endpoints.
const LOOPBACK = ['127.0.0.1', 'localhost', '[::1]'];
// Decided at boot from GET /api/runtime ({mode:'admin'|'reader'}); the hostname and #connect= fragment are fallbacks when that call fails.
let READER = !LOOPBACK.includes(location.hostname) || location.hash.startsWith('#connect=');
const CONNECTION_KEY = 'committee.connection';
let connection = null;
function parseConnection(code) {
  let d;
  try { const b64 = String(code).trim().replace(/-/g, '+').replace(/_/g, '/'); d = JSON.parse(atob(b64 + '='.repeat((4 - b64.length % 4) % 4))); } catch { throw Error('This connection code could not be read. Paste the whole code from your invitation.'); }
  if (d?.schemaVersion !== 1 || typeof d.token !== 'string' || !d.token || !Array.isArray(d.eventIds) || !d.eventIds.length || !d.eventIds.every(v => typeof v === 'string' && /^\d+$/.test(v))) throw Error('This connection code is not valid.');
  let origin; try { const u = new URL(d.origin); if (u.origin !== d.origin || !(u.protocol === 'https:' || LOOPBACK.includes(u.hostname))) throw 0; origin = u.origin; } catch { throw Error('The connection code points at an address this page cannot use.'); }
  return { schemaVersion: 1, origin, token: d.token, eventIds: [...new Set(d.eventIds)] };
}
// On the hosted reader the Worker's CSP only allows same-origin calls, so an invitation for another site cannot work here.
function checkConnectionSite(conn, pageOrigin, pageIsLoopback) {
  if (pageIsLoopback) return;
  if (conn.origin !== pageOrigin) throw Object.assign(Error(`This invitation is for ${conn.origin}, not this site. Open it there, or ask the organiser for an invitation to this site.`), { status: 400 });
}
const storedConnection = { get() { try { return localStorage.getItem(CONNECTION_KEY) || ''; } catch { return ''; } }, set(v) { try { localStorage.setItem(CONNECTION_KEY, v); } catch { /* memory only */ } }, clear() { try { localStorage.removeItem(CONNECTION_KEY); } catch { /* ignore */ } } };
// Bundle findings carry only approved, non-private data; map them onto the local finding shape without inventing state.
function readerFinding(f) {
  const approved = !['mechanical', 'detector'].includes(f.kind); // the bundle only carries human-approved non-mechanical findings
  return { id: f.id, label: f.label, kind: f.kind, strength: f.strength, reason: f.reason, quote: f.quote, sources: f.sources || [], inputClasses: f.inputClasses || [], origin: 'published', disposition: 'open', note: '', identityConfirmed: approved && f.kind === 'speaker', humanApproved: approved };
}
function readerSessions(bundle) {
  return (bundle.sessions || []).map(s => ({ ...s, abstract: typeof s.abstract === 'string' ? s.abstract : '', abstractOmitted: typeof s.abstract !== 'string', findings: (s.findings || []).map(readerFinding) }));
}
function readerMatches(s, q) {
  const words = (q || '').toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return true;
  const hay = [s.title, s.abstract, ...(s.speakers || [])].join(' ').toLowerCase();
  return words.every(w => hay.includes(w));
}

// ---------- API ----------
async function api(path, options = {}) {
  let r;
  if (READER && options.method && options.method !== 'GET') throw Object.assign(Error('This is a read-only published copy. Corrections and sync happen in the local workspace.'), { status: 405 });
  try {
    r = await fetch(READER && connection ? connection.origin + path : path, { ...options, headers: { Authorization: `Bearer ${READER && connection ? connection.token : state.token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  } catch {
    throw Object.assign(Error(READER ? 'The published copy could not be reached. Check your connection, then try again.' : 'The local server did not answer. Check that it is still running, then try again.'), { network: true });
  }
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try { msg = (await r.json()).error || msg; } catch { /* keep default */ }
    throw Object.assign(Error(msg), { status: r.status });
  }
  return r.json();
}

// ---------- Finding semantics ----------
const ORIGINS = {
  'mechanical-v1': 'Mechanical check', 'legacy-import': 'Legacy import', 'claim-check-v1': 'Claim checker',
  'speaker-research-v1': 'Speaker research', 'verifier-v1': 'Verifier', 'editorial-v1': 'Editorial model', published: 'Published copy',
};
const KIND_LABEL = { mechanical: 'mechanical measurement', editorial: 'editorial assessment', claim: 'claim check', speaker: 'speaker evidence', detector: 'detector signal' };
const STATE_INFO = {
  verified: { label: 'Verified', tip: 'Checked against the cited sources by a verifier (second model or human). Verification does not make a finding a decision.' },
  concern: { label: 'Verified', tip: 'A verified, major finding. Checked against the cited sources by a verifier. Still advisory: the committee decides.' },
  proposed: { label: 'Proposed', tip: 'Proposed by an analysis model and not yet verified. Treat as a lead to inspect, not a conclusion.' },
  contested: { label: 'Contested', tip: 'A reviewer disagreed with this finding and left a note. It stays visible until resolved.' },
  legacy: { label: 'Legacy / unverified', tip: 'Imported from the earlier pilot. Not re-checked by this workspace; sources may be missing.' },
  measured: { label: 'Measured', tip: 'A deterministic measurement of the text (for example word count). It is a fact, not a judgement.' },
  detector: { label: 'Detector', tip: 'A cached AI-detector result. Separate from editorial quality and not an authorship probability.' },
  dismissed: { label: 'Dismissed', tip: 'Dismissed by a reviewer with a reason. Hidden from injected badges; it will not silently return on reruns.' },
  approved: { label: 'Approved', tip: 'A reviewer approved this model-proposed finding after checking it. It can appear in badges and published copies. Approval is not a decision about the proposal.' },
};
const SEV_ORDER = { major: 0, minor: 1, info: 2 };

function describe(f) {
  const d = { f };
  d.dismissed = f.disposition === 'dismissed';
  d.detector = f.kind === 'detector';
  const strength = String(f.strength || '').toLowerCase();
  let s = f.status;
  if (!s) {
    if (d.detector) s = 'detector';
    else if (strength.includes('legacy') || f.origin === 'legacy-import') s = 'legacy';
    else if (strength === 'measured' && f.kind === 'mechanical') s = 'measured';
    else if (strength === 'verified') s = 'verified';
    else s = 'proposed';
  }
  if (d.detector) s = 'detector';
  d.model = typeof f.origin === 'string' && f.origin.startsWith('analysis-v1');
  const reviewed = (d.model || f.origin === 'published') && !d.detector && f.kind !== 'mechanical';
  d.awaitingApproval = d.model && f.humanApproved !== true;
  if (reviewed) s = f.humanApproved === true ? 'approved' : 'proposed';
  d.severity = f.severity && SEV_ORDER[f.severity] !== undefined ? f.severity : null;
  d.state = d.dismissed ? 'dismissed' : (s === 'verified' && d.severity === 'major' ? 'concern' : s);
  d.stateInfo = STATE_INFO[d.state] || STATE_INFO.proposed;
  d.provenance = ORIGINS[f.origin] || f.origin || 'Unknown origin';
  d.kindLabel = KIND_LABEL[f.kind] || f.kind;
  d.checked = f.checkedAt || null;
  d.coverage = f.coverage || null;
  d.reviewerDerived = (f.inputClasses || []).some(x => ['reviewer', 'outcome'].includes(x));
  d.identityGate = f.kind === 'speaker' && !(f.identityConfirmed && f.humanApproved);
  d.verification = f.verification && f.verification.verdict ? f.verification : null;
  return d;
}
function findingRank(d) {
  if (d.dismissed) return 100;
  const sev = d.severity ? SEV_ORDER[d.severity] : 3;
  const st = { concern: 0, verified: 1, approved: 2, contested: 3, proposed: 4, legacy: 5, measured: 6, detector: 7 }[d.state] ?? 4;
  return sev * 10 + st;
}
function sortedFindings(s) {
  return s.findings.map(describe).sort((a, b) => findingRank(a) - findingRank(b) || (b.checked || '').localeCompare(a.checked || ''));
}
function summarise(s) {
  const c = { verified: 0, concern: 0, approved: 0, proposed: 0, contested: 0, legacy: 0, measured: 0, detector: 0, dismissed: 0, open: 0, latest: '' };
  for (const d of s.findings.map(describe)) {
    c[d.state]++;
    if (!d.dismissed && d.state !== 'detector' && d.state !== 'measured') c.open++;
    if (d.checked && d.checked > c.latest) c.latest = d.checked;
  }
  return c;
}

// ---------- Formatting ----------
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtDateTime = iso => { const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
function fmtRel(iso) {
  const t = new Date(iso).getTime(); if (isNaN(t)) return String(iso);
  const s = Math.round((Date.now() - t) / 1000), a = Math.abs(s);
  const unit = a < 60 ? [s, 'second'] : a < 3600 ? [Math.round(s / 60), 'minute'] : a < 86400 ? [Math.round(s / 3600), 'hour'] : a < 86400 * 30 ? [Math.round(s / 86400), 'day'] : a < 86400 * 365 ? [Math.round(s / (86400 * 30)), 'month'] : [Math.round(s / (86400 * 365)), 'year'];
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-unit[0], unit[1]);
}
const host = url => { try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; } };
const topicLabel = t => typeof t === 'string' ? t : (t.label || t.id || '');
const topicInferred = t => typeof t !== 'string' && t.source === 'inferred';
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// Categorical colour: a stable hue per topic name, and a fixed hue per session format.
function hueFor(name) { let h = 0; for (const ch of String(name).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 'hue-' + (1 + (h % 8)); }
function formatClass(f) { const s = String(f || '').toLowerCase(); for (const k of ['workshop', 'keynote', 'lightning', 'panel', 'session']) if (s.includes(k)) return 'fmt fmt-' + k; return 'fmt'; }
const formatTag = (s, tip) => s.format[0] ? el('span', { class: formatClass(s.format[0]), text: s.format[0], 'data-tip': tip ? `Format: ${s.format.join(', ')}` : null }) : null;

// ---------- Banner / errors ----------
let retryAction = null;
function banner(message, retry) {
  $('banner-text').textContent = message; retryAction = retry || null; $('banner-retry').hidden = !retry; $('banner').hidden = false;
}
function clearBanner() { $('banner').hidden = true; retryAction = null; }
$('banner-close').onclick = clearBanner;
$('banner-retry').onclick = () => { const r = retryAction; clearBanner(); if (r) r(); };
function shake(node) { node.classList.remove('is-shaking'); void node.offsetWidth; node.classList.add('is-shaking'); node.addEventListener('animationend', () => node.classList.remove('is-shaking'), { once: true }); }

// ---------- Unlock / lock ----------
// The token is kept in this browser's localStorage until Lock is pressed or the server rejects it (401).
const TOKEN_KEY = 'committee.accessToken';
const storedToken = { get() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } }, set(v) { try { localStorage.setItem(TOKEN_KEY, v); } catch { /* storage unavailable: memory only */ } }, clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } } };
async function unlock(token) {
  if (READER) { const conn = parseConnection(token); checkConnectionSite(conn, location.origin, LOOPBACK.includes(location.hostname)); connection = conn; await load({ fresh: true }); storedConnection.set(token); }
  else { state.token = token; await load({ fresh: true }); storedToken.set(token); }
  $('unlock').hidden = true; $('workspace').hidden = false; $('workspace-nav').hidden = false; $('workspace-role').textContent = READER ? 'Reviewer copy' : 'Local admin'; document.querySelectorAll('[data-section]').forEach(b => b.hidden = READER && b.dataset.section !== 'review'); $('lock').hidden = false;
  for (const id of ['search', 'topic', 'profile']) $(id).disabled = false;
  if (READER) $('profile').disabled = true;
  clearBanner();
}
$('login').addEventListener('submit', async e => {
  e.preventDefault();
  const input = $('token'), err = $('token-error'), btn = e.submitter || $('login').querySelector('button');
  const token = input.value.trim();
  err.hidden = true; input.classList.remove('is-error');
  if (!token) { err.textContent = READER ? 'Paste your connection code first.' : 'Paste the token first.'; err.hidden = false; input.classList.add('is-error'); shake(input); input.focus(); return; }
  btn.disabled = true; btn.classList.add('is-busy');
  try {
    await unlock(token);
    input.value = '';
    ($('list').querySelector('[aria-current="true"]') || $('search')).focus();
  } catch (ex) {
    state.token = '';
    err.textContent = ex.status === 401 ? (READER ? 'This connection was not accepted. It may have been revoked; ask the organiser for a new invitation.' : 'That token was not accepted. Copy it again from the token file the server printed.') : ex.message;
    err.hidden = false; input.classList.add('is-error'); shake(input); input.focus(); input.select();
  } finally { btn.disabled = false; btn.classList.remove('is-busy'); }
});
$('token').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('login').requestSubmit(); } });
$('lock').onclick = () => lock();
function lock(message) {
  $('workspace-nav').hidden = true; $('data').hidden = true; state.token = ''; storedToken.clear(); if (READER) { connection = null; storedConnection.clear(); } state.all = []; state.view = []; state.loaded = false; state.serial++; state.compare = null; state.expanded.clear();
  $('list').replaceChildren(); $('reading-inner').replaceChildren(); $('compare-inner').replaceChildren();
  $('workspace').hidden = true; $('workspace').classList.remove('has-compare'); $('compare').hidden = true;
  $('unlock').hidden = false; $('lock').hidden = true;
  for (const id of ['search', 'topic', 'profile']) $(id).disabled = true;
  $('capture').hidden = true; if (!dataDlg.hidden) showSection('review');
  if (message) banner(message);
  $('token').focus();
}

// ---------- Loading ----------
function skeletons() {
  $('list').replaceChildren(...Array.from({ length: 8 }, () => el('li', { class: 'skel-row', 'aria-hidden': 'true' }, el('span', { class: 'skel' }), el('span', { class: 'skel' }))));
  $('reading-inner').replaceChildren(
    el('div', { class: 'skel-reading', 'aria-hidden': 'true' },
      el('span', { class: 'skel skel-title' }), el('span', { class: 'skel skel-meta' }),
      ...Array.from({ length: 6 }, () => el('span', { class: 'skel skel-line' }))));
  $('count').textContent = 'Loading proposals…';
}
async function loadReader({ fresh = false, keepScroll = false } = {}) {
  const seq = ++state.serial;
  if (fresh) skeletons();
  const conn = await api('/api/connection');
  const bundles = await Promise.all((conn.eventIds || connection.eventIds).map(id => api('/api/bundle?eventId=' + encodeURIComponent(id)).catch(ex => ({ error: ex.message, event: { id, name: `Event ${id}` }, sessions: [] }))));
  if (seq !== state.serial) return;
  const all = []; const events = []; const labels = {}; let profile = null;
  for (const b of bundles) {
    for (const s of readerSessions(b)) { all.push(workspaceSession(s)); for (const f of s.findings || []) if (f.label && !labels[f.label]) labels[f.label] = (b.sessions || []).flatMap(x => x.findings || []).find(x => x.label === f.label)?.caption || f.label; }
    events.push({ eventId: b.event?.id || '', name: b.event?.name || `Event ${b.event?.id}`, sessions: (b.sessions || []).length, capturedAt: b.event?.capturedAt || null, generatedAt: b.generatedAt || null, revision: b.revision || null, error: b.error || null, includeAbstracts: b.includeAbstracts });
    if (b.profile) profile = b.profile;
  }
  state.all = all; state.labels = labels; state.loaded = true;
  state.status = { events, published: { label: conn.label || '', profile, generatedAt: events.map(e => e.generatedAt).filter(Boolean).sort().pop() || null } };
  if (profile) { state.profile = profile; $('profile').value = profile; }
  state.view = all.filter(s => readerMatches(s, state.q)).filter(s => !state.topic || s.topics.map(topicLabel).includes(state.topic));
  renderEvents(); renderCapture(); renderTopics();
  if (state.selected && !state.selected.includes(':')) { const matches = state.all.filter(s => s.sourceId === state.selected); state.selected = matches.length === 1 ? matches[0].id : null; }
  const before = state.selected;
  if (!state.selected || !state.all.some(s => s.id === state.selected)) state.selected = (visible()[0] || state.all[0] || {}).id || null;
  if (fresh && state.topic && !state.origin) { const s = current(); if (s) { state.origin = { id: s.id, title: s.title }; renderScope(); } }
  renderDocket(); renderReading({ keepScroll: keepScroll || (!fresh && state.selected === before), animate: fresh || state.selected !== before });
  if (state.compare) renderCompare({ animate: false });
}
async function load({ fresh = false, refreshAll = false, keepScroll = false } = {}) {
  if (READER) return loadReader({ fresh, keepScroll });
  const seq = ++state.serial;
  if (fresh) skeletons();
  const params = new URLSearchParams({ q: state.q, profile: state.profile });
  const [filtered, all] = await Promise.all([
    api('/api/sessions?' + params),
    (fresh || refreshAll || !state.all.length) ? api('/api/sessions?' + new URLSearchParams({ profile: state.profile })) : null,
  ]);
  if (seq !== state.serial) return;
  filtered.sessions = filtered.sessions.map(workspaceSession);
  if (all) state.all = all.sessions.map(workspaceSession);
  else for (const s of filtered.sessions) { const i = state.all.findIndex(x => x.id === s.id); if (i >= 0) state.all[i] = s; }
  state.view = filtered.sessions.filter(s => !state.topic || reviewTopics(s).some(t=>t.name.toLowerCase()===state.topic.toLowerCase())); state.labels = filtered.labels; state.status = filtered.status; state.loaded = true;
  renderEvents(); renderCapture(); renderTopics();
  if (state.selected && !state.selected.includes(':')) { const matches = state.all.filter(s => s.sourceId === state.selected); state.selected = matches.length === 1 ? matches[0].id : null; }
  const before = state.selected;
  if (!state.selected || !state.all.some(s => s.id === state.selected)) state.selected = (visible()[0] || state.all[0] || {}).id || null;
  if (fresh && state.topic && !state.origin) { const s = current(); if (s) { state.origin = { id: s.id, title: s.title }; renderScope(); } }
  renderDocket(); renderReading({ keepScroll: keepScroll || (!fresh && state.selected === before), animate: fresh || state.selected !== before });
  if (state.compare) renderCompare({ animate: false });
}
function reload(opts) { return load(opts).catch(ex => { if (ex.status === 401) lock('Your session was rejected by the local server. Unlock again to continue.'); else banner(ex.message, () => reload(opts)); }); }

const eventName = id => state.status?.events?.find(e => e.eventId === id)?.name || `Event ${id}`;
function renderCapture() {
  const st = state.status || {}; const c = $('capture-text'); $('capture').hidden = false;
  if (READER) {
    const p = st.published || {}; const ev = st.events?.find(e => e.eventId === state.event) || st.events?.[0];
    c.textContent = p.generatedAt ? `Published ${fmtDate(p.generatedAt)}` : 'Published copy';
    c.dataset.tip = `Read-only published copy${p.label ? ` for ${p.label}` : ''} · ${st.events?.length || 0} event${st.events?.length === 1 ? '' : 's'}${ev?.revision ? ` · revision ${ev.revision.slice(0, 12)}` : ''}${p.profile ? ` · ${p.profile} profile` : ''}.`;
    $('capture').dataset.tip = c.dataset.tip + ' Open for details.';
    $('profile').disabled = true; $('profile').closest('.field').dataset.tip = 'The published copy was generated with this view profile; it cannot be changed here.';
    return;
  }
  const event = st.events?.find(e => e.eventId === state.event);
  if (event?.capturedAt) {
    c.textContent = `Capture ${fmtDate(event.capturedAt)}`;
    c.dataset.tip = `${eventName(event.eventId)} · captured ${fmtDateTime(event.capturedAt)} · ${plural(event.sessions, 'proposal')}.`;
  } else if (st.latest?.captured_at) {
    c.textContent = `Capture ${fmtDate(st.latest.captured_at)}`;
    const failed = (st.jobs || []).find(j => j.status === 'failed');
    c.dataset.tip = `Sessionize capture from ${fmtDateTime(st.latest.captured_at)}, imported ${fmtRel(st.latest.imported_at)}. ${st.versions?.n ?? '?'} proposal versions across ${st.snapshots?.n ?? '?'} snapshot${st.snapshots?.n === 1 ? '' : 's'}.` + (failed ? ` ${plural(failed.count, 'analysis job')} failed; rerun from the CLI.` : '');
    if (failed) c.textContent += ` · ${plural(failed.count, 'failed job')}`;
  } else { c.textContent = 'No import yet'; c.dataset.tip = 'The local database has no Sessionize capture. Open to sync one.'; }
  $('capture').dataset.tip = c.dataset.tip + ' Open the data panel.';
}
// Events: until the backend filters by event, the selector narrows the list client-side on each session's eventId.
function events() { const m = new Map(); for (const s of state.all) m.set(s.eventId, (m.get(s.eventId) || 0) + 1); return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true })); }
function renderEvents() {
  const ev = events(); const sel = $('event'); $('event-field').hidden = ev.length < 2;
  sel.replaceChildren(el('option', { value: '', text: `All events (${state.all.length})` }), ...ev.map(([id, n]) => el('option', { value: id, text: `${eventName(id)} (${n})` })));
  if (!ev.some(([id]) => id === state.event)) state.event = '';
  sel.value = state.event;
}
// Submitted tags win when a model proposes the same topic spelling.
function reviewTopics(s, includeDrafts = !READER) {
  const byName = new Map((s.submittedTopics || s.topics || []).map(t => [topicLabel(t).toLowerCase(), {name:topicLabel(t), inferred:topicInferred(t), proposed:false}]));
  if (s.analysis?.topicsApproved !== false && (includeDrafts || s.analysis?.topicsApproved)) for (const t of s.analysis?.topics || []) {
    if (!byName.has(t.name.toLowerCase())) byName.set(t.name.toLowerCase(), {...t,inferred:true,proposed:s.analysis.topicsApproved !== true});
  }
  return [...byName.values()];
}
function speakerPanel(s) {
  return el('section', {class:'speaker-panel',id:'speaker-details',hidden:true,'aria-label':'Speaker details'}, ...s.speakers.map(name => {
    const profile=(s.speakerProfiles || []).find(p=>p.name===name), assessment=s.analysis?.speakerAssessments?.find(p=>p.name===name);
    const others=state.all.filter(o=>o.eventId===s.eventId && o.id!==s.id && o.speakers.includes(name));
    return el('article',null,el('h2',{text:name}),profile?.tagline ? el('p',{class:'muted',text:profile.tagline}) : null,
      el('h3',{text:'Submitted biography'}),el('p',{class:'speaker-bio',text:profile?.bio || 'No biography is included in this dataset.'}),
      el('h3',{text:'Research assessment'}),assessment ? el('div',null,el('p',{text:assessment.reason}),el('p',{class:'muted',text:'Model assessment · awaiting committee review'}),el('ul',null,...(assessment.sources||[]).map(x=>el('li',null,el('a',{href:x.url,target:'_blank',rel:'noopener noreferrer',text:x.title || host(x.url)}))))) : el('p',{class:'muted',text:READER?'Speaker research is not included in this published copy.':'Speaker research has not been completed for this proposal.'}),
      others.length ? el('div',null,el('h3',{text:'Other submissions in this event'}),...others.map(o=>el('button',{type:'button',class:'speaker-other',text:o.title,onclick:()=>select(o.id)}))) : null);
  }));
}
function renderTopics() {
  const sel = $('topic'); const current = state.topic;
  const counts = new Map(), submitted = new Set();
  for (const s of state.all.filter(s => !state.event || s.eventId === state.event)) for (const t of reviewTopics(s)) { const l = t.name; counts.set(l, (counts.get(l) || 0) + 1);if(!t.inferred)submitted.add(l); }
  const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
  sel.replaceChildren(el('option', { value: '', text: 'All topics' }), ...names.map(n => el('option', { value: n, text: `${n} (${counts.get(n)})${submitted.has(n) ? '' : ' · inferred'}` })));
  sel.value = names.includes(current) ? current : '';
  if (sel.value !== current) { state.topic = ''; state.origin = null; }
  renderScope();
}
function renderScope() {
  const sc = $('scope');
  if (!state.topic) { sc.hidden = true; sc.replaceChildren(); return; }
  sc.replaceChildren(icon('topic'), el('span', null, el('b', { text: state.topic }), state.origin ? el('span', { class: 'from' }, 'from ', el('button', { type: 'button', text: state.origin.title, onclick: () => { select(state.origin.id, { focusRow: true }); } })) : null),
    el('button', { type: 'button', class: 'clear', 'aria-label': 'Clear topic filter', 'data-tip': 'Clear topic filter', onclick: () => setTopic('') }, icon('close')));
  sc.hidden = false;
  $('blind-note').hidden = state.profile !== 'strict-blind';
}
function setTopic(topic, origin) {
  state.topic = topic; state.origin = topic && origin ? origin : null; $('topic').value = topic;
  reload().then(() => { renderScope(); if (state.origin) scrollRowIntoView(); });
}

// ---------- Docket ----------
function visible() {
  let rows = state.view.slice();
  if (state.event) rows = rows.filter(s => s.eventId === state.event);
  if (state.openOnly) rows = rows.filter(s => summarise(s).open > 0);
  const cmp = { title: (a, b) => a.title.localeCompare(b.title), speaker: (a, b) => (a.speakers[0] || '').localeCompare(b.speakers[0] || '') || a.title.localeCompare(b.title),
    open: (a, b) => summarise(b).open - summarise(a).open || a.title.localeCompare(b.title), checked: (a, b) => summarise(b).latest.localeCompare(summarise(a).latest) || a.title.localeCompare(b.title) }[state.sort];
  return rows.sort(cmp);
}
function marks(s, compact) {
  const c = summarise(s); const out = [];
  const add = (state, n, tip) => { if (n) out.push(el('span', { class: `mark mark-${state}`, 'data-tip': tip, tabindex: compact ? null : '0' }, icon(state === 'concern' ? 'verified' : state), String(n))); };
  add('concern', c.concern, `${plural(c.concern, 'verified major finding')}: checked against sources`);
  add('verified', c.verified, `${plural(c.verified, 'verified finding')}: checked against sources`);
  add('approved', c.approved, `${plural(c.approved, 'approved finding')}: model-proposed, approved by a reviewer`);
  add('contested', c.contested, `${plural(c.contested, 'contested finding')}: a reviewer disagreed`);
  add('proposed', c.proposed, `${plural(c.proposed, 'proposed finding')}: model-suggested, not yet verified`);
  add('legacy', c.legacy, `${plural(c.legacy, 'legacy finding')}: imported from the old pilot, unverified`);
  add('measured', c.measured, `${plural(c.measured, 'measurement')} (for example abstract length)`);
  add('detector', c.detector, `${plural(c.detector, 'cached detector result')}, separate from quality`);
  add('dismissed', c.dismissed, `${plural(c.dismissed, 'dismissed finding')}`);
  return out;
}
function renderDocket() {
  const rows = visible(); const list = $('list');
  const total = state.all.length;
  $('count').replaceChildren(el('strong', { text: rows.length === total ? plural(total, 'proposal') : `${rows.length} of ${plural(total, 'proposal')}` }),
    state.q || state.topic || state.openOnly || state.event ? ' match' : '', ' · ', { title: 'by title', speaker: 'by speaker', open: 'open findings first', checked: 'recently checked first' }[state.sort]);
  $('blind-note').hidden = state.profile !== 'strict-blind';
  if (!rows.length) {
    list.replaceChildren(el('li', { class: 'list-empty' }, 'No proposals match this search, topic or filter. ',
      el('button', { type: 'button', class: 'quiet', text: 'Clear filters', onclick: () => { $('search').value = ''; state.q = ''; state.openOnly = false; $('openonly').checked = false; state.event = ''; $('event').value = ''; setTopic(''); } })));
    return;
  }
  list.replaceChildren(...rows.map(s => {
    const c = summarise(s);
    const b = el('button', { type: 'button', class: 'row', 'aria-current': s.id === state.selected ? 'true' : null, dataset: { id: s.id },
      'aria-label': `${s.title}. ${s.speakers.join(', ')}. ${c.open ? plural(c.open, 'open finding') : 'no open findings'}${c.dismissed ? `, ${c.dismissed} dismissed` : ''}${s.withdrawn ? ', withdrawn' : ''}`,
      onclick: () => select(s.id, { focusRow: true }) },
      el('span', { class: 'row-title', text: s.title }),
      el('span', { class: 'row-sub' }, formatTag(s), events().length > 1 && !state.event ? el('span', { class: 'event-tag', text: eventName(s.eventId), 'data-tip': 'Sessionize event ID' }) : null, el('span', { class: 'speakers', text: s.speakers.join(', ') })),
      s.topics.length ? el('span', { class: 'row-topics', 'aria-label': `Topics: ${s.topics.map(topicLabel).join(', ')}` }, ...s.topics.slice(0, 3).map(t => el('span', { class: `chip ${hueFor(topicLabel(t))}${topicInferred(t) ? ' inferred' : ''}`, text: topicLabel(t) })), s.topics.length > 3 ? el('span', { class: 'more', text: `+${s.topics.length - 3}` }) : null) : null,
      el('span', { class: 'row-marks' }, el('span', { class: 'marks' }, marks(s, true)), s.withdrawn ? el('span', { class: 'mark-withdrawn', text: 'Withdrawn' }) : null));
    return el('li', null, b);
  }));
}
function scrollRowIntoView() { const row = $('list').querySelector('[aria-current="true"]'); if (row) row.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' }); }

// ---------- Selection ----------
async function select(id, { focusRow = false, focusReading = false } = {}) {
  if (!state.all.some(s => s.id === id)) return;
  const changed = id !== state.selected; state.selected = id;
  for (const row of $('list').querySelectorAll('.row')) { if (row.dataset.id === id) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current'); }
  const selected = state.all.find(s => s.id === id);
  const url = new URL(location.href); url.searchParams.set('session', selected.sourceId); url.searchParams.set('event', selected.eventId); history.replaceState(null, '', url);
  if (changed) { state.openForm = null; if (state.compare === id) closeCompare(false); }
  scrollRowIntoView();
  await renderReading({ animate: changed });
  const s = current(); if (s) $('announce').textContent = `${s.title}. ${plural(summarise(s).open, 'open finding')}.`;
  if (focusRow) { const row = $('list').querySelector('[aria-current="true"]'); if (row && document.activeElement !== row && !$('reading').contains(document.activeElement)) row.focus({ preventScroll: true }); }
  if (focusReading) $('reading').focus({ preventScroll: true });
}
const current = () => state.all.find(s => s.id === state.selected);
function step(delta) {
  const rows = visible(); if (!rows.length) return;
  const i = rows.findIndex(s => s.id === state.selected);
  const next = rows[Math.min(rows.length - 1, Math.max(0, (i < 0 ? 0 : i + delta)))];
  if (next && next.id !== state.selected) select(next.id, { focusRow: $('list').contains(document.activeElement) });
}

// ---------- Reading column ----------
let renderSeq = 0;
async function renderReading({ keepScroll = false, animate = false } = {}) {
  const inner = $('reading-inner'), reading = $('reading'); const s = current();
  const top = reading.scrollTop; const mine = ++renderSeq;
  if (mine !== renderSeq) return;
  inner.replaceChildren(...(s ? proposalView(s) : [emptyReading()]));
  if (animate && !reduced.matches) { inner.classList.add('is-enter-start'); void inner.offsetWidth; inner.classList.remove('is-enter-start'); }
  reading.scrollTop = keepScroll ? top : 0;
}
function emptyReading() {
  return el('div', { class: 'empty' }, state.all.length ? 'Select a proposal from the docket to read it.' : 'Nothing has been imported into this workspace yet. Run an import from the CLI, then reload.');
}
function proposalView(s) {
  const rows = visible(); const i = rows.findIndex(x => x.id === s.id); const prev = rows[i - 1], next = rows[i + 1];
  const nav = el('nav', { class: 'nav-strip', 'aria-label': 'Proposal order' },
    el('button', { type: 'button', class: 'ghost', disabled: !prev, 'aria-label': prev ? `Previous: ${prev.title}` : 'No previous proposal', 'data-tip': prev ? `Previous (k): ${prev.title}` : null, onclick: () => prev && select(prev.id) }, icon('prev'), 'Previous'),
    el('span', { class: 'pos', text: i >= 0 ? `${i + 1} of ${rows.length}` : 'not in the current list' }),
    el('button', { type: 'button', class: 'ghost', disabled: !next, 'aria-label': next ? `Next: ${next.title}` : 'No next proposal', 'data-tip': next ? `Next (j): ${next.title}` : null, onclick: () => next && select(next.id) }, 'Next', icon('next')),
    next ? el('span', { class: 'next-title', text: `Next: ${next.title}` }) : null);
  const words = s.abstract.trim().split(/\s+/).filter(Boolean).length;
  const speakerDetails = speakerPanel(s);
  const speakerNames = el('span',{class:'speakers'},...s.speakers.flatMap((name,i)=>[i ? ', ' : null,el('button',{type:'button',class:'speaker-link','aria-controls':'speaker-details','aria-expanded':'false',text:name,'data-tip':'Show biography, research and other submissions',onclick:e=>{speakerDetails.hidden=!speakerDetails.hidden;e.currentTarget.closest('.speakers').querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded',String(!speakerDetails.hidden)));}})]));
  const meta = el('p', { class: 'meta' }, speakerNames,
    ...s.track.flatMap(x => [el('span', { class: 'sep', text: '·', 'aria-hidden': 'true' }), el('span', { text: x })]),
    formatTag(s, true) ? [el('span', { class: 'sep', text: '·', 'aria-hidden': 'true' }), formatTag(s, true)] : null,
    el('span', { class: 'sep', text: '·', 'aria-hidden': 'true' }), el('span', { class: 'words', text: plural(words, 'word') }),
    s.withdrawn ? [el('span', { class: 'sep', text: '·', 'aria-hidden': 'true' }), el('span', { class: 'mark-withdrawn', text: 'Withdrawn', 'data-tip': 'Withdrawn by the submitter. Findings are kept for the record.' })] : null);
  const topicItems=reviewTopics(s);
  const topics = el('div', {class:'topics',role:'group','aria-label':'Topics'}, ...topicItems.map(t=>el('button',{type:'button',class:`chip ${hueFor(t.name)}${t.inferred?' inferred':''}${state.topic===t.name?' is-active':''}`,'aria-pressed':String(state.topic===t.name),
    'data-tip':`${t.proposed?'Proposed inferred topic':t.inferred?'Approved inferred topic':'Submitted tag'}. Show similar proposals.${t.quote ? ` Evidence: “${t.quote}”` : ''}`,
    onclick:()=>setTopic(state.topic===t.name?'':t.name,{id:s.id,title:s.title})},t.name,t.inferred ? el('span',{class:'topic-origin',text:t.proposed?' · inferred, proposed':' · inferred'}) : null)));
  const an = s.analysis; let pendingTopics = null;
  if (!READER && an?.topics?.length && an.topicsApproved !== true && an.topicsApproved !== false) {
    const decideTopics = async (approved, btn) => { btn.disabled = true; try { await api('/api/analysis/topics', { method: 'POST', body: JSON.stringify({ versionId: s.versionId, approved }) }); await load({ keepScroll: true }); $('announce').textContent = approved ? 'Topics approved.' : 'Proposed topics rejected.'; } catch (ex) { btn.disabled = false; banner(ex.message); } };
    pendingTopics = el('div', { class: 'pending-topics' }, el('span', { class: 'pt-label', text: `Proposed by the model${an.model ? ` (${an.model})` : ''}:` }),

      el('button', { type: 'button', class: 'ghost', text: 'Approve topics', onclick: e => decideTopics(true, e.currentTarget) }), el('button', { type: 'button', class: 'ghost', text: 'Reject', onclick: e => decideTopics(false, e.currentTarget) }));
  }

  const findings = sortedFindings(s);
  const spans = findings.filter(d => d.f.quote && !d.detector);
  const abstract = s.abstractOmitted ? el('p', { class: 'abstract muted', text: 'The abstract is not included in this published copy. Read it on Sessionize.' }) : el('div', { class: 'abstract', lang: 'en' }, ...abstractParagraphs(s.abstract, spans));

  const open = findings.filter(d => !d.dismissed && !d.detector), dismissed = findings.filter(d => d.dismissed), detectors = findings.filter(d => d.detector && !d.dismissed);
  const legacy = findings.some(d => d.state === 'legacy');
  const allExpanded = findings.length && findings.every(d => state.expanded.has(d.f.id));
  const head = el('div', { class: 'section-head' }, el('h2', { text: 'Findings' }),
    el('span', { class: 'pill' + (open.length ? '' : ' none'), text: open.length ? `${open.length} open` : 'none open' }),
    el('span', { class: 'sum', text: [dismissed.length ? `${dismissed.length} dismissed` : '', detectors.length ? `${plural(detectors.length, 'detector signal')}` : '', findings.length ? '' : 'none recorded'].filter(Boolean).join(' · ') }),
    findings.length ? el('span', { class: 'tools' }, el('button', { type: 'button', class: 'ghost', 'data-tip': 'Expand or collapse all evidence (e)', onclick: () => toggleAll(), text: allExpanded ? 'Collapse all' : 'Expand all' })) : null);
  const body = [];
  if (legacy) body.push(el('p', { class: 'notice', text: 'Legacy / unverified findings were imported from the earlier pilot and have not been re-checked by this workspace.' }));
  if (!READER && !s.analysis) body.push(el('p', {class:'muted',text:'Editorial analysis and speaker research have not completed for this version.'}));
  if (!findings.length) body.push(el('p', { class: 'empty', text: 'No findings recorded for this version of the abstract. This does not indicate that the proposal has passed checks; inspect analysis coverage before drawing conclusions.' }));
  body.push(...open.map(d => findingView(d, s)));
  if (detectors.length) body.push(el('h3', { class: 'subhead', text: 'Detector signal' }), el('p', { class: 'detector-note', text: 'Kept separate from editorial quality. A detector result is not an authorship probability and not evidence about the talk.' }), ...detectors.map(d => findingView(d, s)));
  if (dismissed.length) body.push(el('h3', { class: 'subhead', text: `Dismissed (${dismissed.length})` }), ...dismissed.map(d => findingView(d, s)));

  return [nav, el('div', { class: 'sheet' }, el('header', null, el('h1', { id: 'reading-title', text: s.title }), meta, speakerDetails, topics, pendingTopics, !READER && !an ? el('p',{class:'muted topic-coverage',text:'Inferred topics have not been generated for this proposal.'}) : null), el('h2', { class: 'vh', id: 'h-abstract', text: 'Abstract' }), abstract),
    el('section', { class: 'section', 'aria-label': 'Findings' }, head, ...body),
    researchSection(s), relatedSection(s)].filter(node => node != null);
}
function researchSection(s) {
  if (READER || !s.analysis) return null;
  const a = s.analysis, evidence = a.evidence || [], claims = a.claimChecks || [], people = a.speakerAssessments || [];
  const status = { direct: 'Direct topic experience', adjacent: 'Adjacent experience', 'self-reported-only': 'Self-reported only', 'insufficient-evidence': 'Insufficient public evidence', supported: 'Supported by supplied evidence', contradicted: 'Possible contradiction', 'needs-context': 'Needs context', 'not-verifiable': 'Not verified' };
  const links = sources => el('ul', {class:'research-links'}, ...(sources || []).map(x => el('li', null, el('a', {href:x.url,target:'_blank',rel:'noopener noreferrer',text:x.title || host(x.url)}))));
  const body = el('div', {class:'research-body'}, el('p', {class:'muted',text:`Model assessment by ${a.model || 'the configured model'} · ${fmtDateTime(a.createdAt)}. These assessments have not been human-approved.`}));
  if (a.validationReview) body.append(el('p', {class:'muted',text:`Drafts reviewed by ${a.validationReview.model} · ${fmtDateTime(a.validationReview.checkedAt)}. Committee approval is still required.`}));
  if (people.length) body.append(el('h3', {text:'Speaker experience'}), ...people.map(p => el('article', {class:'research-item'}, el('h4', {text:p.name}), el('p', {class:'research-verdict',text:status[p.expertise] || p.expertise}), el('p', {text:p.reason}), links(p.sources))));
  if (claims.length) body.append(el('h3', {text:'Claims checked'}), ...claims.map(c => el('article', {class:'research-item'}, el('blockquote', {text:c.quote}), c.quoteSource?.field === 'speaker-bio' ? el('p', {class:'muted',text:`From ${c.quoteSource.speaker}'s submitted bio`}) : c.quoteSource?.field === 'topic-experience' ? el('p', {class:'muted',text:'From the submitted topic-experience note'}) : null, el('p', {class:'research-verdict',text:status[c.verdict] || c.verdict}), el('p', {text:c.reason}), links(c.sources))));
  const pages = evidence.filter(x => x.kind === 'source-page').length, failed = evidence.filter(x => x.fetchFailed).length;
  body.append(el('h3', {text:'Coverage and limits'}), el('p', {text:pages ? `${pages} public source pages captured${failed ? `; ${failed} could not be retrieved` : ''}. Sources were selected for this check; this is not an exhaustive background search.` : 'No public source pages were captured. Submitted bios and search leads do not independently establish expertise or factual accuracy.'}), el('ul', null, ...(a.coverage?.limitations || []).map(x => el('li', {text:x}))));
  if (evidence.length) body.append(el('details', {class:'research-sources'}, el('summary', {text:'Inspect captured sources'}), ...evidence.map(x => el('article', {class:'research-item'}, el('a', {href:x.url,target:'_blank',rel:'noopener noreferrer',text:x.title || x.url}), el('p', {class:'muted',text:`${x.fetchFailed ? 'Retrieval failed' : x.kind === 'source-page' ? 'Captured page' : 'Search lead'}${x.fetchedAt ? ` · ${fmtDateTime(x.fetchedAt)}` : ''}`}), x.excerpt ? el('blockquote', {text:x.excerpt}) : null))));
  return el('section', {class:'section research', 'aria-label':'Speaker research and claim checks'}, el('details', null, el('summary', {text:`Speaker research and claim checks (${people.length} ${people.length === 1 ? 'speaker' : 'speakers'}, ${claims.length} ${claims.length === 1 ? 'claim' : 'claims'})`}), body));
}
function abstractParagraphs(text, spans) {
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (!paras.length) return [el('p', { class: 'muted', text: 'No abstract was supplied.' })];
  return paras.map(p => {
    const hits = spans.map(d => ({ d, at: p.indexOf(d.f.quote) })).filter(h => h.at >= 0).sort((a, b) => a.at - b.at);
    const out = el('p'); let pos = 0;
    for (const h of hits) {
      if (h.at < pos) continue;
      out.append(p.slice(pos, h.at));
      const cls = 'span' + (h.d.state === 'concern' || h.d.state === 'verified' ? ' verified' : '') + (h.d.dismissed ? ' dismissed' : '');
      out.append(el('mark', { class: cls, id: `span-${h.d.f.id}`, 'data-tip': `${state.labels[h.d.f.label] || h.d.f.label} · ${h.d.stateInfo.label}. Click to open the finding.`, tabindex: '0', role: 'button',
        onclick: () => revealFinding(h.d.f.id), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealFinding(h.d.f.id); } } }, h.d.f.quote));
      pos = h.at + h.d.f.quote.length;
    }
    out.append(p.slice(pos));
    return out;
  });
}
function revealFinding(id) {
  const node = document.getElementById('f-' + id); if (!node) return;
  state.expanded.add(id); node.querySelector('.evidence')?.setAttribute('data-open', 'true'); node.querySelector('[data-evidence-toggle]')?.setAttribute('aria-expanded', 'true');
  node.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' });
  node.querySelector('h3')?.focus();
}
function flashSpan(id) {
  const m = document.getElementById('span-' + id); if (!m) return;
  m.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' });
  m.classList.add('is-flash'); setTimeout(() => m.classList.remove('is-flash'), 1600); m.focus({ preventScroll: true });
}
function toggleAll() {
  const s = current(); if (!s) return;
  const ids = s.findings.map(f => f.id); const all = ids.every(id => state.expanded.has(id));
  for (const id of ids) all ? state.expanded.delete(id) : state.expanded.add(id);
  for (const id of ids) { const node = document.getElementById('f-' + id); node?.querySelector('.evidence')?.setAttribute('data-open', all ? 'false' : 'true'); node?.querySelector('[data-evidence-toggle]')?.setAttribute('aria-expanded', all ? 'false' : 'true'); }
  const btn = $('reading').querySelector('.section-head .tools .ghost'); if (btn) btn.textContent = all ? 'Expand all' : 'Collapse all';
}

function stateBadge(d) {
  return el('span', { class: `badge badge-${d.state}`, 'data-tip': d.stateInfo.tip + (d.f.strength ? ` Evidence strength recorded as “${d.f.strength}”.` : ''), tabindex: '0', text: d.stateInfo.label });
}
function findingView(d, s) {
  const f = d.f; const label = state.labels[f.label] || f.label; const id = 'f-' + f.id;
  const expanded = state.expanded.has(f.id);
  const meta = el('span', { class: 'finding-meta' },
    el('span', { 'data-tip': `Origin: ${f.origin} (${d.kindLabel}). Inputs: ${(f.inputClasses || []).join(', ') || 'not recorded'}.`, tabindex: '0', text: d.provenance }),
    el('span', { class: 'dot', text: '·', 'aria-hidden': 'true' }),
    d.checked ? el('span', { 'data-tip': `Checked ${fmtDateTime(d.checked)}${f.verifier ? ` by ${f.verifier}` : ''}`, tabindex: '0', text: `checked ${fmtRel(d.checked)}` })
      : el('span', { 'data-tip': 'No check date was recorded for this finding.', tabindex: '0', text: 'check date not recorded' }));
  const head = el('div', { class: 'finding-head' },
    el('span', { class: `state state-${d.state}`, 'aria-hidden': 'true' }, icon(d.state === 'concern' ? 'verified' : d.state)),
    el('h3', { tabindex: '-1', text: label }),
    stateBadge(d),
    d.severity ? el('span', { class: 'badge badge-severity', 'data-tip': { major: 'Major: would change how the committee reads this proposal if confirmed.', minor: 'Minor: worth a look; unlikely to change the outcome alone.', info: 'Informational: context, not a concern.' }[d.severity], tabindex: '0', text: d.severity }) : null,
    d.reviewerDerived ? el('span', { class: 'badge', 'data-tip': 'This finding used reviewer-derived input (comments, votes or outcomes). Hidden in the strict-blind view.', tabindex: '0', text: 'uses reviewer input' }) : null);
  const reason = el('p', { class: 'reason', text: f.reason });
  const cite = f.quote && !d.detector ? el('p', { class: 'cite' }, el('q', { text: f.quote.length > 180 ? f.quote.slice(0, 177).trimEnd() + '…' : f.quote }), el('button', { type: 'button', text: 'Show in abstract', onclick: () => flashSpan(f.id) })) : null;
  const disposition = d.dismissed ? el('p', { class: 'disposition' }, el('b', { text: 'Dismissed' }), f.note ? `: ${f.note}` : ': no reason recorded', ' · Hidden from injected badges.') : (f.note ? el('p', { class: 'disposition' }, el('b', { text: 'Note' }), `: ${f.note}`) : null);
  const contest = f.status === 'contested' && !d.dismissed ? el('p', { class: 'disposition' }, el('b', { text: 'Contested' }), f.contestedBy ? ` by ${f.contestedBy}` : '', f.contestNote ? `: ${f.contestNote}` : '') : null;
  const verifyLine = d.verification && !d.dismissed ? el('p', { class: 'disposition' }, el('b', { text: d.verification.verdict === 'not-verified' ? 'Not checked by a verifier model' : `Verifier model: ${d.verification.verdict}` }), d.verification.reason ? `. ${d.verification.reason}` : '', d.verification.model ? ` (${d.verification.model})` : '', ' Model agreement is not confirmation; a reviewer decides.') : null;
  const gate = d.identityGate && !d.dismissed ? el('p', { class: 'warn', text: f.identityConfirmed ? 'Identity confirmed; awaiting human approval before this appears as a badge on Sessionize.' : 'Speaker identity is not confirmed. Not shown as a badge until identity is confirmed and a human approves.' }) : null;

  // Evidence panel
  const kv = el('p', { class: 'record' }, el('b', { text: d.kindLabel[0].toUpperCase() + d.kindLabel.slice(1) }), ` · strength recorded as “${f.strength || 'not recorded'}”`,
    d.checked ? ` · checked ${fmtDateTime(d.checked)}${f.verifier ? ` by ${f.verifier}` : ''}` : ' · no check date recorded',
    ` · inputs: ${(f.inputClasses || []).join(', ') || 'not recorded'}`,
    ` · coverage: ${d.coverage || (f.kind === 'speaker' ? 'not recorded, assume the search was partial' : 'not recorded')}.`);
  const sources = (f.sources || []);
  const srcList = sources.length ? el('ul', { class: 'sources', 'aria-label': 'Sources' }, ...sources.map(src => el('li', { class: 'source' },
    el('a', { href: src.url, target: '_blank', rel: 'noreferrer noopener', text: src.title || src.url }), el('span', { class: 'host', text: host(src.url) }), src.date ? el('span', { class: 'date', text: fmtDate(src.date) }) : null,
    src.excerpt ? el('blockquote', { text: src.excerpt }) : null))) : el('p', { class: 'no-sources', text: d.state === 'legacy' ? 'No sources were carried over from the legacy import.' : 'No sources attached. The reason above is the whole record.' });
  const form = el('div', { class: 'correction-slot' });
  const evidence = el('div', { class: 'evidence', 'data-open': expanded ? 'true' : 'false', id: id + '-ev' }, el('div', { class: 'evidence-inner' }, el('div', { class: 'evidence-body' }, kv, srcList)));
  const toggle = el('button', { type: 'button', class: 'ghost', 'aria-expanded': expanded ? 'true' : 'false', 'aria-controls': id + '-ev', dataset: { evidenceToggle: '1' },
    onclick: () => { const open = evidence.dataset.open !== 'true'; evidence.dataset.open = open ? 'true' : 'false'; toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); open ? state.expanded.add(f.id) : state.expanded.delete(f.id); } },
    `Evidence${sources.length ? ` (${plural(sources.length, 'source')})` : ''}`, el('span', { class: 'chev' }, icon('chevron')));
  const actions = el('div', { class: 'finding-actions' }, toggle);
  actions.append(meta);
  if (!READER && d.model && !d.dismissed) {
    const idBox = f.kind === 'speaker' ? el('label', { class: 'check', 'data-tip': 'Required for speaker findings: you checked that the public evidence is about this speaker, not a namesake.' }, el('input', { type: 'checkbox', id: `idc-${f.id}`, checked: f.identityConfirmed ? true : null }), 'identity confirmed') : null;
    const decide = async (approved, btn) => {
      btn.disabled = true;
      try { await api('/api/analysis/approve', { method: 'POST', body: JSON.stringify({ id: f.id, approved, identityConfirmed: idBox ? idBox.querySelector('input').checked : false }) }); await load({ keepScroll: true }); $('announce').textContent = `${approved ? 'Approved' : 'Rejected'}: ${state.labels[f.label] || f.label}.`; document.getElementById('f-' + f.id)?.querySelector('h3')?.focus({ preventScroll: true }); }
      catch (ex) { btn.disabled = false; banner(ex.message); }
    };
    if (idBox) meta.before(idBox);
    if (f.humanApproved !== true) { const ap = el('button', { type: 'button', class: 'ghost', text: 'Approve', disabled: idBox && !f.identityConfirmed ? true : null, 'data-tip': idBox ? 'Tick “identity confirmed” first: speaker findings need a confirmed identity before approval' : 'Accept this model-proposed finding after checking it', onclick: e => decide(true, e.currentTarget) }); meta.before(ap); if (idBox) idBox.querySelector('input').addEventListener('change', e => { ap.disabled = !e.target.checked; ap.dataset.tip = e.target.checked ? 'Accept this model-proposed finding after checking it' : 'Tick “identity confirmed” first: speaker findings need a confirmed identity before approval'; }); }
    meta.before(el('button', { type: 'button', class: 'ghost', text: f.humanApproved === true ? 'Withdraw approval' : 'Reject', 'data-tip': f.humanApproved === true ? 'Return this finding to proposed' : 'Keep it out of badges and published copies (it stays visible here)', onclick: e => decide(false, e.currentTarget) }));
  }
  if (READER) meta.before(el('span', { class: 'muted', text: 'Published copy · corrections happen in the local workspace' }));
  else if (d.dismissed) meta.before(el('button', { type: 'button', class: 'ghost', text: 'Restore', 'data-tip': 'Reopen this finding. The recorded reason is kept.', onclick: e => submitDisposition(f, 'open', f.note || '', e.currentTarget, node) }));
  else {
    meta.before(el('button', { type: 'button', class: 'ghost', text: 'Dismiss…', 'data-tip': 'Dismiss with a reason (d)', onclick: () => openForm(f, 'dismissed', form, node) }));
    meta.before(el('button', { type: 'button', class: 'ghost', text: f.note ? 'Edit note' : 'Add note', 'data-tip': 'Keep the finding open and record a correction or context', onclick: () => openForm(f, 'open', form, node) }));
  }
  const node = el('article', { class: 'finding' + (d.dismissed ? ' is-dismissed' : ''), id, 'aria-labelledby': id + '-h', dataset: { finding: f.id } }, head, reason, cite, verifyLine, contest, gate, disposition, actions, form, evidence);
  head.querySelector('h3').id = id + '-h';
  if (state.openForm?.id === f.id) openForm(f, state.openForm.status, form, node, state.openForm.value, false);
  return node;
}
function openForm(f, status, slot, node, value, focus = true) {
  slot.replaceChildren();
  const ta = el('textarea', { id: `note-${f.id}`, maxlength: '4000', placeholder: status === 'dismissed' ? 'Why this finding does not apply (kept with the finding, survives reruns)' : 'Context or correction for other reviewers', 'aria-describedby': `note-${f.id}-err` });
  ta.value = value ?? f.note ?? '';
  const err = el('p', { class: 'field-error', id: `note-${f.id}-err`, hidden: true });
  const submit = el('button', { type: 'submit', class: 'quiet', text: status === 'dismissed' ? 'Dismiss finding' : 'Save note' });
  const cancel = el('button', { type: 'button', class: 'ghost', text: 'Cancel', onclick: () => { state.openForm = null; slot.replaceChildren(); node.querySelector('.finding-actions .ghost:nth-child(2)')?.focus(); } });
  const form = el('form', { class: 'correction', onsubmit: async e => {
    e.preventDefault(); err.hidden = true; ta.classList.remove('is-error');
    if (status === 'dismissed' && !ta.value.trim()) { err.textContent = 'Give a reason so the dismissal is explainable later.'; err.hidden = false; ta.classList.add('is-error'); shake(ta); ta.focus(); return; }
    await submitDisposition(f, status, ta.value.trim(), submit, node, err, ta);
  } }, el('label', { for: `note-${f.id}`, text: status === 'dismissed' ? 'Reason for dismissing' : 'Note' }), ta, el('div', { class: 'btns' }, submit, cancel, err));
  ta.addEventListener('input', () => { state.openForm = { id: f.id, status, value: ta.value }; });
  ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); cancel.click(); } if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') form.requestSubmit(); });
  state.openForm = { id: f.id, status, value: ta.value };
  slot.append(form);
  if (focus) ta.focus();
}
async function submitDisposition(f, status, note, btn, node, err, ta) {
  btn.disabled = true; btn.classList.add('is-busy');
  try {
    await api('/api/disposition', { method: 'POST', body: JSON.stringify({ id: f.id, status, note }) });
    state.openForm = null;
    await load({ keepScroll: true });
    const fresh = document.getElementById('f-' + f.id);
    (fresh?.querySelector('.finding-actions .ghost:nth-child(2)') || fresh?.querySelector('h3') || $('reading')).focus({ preventScroll: true });
    fresh?.scrollIntoView({ block: 'nearest' });
    $('announce').textContent = status === 'dismissed' ? `Dismissed: ${state.labels[f.label] || f.label}.` : `Saved: ${state.labels[f.label] || f.label}.`;
  } catch (ex) {
    if (ex.status === 401) return lock('Your session was rejected by the local server. Unlock again to continue.');
    btn.disabled = false; btn.classList.remove('is-busy');
    if (err) { err.textContent = ex.message; err.hidden = false; if (ta) { ta.classList.add('is-error'); shake(ta); } }
    else banner(ex.message);
  }
}

// ---------- Related & compare ----------
function related(s) {
  const mine = new Set(s.topics.map(topicLabel)); const speakers = new Set(s.speakers);
  return state.all.filter(o => o.id !== s.id && o.eventId === s.eventId).map(o => {
    const shared = o.topics.map(topicLabel).filter(t => mine.has(t)); const same = o.speakers.filter(x => speakers.has(x));
    return { o, shared, same, score: shared.length + same.length * 2 };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.o.title.localeCompare(b.o.title)).slice(0, 6);
}
function relatedSection(s) {
  const rel = related(s);
  return el('section', { class: 'section', 'aria-labelledby': 'h-related' },
    el('div', { class: 'section-head' }, el('h2', { id: 'h-related', text: 'Related proposals' }), el('span', { class: 'sum', text: rel.length ? 'by shared topics or speaker, within this import' : 'none share a topic or speaker in this import' })),
    rel.length ? el('ul', { class: 'related' }, ...rel.map(r => el('li', null,
      el('span', { class: 'rtitle' }, el('button', { type: 'button', text: r.o.title, 'data-tip': 'Open this proposal', onclick: () => select(r.o.id, { focusRow: true }) })),
      el('span', { class: 'rwhy' }, formatTag(r.o), ' ', [r.same.length ? `same speaker: ${r.same.join(', ')}` : '', r.shared.length ? `shares ${r.shared.join(', ')}` : ''].filter(Boolean).join(' · ') + (summarise(r.o).open ? ` · ${plural(summarise(r.o).open, 'open finding')}` : '')),
      el('span', { class: 'ract' }, el('button', { type: 'button', class: 'ghost', 'data-tip': 'Compare side by side (c)', 'aria-label': `Compare with ${r.o.title}`, onclick: e => openCompare(r.o.id, e.currentTarget) }, icon('compare'), 'Compare'))))) : null);
}
function openCompare(id, opener) {
  state.compare = id; state.compareOpener = opener || null;
  $('workspace').classList.add('has-compare'); $('compare').hidden = false;
  renderCompare({ animate: true });
}
function closeCompare(restoreFocus = true) {
  state.compare = null; const inner = $('compare-inner');
  inner.dataset.open = 'false';
  const done = () => { $('compare').hidden = true; $('workspace').classList.remove('has-compare'); inner.replaceChildren(); };
  reduced.matches ? done() : setTimeout(done, 350);
  if (restoreFocus) (state.compareOpener?.isConnected ? state.compareOpener : $('reading')).focus();
  state.compareOpener = null;
}
function renderCompare({ animate }) {
  const o = state.all.find(s => s.id === state.compare); const inner = $('compare-inner'); const s = current();
  if (!o) return closeCompare(false);
  $('compare').setAttribute('aria-label', `Comparison with ${o.title}`);
  const shared = s ? o.topics.map(topicLabel).filter(t => s.topics.map(topicLabel).includes(t)) : [];
  const findings = sortedFindings(o).filter(d => !d.dismissed);
  inner.replaceChildren(
    el('div', { class: 'compare-head' }, el('h2', { id: 'compare-title', tabindex: '-1', text: o.title }),
      el('span', { class: 'tools' }, el('button', { type: 'button', class: 'ghost', 'data-tip': 'Open this proposal instead', onclick: () => { select(o.id, { focusRow: true }); closeCompare(false); } }, icon('pin'), 'Open'),
        el('button', { type: 'button', class: 'ghost', 'aria-label': 'Close comparison', 'data-tip': 'Close (Esc)', onclick: () => closeCompare() }, icon('close')))),
    el('p', { class: 'meta' }, el('span', { class: 'speakers', text: o.speakers.join(', ') }), ...o.track.flatMap(x => [el('span', { class: 'sep', text: '·', 'aria-hidden': 'true' }), el('span', { text: x })]), formatTag(o) ? [el('span', { class: 'sep', text: '·', 'aria-hidden': 'true' }), formatTag(o)] : null, o.withdrawn ? [el('span', { class: 'sep', text: '·' }), el('span', { class: 'mark-withdrawn', text: 'Withdrawn' })] : null),
    el('p', { class: 'shared', text: shared.length ? `Shared topics: ${shared.join(', ')}` : (s && o.speakers.some(x => s.speakers.includes(x)) ? 'Same speaker' : 'No shared topics') }),
    el('div', { class: 'sheet' }, el('h3', { class: 'vh', text: 'Abstract' }), el('div', { class: 'abstract' }, ...abstractParagraphs(o.abstract, []))),
    el('section', { class: 'section' }, el('div', { class: 'section-head' }, el('h2', { text: 'Findings' }), el('span', { class: 'sum', text: findings.length ? plural(findings.length, 'open finding') : 'none open' })),
      findings.length ? el('ul', { class: 'findings-brief' }, ...findings.map(d => el('li', null, el('span', { class: `state state-${d.state}`, 'aria-hidden': 'true' }, icon(d.state === 'concern' ? 'verified' : d.state)), el('span', null, el('b', { text: state.labels[d.f.label] || d.f.label }), ' ', stateBadge(d), ' — ', d.f.reason)))) : el('p', { class: 'empty', text: 'No open findings. Not an endorsement.' })));
  inner.dataset.open = 'false';
  if (animate && !reduced.matches) void inner.offsetWidth; // commit the closed state so the open transition runs
  inner.dataset.open = 'true';
  if (animate) inner.querySelector('#compare-title').focus({ preventScroll: true });
}

// ---------- Tooltips ----------
const tip = $('tip'); let tipFor = null;
function showTip(target) {
  const text = target.dataset.tip; if (!text) return;
  if (tipFor === target && tip.dataset.show === 'true') return;
  tipFor = target; tip.textContent = text; tip.hidden = false;
  target.setAttribute('aria-describedby', 'tip');
  placeTip(target); tip.dataset.show = 'true';
}
function placeTip(target) {
  const r = target.getBoundingClientRect(); tip.style.maxWidth = Math.min(320, innerWidth - 16) + 'px';
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2; x = Math.max(8, Math.min(innerWidth - tw - 8, x));
  let y = r.top - th - 8, place = 'above';
  if (y < 8) { y = r.bottom + 8; place = 'below'; }
  tip.dataset.place = place; tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideTip() {
  if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null; tip.dataset.show = 'false';
  tip.hidden = true;
}
let tipLeave; tip.addEventListener('mouseenter', () => clearTimeout(tipLeave)); tip.addEventListener('mouseleave', hideTip);
document.addEventListener('mouseover', e => { const t = e.target.closest?.('[data-tip]'); if (t) showTip(t); else if (tipFor && !e.target.closest?.('#tip')) hideTip(); });
document.addEventListener('mouseout', e => { if (tipFor && e.target.closest?.('[data-tip]') === tipFor && !tipFor.contains(e.relatedTarget)) { clearTimeout(tipLeave); tipLeave = setTimeout(hideTip, 200); } });
document.addEventListener('focusin', e => { const t = e.target.closest?.('[data-tip]'); if (t) showTip(t); else hideTip(); });
document.addEventListener('focusout', e => { if (tipFor && e.target === tipFor) hideTip(); });
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const t = e.target.closest?.('[data-tip]');
  if (t && !t.matches('button, a, [role="button"]')) { e.preventDefault(); tipFor === t && tip.dataset.show === 'true' ? hideTip() : showTip(t); }
  else if (!e.target.closest?.('#tip')) hideTip();
}, { passive: false });
document.addEventListener('click', e => { if (tipFor && e.target.closest?.('[data-tip]') === tipFor && tipFor.matches('button, a, [role="button"]')) hideTip(); });
addEventListener('scroll', () => { if (tipFor) placeTip(tipFor); }, true);
addEventListener('resize', () => { if (tipFor) placeTip(tipFor); });

// ---------- Sessionize data: sync controls ----------
// Contract announced by Codex on 2026-09-15; the panel shows the real server response until the endpoints exist.
const dataDlg = $('data'); let syncPoll = 0, syncData = null;
// Publication (admin side): target, preview, publish, reader invitations. Contract from Codex, 2026-09-15.
const pub = { target: null, readers: null, preview: null, published: null, invite: null, busy: '', open: false };
// Analysis (bounded model runs) and detector (paid provider) controls: admin only; nothing runs without an explicit click.
const ana = { state: null, det: null, busy: '' };
const observedSyncSuccesses = new Set();
// Accepts a plain numeric event ID or an organiser URL; the ID is read from the pathname only (hashes carry other IDs).
function parseEventId(v) {
  const s = String(v || '').trim();
  if (/^[1-9]\d*$/.test(s)) return s;
  try { const m = new URL(s).pathname.match(/^\/app\/organizer\/(?:sessions|event)\/([1-9]\d*)\/?$/); return m ? m[1] : ''; } catch { return ''; }
}
const CRED_CLI = 'REVIEW_HELPER_DATA=<private data folder> node src/cli.ts sessionize-auth <cookies file>';
const resultText = res => !res ? '' : typeof res === 'string' ? res : (Number.isInteger(res.count) ? `${plural(res.count, 'proposal')} · ${res.changed ?? 0} new/changed version${res.changed === 1 ? '' : 's'}` : Object.entries(res).filter(([k]) => k !== 'snapshot').map(([k, v]) => `${k} ${v}`).join(', '));
// Sessionize API source wizard (contract from Codex, 2026-09-15): check fetches only; save verifies count, fields and confirmations; Sync now imports.
const sourceForm = { eventId: '', eventName: '', url: '', expectedCount: '', requiredFields: [], allStatuses: false, unscheduled: false, allowRemoval: false, open: false };
let sourceResult = null, sourceBusy = false, sourceError = '', syncEvent = '';
function readSourceForm() {
  const g = id => document.getElementById(id);
  if (!g('src-event')) return;
  sourceForm.eventId = parseEventId(g('src-event').value.trim()) || g('src-event').value.trim(); sourceForm.eventName = g('src-name').value.trim(); sourceForm.url = g('src-url').value.trim();
  sourceForm.expectedCount = g('src-count').value.trim(); sourceForm.allStatuses = g('src-all').checked; sourceForm.unscheduled = g('src-unscheduled').checked;
  sourceForm.requiredFields = [...document.querySelectorAll('.src-field:checked')].map(i => i.value);
  sourceForm.allowRemoval = Boolean(g('src-removal')?.checked);
}
function sourcePayload() {
  const n = Number(sourceForm.expectedCount);
  return { eventId: sourceForm.eventId, eventName: sourceForm.eventName, url: sourceForm.url, expectedCount: Number.isInteger(n) && n > 0 ? n : 1, requiredFields: sourceForm.requiredFields, allStatusesConfirmed: sourceForm.allStatuses, unscheduledConfirmed: sourceForm.unscheduled, ...(sourceForm.allowRemoval && (sourceResult?.coverage?.missingExisting || 0) > 0 ? { allowRemovalConfirmed: true } : {}) };
}
// Why saving is not yet allowed; empty means the client-side gate is open (the server verifies again).
function sourceGate(form, result) {
  const reasons = [];
  if (!/^[1-9]\d*$/.test(form.eventId)) reasons.push('event ID');
  if (!form.eventName) reasons.push('event name');
  if (!/^https:\/\/sessionize\.com\/api\/v2\/[A-Za-z0-9]+\/view\/All\/?$/.test(form.url)) reasons.push('API URL ending in /view/All');
  if (!result) reasons.push('a coverage check');
  else {
    const n = Number(form.expectedCount);
    if (!(Number.isInteger(n) && n === result.coverage.count)) reasons.push(`expected count = ${result.coverage.count}`);
    if (result.coverage.missingRequiredFields?.length) reasons.push(`required fields present (missing: ${result.coverage.missingRequiredFields.join(', ')})`);
    if ((result.coverage.missingExisting || 0) > 0 && !form.allowRemoval) reasons.push(`confirmation of the ${result.coverage.missingExisting} known removal${result.coverage.missingExisting === 1 ? '' : 's'}`);
  }
  if (!form.allStatuses) reasons.push('the all-statuses confirmation');
  if (!form.unscheduled) reasons.push('the unscheduled confirmation');
  return reasons;
}
const RUN_STATUS = { queued: 'Queued', running: 'Running', succeeded: 'Succeeded', failed: 'Failed', auth_required: 'Credential needed' };
let adminSection = 'review';
function showSection(section) {
  adminSection = section;
  document.querySelectorAll('[data-section]').forEach(b => { if (b.dataset.section === section) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('workspace').hidden = section !== 'review';
  dataDlg.hidden = section === 'review';
  document.body.dataset.section = section;
  clearTimeout(syncPoll);
  if (section === 'sync') syncEvent = state.event || syncEvent;
  if (section !== 'review') {
    $('data-title').textContent = ({ sync: 'Data & sync', analysis: 'Analysis', publish: 'Publish & access', reader: 'Published copy' })[section];
    dataDlg.querySelector(':scope > .muted').textContent = ({sync: 'Import and refresh your event. Scheduled sync runs while this Mac’s local service is running.', analysis: 'Prepare evidence and review findings before sharing them with the committee.', publish: 'Share an approved, read-only snapshot. Reviewers do not need this Mac to be running.', reader: 'You are viewing a published, read-only snapshot.'})[section];
    if (READER) renderReaderInfo(); else loadSync();
    $('data-title').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'});
  }
}
document.querySelectorAll('[data-section]').forEach(b => b.onclick = () => showSection(b.dataset.section));
$('capture').onclick = () => showSection(READER ? 'reader' : 'sync');
$('data-close').onclick = () => showSection('review');
async function loadSync({ silent = false } = {}) {
  const body = $('data-body');
  if (!silent) body.replaceChildren(el('p', { class: 'muted', text: 'Loading sync status…' }));
  try {
    syncData = await api('/api/sync');
    [pub.target, pub.readers, ana.state, ana.det] = await Promise.all([api('/api/publication').catch(ex => ({ error: ex.message })), api('/api/publication/readers').then(r => r.readers || []).catch(() => null), api('/api/analysis').catch(ex => ({ error: ex.message })), api('/api/detector').catch(ex => ({ error: ex.message }))]);
    const newSuccesses = (syncData.runs || []).filter(r => r.status === 'succeeded' && !observedSyncSuccesses.has(r.id));
    if (newSuccesses.length) {
      await load({ refreshAll: true, keepScroll: true });
      for (const run of newSuccesses) observedSyncSuccesses.add(run.id);
    }
    renderSync({ keepDrafts: silent });
    const active = (syncData.runs || []).some(r => ['queued', 'running'].includes(r.status)) || (ana.state?.jobs || []).some(x => ['queued', 'running'].includes(x.status)) || (ana.det?.jobs || []).some(x => ['queued', 'submitting', 'polling'].includes(x.status));
    if (active && !dataDlg.hidden) { clearTimeout(syncPoll); syncPoll = setTimeout(() => loadSync({ silent: true }), 3000); }
  } catch (ex) {
    if (ex.status === 401) return lock('Your session was rejected by the local server. Unlock again to continue.');
    body.replaceChildren(el('p', { class: 'data-error', text: ex.status === 404 ? 'The local service does not offer Sessionize sync yet (the server answered 404). Import from the command line until the backend ships it.' : ex.message }),
      el('button', { type: 'button', class: 'quiet', text: 'Try again', onclick: () => loadSync() }));
  }
}
function syncError(node, message) { node.replaceChildren(el('p', { class: 'data-error', text: message })); }
function sourceSection(sources, err) {
  const out = [];
  if (!sourceForm.open) return out;
  const r = sourceResult; const cov = r?.coverage;
  const field = (id, label, attrs) => el('label', { class: 'src-label', for: id }, el('span', { text: label }), el('input', { id, ...attrs }));
  const fields = el('div', { class: 'src-grid' },
    field('src-event', 'Sessionize organiser URL', { type: 'text', value: /^\d+$/.test(sourceForm.eventId) ? `https://sessionize.com/app/organizer/sessions/${sourceForm.eventId}` : sourceForm.eventId, autocomplete: 'off', placeholder: 'https://sessionize.com/app/organizer/sessions/24237' }),
    field('src-name', 'Event name', { type: 'text', value: sourceForm.eventName, autocomplete: 'off', placeholder: 'As reviewers should see it' }),
    field('src-url', 'Sessionize API URL (kept private, never shown again)', { type: 'password', value: sourceForm.url, autocomplete: 'off', spellcheck: 'false', placeholder: 'https://sessionize.com/api/v2/<endpoint>/view/All' }),
    field('src-count', 'Submission count to verify', { type: 'number', min: '1', step: '1', value: sourceForm.expectedCount, placeholder: 'Leave empty for the first check' }));
  const known = cov?.availableFields || [];
  const req = el('fieldset', { class: 'src-fields' }, el('legend', { text: known.length ? 'Custom fields the import must include' : 'Custom fields: run a check to list what the endpoint offers' }),
    ...known.map((f, i) => el('label', { class: 'check' }, el('input', { type: 'checkbox', class: 'src-field', id: `src-field-${i}`, value: f, checked: sourceForm.requiredFields.includes(f) ? true : null }), f)),
    ...sourceForm.requiredFields.filter(f => !known.includes(f)).map((f, i) => el('label', { class: 'check' }, el('input', { type: 'checkbox', class: 'src-field', id: `src-field-x${i}`, value: f, checked: true }), `${f} (not in the last check)`)));
  const confirms = el('div', { class: 'src-confirm' },
    el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'src-all', checked: sourceForm.allStatuses ? true : null }), 'The endpoint is set to Sessions = All with no category filters, so every status is included.'),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'src-unscheduled', checked: sourceForm.unscheduled ? true : null }), 'Unscheduled sessions are included.'));
  const matches = cov && Number(sourceForm.expectedCount) === cov.count;
  const coverage = cov ? el('div', { class: 'coverage' },
    el('p', { class: 'cov-line' }, el('b', { text: plural(cov.count, 'submission') }), matches ? ' · matches the expected count' : ` · you expected ${sourceForm.expectedCount || cov.expectedCount || '?'}`, Number.isInteger(cov.speakers) ? ` · ${plural(cov.speakers, 'speaker')}` : '', cov.serviceSessions ? ` · ${plural(cov.serviceSessions, 'service session')} excluded` : '', cov.missingAbstracts ? ` · ${cov.missingAbstracts} without an abstract` : ''),
    cov.statuses && Object.keys(cov.statuses).length ? el('p', { class: 'cov-line muted', text: 'Statuses: ' + Object.entries(cov.statuses).map(([k, v]) => `${k} ${v}`).join(', ') }) : null,
    Number.isInteger(cov.existingCount) ? el('p', { class: 'cov-line muted', text: `${plural(cov.existingCount, 'submission')} already imported for this event${cov.missingExisting ? `; ${cov.missingExisting} of them ${cov.missingExisting === 1 ? 'is' : 'are'} no longer in the endpoint` : '; all of them are still in the endpoint'}.` }) : null,
    (cov.missingExisting || 0) > 0 ? el('label', { class: 'check src-removal' }, el('input', { type: 'checkbox', id: 'src-removal', checked: sourceForm.allowRemoval ? true : null }), `I know these ${cov.missingExisting} submission${cov.missingExisting === 1 ? ' was' : 's were'} removed on Sessionize; allow saving without them. Earlier versions stay in the local history.`) : null,
    cov.missingRequiredFields?.length ? el('p', { class: 'data-error', text: `Missing required fields: ${cov.missingRequiredFields.join(', ')}` }) : null,
    ...(cov.warnings || []).map(w => el('p', { class: 'warn', text: w })),
    r.checkedAt ? el('p', { class: 'cov-line muted', text: `Checked ${fmtDateTime(r.checkedAt)}. Nothing was imported.` }) : null,
    !matches ? el('p', { class: 'data-row' }, el('button', { type: 'button', class: 'ghost', text: `Use ${cov.count} as the expected count`, onclick: () => { readSourceForm(); sourceForm.expectedCount = String(cov.count); renderSync({ keepDrafts: false }); } })) : null) : null;
  const reasons = sourceGate(sourceForm, sourceResult);
  const check = el('button', { type: 'button', class: 'quiet', text: sourceBusy ? 'Checking…' : 'Check coverage', disabled: sourceBusy ? true : null, onclick: () => sourceAction('check', err) });
  const save = el('button', { type: 'button', class: 'primary', text: 'Save connection', disabled: reasons.length || sourceBusy ? true : null, 'data-tip': reasons.length ? `Needs: ${reasons.join('; ')}.` : 'Save this connection, then use Sync now to import', onclick: () => sourceAction('save', err) });
  const cancel = el('button', { type: 'button', class: 'ghost', text: 'Cancel', onclick: () => { sourceForm.open = false; sourceResult = null; renderSync({ keepDrafts: false }); } });
  const hint = reasons.length ? el('p', { class: 'muted src-hint', text: `Before saving: ${reasons.join('; ')}.` }) : el('p', { class: 'muted src-hint', text: 'Connection checked. Save it, then select Sync now to import.' });
  const setupHelp = el('p', {class:'setup-help', text:'Open your event in Sessionize and copy its organiser page URL. In API / Embed, create an endpoint with all sessions, including unscheduled sessions, and no category filters. Paste its JSON All URL below. You need organiser access to configure this.'});
  const form = el('form', { class: 'src-form', onsubmit: e => { e.preventDefault(); sourceAction(reasons.length ? 'check' : 'save', err); } }, setupHelp, fields, el('details', {class:'advanced-fields'}, el('summary', {text:'Required custom fields (optional)'}), req), coverage, confirms, sourceError ? el('p',{class:'data-error',role:'alert',text:sourceError}) : null, hint, el('div', { class: 'btns' }, check, save, cancel));
  form.addEventListener('change', () => { readSourceForm(); const rs = sourceGate(sourceForm, sourceResult); save.disabled = Boolean(rs.length); save.dataset.tip = rs.length ? `Needs: ${rs.join('; ')}.` : 'Save this connection, then use Sync now to import'; hint.textContent = rs.length ? `Before saving: ${rs.join('; ')}.` : 'Connection checked. Save it, then select Sync now to import.'; });
  fields.querySelector('#src-event').addEventListener('change', e => {const id = parseEventId(e.target.value); const known = state.status?.events?.find(x=>x.eventId===id); if (known && !$('src-name').value.trim()) { $('src-name').value = known.name; readSourceForm(); }});
  out.push(form);
  return out;
}
async function sourceAction(kind, err) {
  readSourceForm(); sourceError = ''; err.replaceChildren();
  const payload = sourcePayload();
  if (!payload.eventId || !payload.eventName || !payload.url) { sourceError = 'Paste the organiser URL, enter the event name and add the API URL first.'; renderSync({keepDrafts:false}); return; }
  sourceBusy = true; renderSync({ keepDrafts: false });
  try {
    const r = await api(kind === 'save' ? '/api/source' : '/api/source/check', { method: kind === 'save' ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    sourceResult = r;
    if (kind === 'save') { syncEvent = payload.eventId; sourceForm.open = false; sourceForm.url = ''; sourceResult = null; $('announce').textContent = `Saved source for ${payload.eventName}.`; await loadSync({ silent: true }); return; }
    if (!sourceForm.expectedCount) sourceForm.expectedCount = String(r.coverage.count);
  } catch (ex) {
    if (ex.status === 401) return lock('Your session was rejected by the local server. Unlock again to continue.');
    sourceError = ex.message;
  } finally { sourceBusy = false; renderSync({ keepDrafts: false }); }
}
function renderReaderInfo() {
  const st = state.status || {}; const p = st.published || {}; const body = $('data-body');
  body.replaceChildren(
    el('p', { class: 'cred' }, el('span', { class: 'state state-verified', 'aria-hidden': 'true' }, icon('verified')), `Connected${p.label ? ` as ${p.label}` : ''} to ${connection?.origin || location.origin}. This copy is read-only.`),
    el('h3', { text: 'Published events' }),
    el('ul', { class: 'runs' }, ...(st.events || []).map(e => el('li', null, el('span', { class: 'rid', text: e.name }), el('span', { class: `rstat ${e.error ? 'failed' : 'succeeded'}`, text: e.error ? 'Unavailable' : plural(e.sessions, 'proposal') }), el('span', { class: 'rid', text: e.generatedAt ? `published ${fmtRel(e.generatedAt)}` : '' }),
      el('span', { class: 'rdet', text: [e.capturedAt ? `Sessionize capture ${fmtDateTime(e.capturedAt)}` : '', e.includeAbstracts === false ? 'abstracts not included' : '', e.revision ? `revision ${e.revision.slice(0, 12)}` : ''].filter(Boolean).join(' · ') }),
      e.error ? el('span', { class: 'rerr', text: e.error }) : null))),
    el('p', { class: 'muted', text: 'To stop using this copy on this browser, press Disconnect in the top bar. To change what you can see, ask the organiser for a new invitation.' }));
}
function publicationSection() {
  const err = el('div'); const out = [err]; const t = pub.target || {}; const evs = events();
  if (t.configured) out.push(el('p', {class:'preview-link'}, el('a', {href:t.origin, target:'_blank', rel:'noopener', text:'Open reviewer website'})));
  else if (LOOPBACK.includes(location.hostname)) out.push(el('p', {class:'preview-link'}, el('a', {href:'http://127.0.0.1:43201/', target:'_blank', rel:'noopener', text:'Open local reviewer preview'}), el('span', {class:'muted',text:' · Requires the local preview service and its reader connection code. This is a snapshot, not a live view.'})));
  if (t.error) out.push(el('p', { class: 'data-error', text: t.error }));
  else if (t.configured) out.push(el('p', { class: 'cred' }, el('span', { class: 'state state-verified', 'aria-hidden': 'true' }, icon('verified')), el('span', null, 'Reader deployment: ', el('b', { text: t.origin }), '. The publisher token stays on this Mac. ', el('button', { type: 'button', class: 'ghost', text: 'Change', onclick: () => { pub.open = true; renderSync({ keepDrafts: false }); } }))));
  else out.push(el('p', { class: 'cred' }, el('span', { class: 'state state-contested', 'aria-hidden': 'true' }, icon('contested')), 'No reader deployment configured. Nothing can be published or shared until the HTTPS origin and publisher token are saved here.'));
  if (pub.open || (!t.configured && !t.error)) {
    const origin = el('input', { id: 'pub-origin', type: 'url', placeholder: 'https://reader.example.org', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Reader deployment origin' });
    const token = el('input', { id: 'pub-token', type: 'password', placeholder: 'Publisher token (32+ characters, kept local)', autocomplete: 'off', 'aria-label': 'Publisher token' });
    out.push(el('form', { class: 'data-row', onsubmit: async e => { e.preventDefault(); err.replaceChildren(); const b = e.submitter || e.currentTarget.querySelector('button[type=submit]'); b.disabled = true; try { await api('/api/publication/target', { method: 'POST', body: JSON.stringify({ origin: origin.value.trim(), token: token.value }) }); pub.open = false; token.value = ''; $('announce').textContent = 'Reader deployment saved.'; await loadSync({ silent: true }); } catch (ex) { syncError(err, ex.message); b.disabled = false; } } },
      el('label',{class:'control-label'},'Reader website URL',origin), el('label',{class:'control-label'},'Publisher token',token), el('button', { type: 'submit', class: 'quiet', text: 'Save deployment' })));
  }
  // Preview and publish
  const evSel = el('select', { id: 'pub-event', 'aria-label': 'Event to publish' }, ...evs.map(([id, n]) => el('option', { value: id, text: `${eventName(id)} (${n})` })));
  const profSel = el('select', { id: 'pub-profile', 'aria-label': 'View profile for the published copy' }, el('option', { value: 'strict-blind', text: 'Strict-blind (no reviewer-derived findings)' }), el('option', { value: 'collaborative', text: 'Collaborative' }), el('option', { value: 'organiser', text: 'Organiser' }));
  const abs = el('input', { type: 'checkbox', id: 'pub-abstracts' });
  const previewBtn = el('button', { type: 'button', class: 'quiet', text: pub.busy === 'preview' ? 'Building preview…' : 'Preview bundle', disabled: pub.busy ? true : null, onclick: async () => {
    err.replaceChildren(); pub.busy = 'preview'; pub.published = null; renderSync();
    try { pub.preview = await api('/api/publication/preview', { method: 'POST', body: JSON.stringify({ eventId: evSel.value, profile: profSel.value, includeAbstracts: abs.checked }) }); }
    catch (ex) { syncError(err, ex.message); } finally { pub.busy = ''; renderSync(); }
  } });
  out.push(el('h3', { text: 'Publish a read-only copy' }),
    el('p', { class: 'muted', text: 'A preview builds the bundle locally and shows exactly what it contains. Nothing leaves this Mac until you publish that revision.' }),
    el('div', { class: 'data-row' }, el('label',{class:'control-label'},'Event',evSel), el('label',{class:'control-label'},'Reviewer view',profSel), el('label', { class: 'check' }, abs, 'Include abstracts'), previewBtn));
  const pv = pub.preview;
  if (pv) {
    const publishBtn = el('button', { type: 'button', class: 'primary', text: pub.busy === 'publish' ? 'Publishing…' : `Publish this revision`, disabled: pub.busy || !t.configured ? true : null, 'data-tip': t.configured ? `Uploads revision ${pv.revision.slice(0, 12)} to ${t.origin}; readers see it immediately.` : 'Save a reader deployment first.', onclick: async () => {
      err.replaceChildren(); pub.busy = 'publish'; renderSync();
      try { pub.published = await api('/api/publication/publish', { method: 'POST', body: JSON.stringify({ revision: pv.revision }) }); $('announce').textContent = 'Published.'; }
      catch (ex) { syncError(err, ex.message); } finally { pub.busy = ''; renderSync(); }
    } });
    out.push(el('div', { class: 'preview' },
      el('p', { class: 'cov-line' }, el('b', { text: pv.event?.name || eventName(pv.options?.eventId) }), ` · ${plural(pv.sessions, 'proposal')} · ${plural(pv.findings, 'approved finding')} · ${(pv.bytes / 1024).toFixed(0)} KB · ${pv.options?.profile} profile · abstracts ${pv.options?.includeAbstracts ? 'included' : 'not included'}`),
      el('p', { class: 'cov-line muted', text: `Included: ${(pv.fields || []).join(', ')}.` }),
      el('p', { class: 'cov-line muted', text: `Never included: ${(pv.excluded || []).join(', ')}.` }),
      el('p', { class: 'cov-line muted', 'data-tip': `Revision ${pv.revision}`, tabindex: '0', text: `Revision ${pv.revision.slice(0, 12)}. Publishing re-checks that the data has not changed since this preview.` }),
      pub.published ? el('p', { class: 'cov-line' }, el('b', { text: 'Published.' }), ` Revision ${String(pub.published.revision || pv.revision).slice(0, 12)} is now what readers with access to this event see.`) : el('div', { class: 'btns' }, publishBtn)));
  }
  // Readers
  out.push(el('h3', { text: 'Reviewer access' }));
  const readers = pub.readers;
  if (readers === null) out.push(el('p', { class: 'muted', text: 'Reader list unavailable.' }));
  else if (!readers.length) out.push(el('p', { class: 'muted', text: 'No reviewers invited yet. An invitation creates a read-only connection code for chosen events; share it privately.' }));
  else out.push(el('ul', { class: 'runs' }, ...readers.map(r => el('li', null, el('span', { class: 'rid', text: r.label }), el('span', { class: 'rstat succeeded', text: `${plural((r.eventIds || []).length, 'event')}: ${(r.eventIds || []).map(eventName).join(', ')}` }), el('button', { type: 'button', class: 'ghost', text: 'Revoke', 'data-tip': 'Stops this connection code immediately', onclick: async () => { err.replaceChildren(); try { await api('/api/publication/revoke', { method: 'POST', body: JSON.stringify({ id: r.id }) }); $('announce').textContent = `Revoked ${r.label}.`; await loadSync({ silent: true }); } catch (ex) { syncError(err, ex.message); } } }),
    el('span', { class: 'rdet', text: [r.createdAt ? `invited ${fmtRel(r.createdAt)}` : '', `id ${String(r.id).slice(0, 12)}`].filter(Boolean).join(' · ') })))));
  const label = el('input', { id: 'inv-label', type: 'text', placeholder: 'Reviewer name or role', autocomplete: 'off', 'aria-label': 'Invitation label' });
  const boxes = evs.map(([id]) => el('label', { class: 'check' }, el('input', { type: 'checkbox', class: 'inv-event', id: `inv-event-${id}`, value: id }), eventName(id)));
  out.push(el('form', { class: 'invite', onsubmit: async e => {
    e.preventDefault(); err.replaceChildren(); const ids = [...document.querySelectorAll('.inv-event:checked')].map(i => i.value);
    if (!label.value.trim() || !ids.length) { syncError(err, 'Give the invitation a label and choose at least one event.'); return; }
    const b = e.submitter || e.currentTarget.querySelector('button[type=submit]'); b.disabled = true;
    try { pub.invite = await api('/api/publication/invite', { method: 'POST', body: JSON.stringify({ label: label.value.trim(), eventIds: ids }) }); $('announce').textContent = 'Invitation created.'; await loadSync({ silent: true }); }
    catch (ex) { syncError(err, ex.message); b.disabled = false; }
  } }, el('div', { class: 'data-row' }, label, ...boxes, el('button', { type: 'submit', class: 'quiet', text: 'Invite', disabled: t.configured ? null : true, 'data-tip': t.configured ? null : 'Save a reader deployment first.' }))));
  if (pub.invite?.connectionCode) {
    const code = pub.invite.connectionCode; const link = `${t.origin || ''}/#connect=${encodeURIComponent(code)}`;
    const ta = el('textarea', { readonly: true, rows: '3', 'aria-label': 'Connection code' }); ta.value = code;
    out.push(el('div', { class: 'invite-code' },
      el('p', { class: 'cov-line' }, el('b', { text: `Connection code for ${pub.invite.reader?.label || 'the reviewer'}.` }), ' Shown once. Send it privately; anyone holding it can read these events until you revoke it.'),
      ta,
      el('div', { class: 'btns' },
        el('button', { type: 'button', class: 'quiet', text: 'Copy code', onclick: async e => { try { await navigator.clipboard.writeText(code); e.currentTarget.textContent = 'Copied'; } catch { ta.select(); } } }),
        el('button', { type: 'button', class: 'quiet', text: 'Copy connect link', 'data-tip': 'Opens the published copy already connected; the code travels in the URL fragment, which browsers do not send to servers.', onclick: async e => { try { await navigator.clipboard.writeText(link); e.currentTarget.textContent = 'Copied'; } catch { ta.value = link; ta.select(); } } }),
        el('button', { type: 'button', class: 'ghost', text: 'Hide', onclick: () => { pub.invite = null; renderSync(); } })),
      el('p', { class: 'cov-line muted' }, 'On Sessionize the reviewer installs the userscript from ', el('a', { href: `${t.origin || ''}/review-helper.user.js`, target: '_blank', rel: 'noreferrer noopener', text: `${t.origin || ''}/review-helper.user.js` }), ', then opens the Tampermonkey menu on a Sessionize page, chooses “Connect Committee” and pastes the same code. Tampermonkey will ask once to allow the reader address.')));
  }
  return out;
}
const JOB_STATUS = { queued: 'Queued', running: 'Running', done: 'Done', failed: 'Failed', submitting: 'Submitting', polling: 'Waiting for result', paused: 'Paused', uncertain: 'Uncertain', succeeded: 'Done' };
function analysisSection() {
  const err = el('div'); const out = [err]; const a = ana.state || {}; const evs = events();
  if (a.error) { out.push(el('p', { class: 'data-error', text: a.error })); return out; }
  out.push(el('p', { class: 'cred' }, el('span', { class: `state ${a.configured ? 'state-verified' : 'state-contested'}`, 'aria-hidden': 'true' }, icon(a.configured ? 'verified' : 'contested')),
    a.configured ? `Model ${a.model || '?'}${a.verifier ? `, verifier ${a.verifier}` : ', no verifier'}${a.searchConfigured ? ', web search on' : ', no web search'}. Providers are configured locally; the UI never sees keys.` : 'No analysis provider configured on this Mac. Configure it with the local CLI or environment before running.'));
  const evSel = el('select', { id: 'ana-event', 'aria-label': 'Event to analyse' }, ...evs.map(([id, n]) => el('option', { value: id, text: `${eventName(id)} (${n})` })));
  const limit = el('input', { id: 'ana-limit', type: 'number', min: '1', max: '100', step: '1', value: '10', 'aria-label': 'Submissions per run' });
  const run = el('button', { type: 'button', class: 'quiet', text: ana.busy === 'ana' ? 'Starting…' : 'Analyse', disabled: !a.configured || ana.busy ? true : null, 'data-tip': a.configured ? 'Queues up to this many not-yet-analysed submissions. Each uses one model call, one verifier call if configured, and up to three searches.' : 'Configure a provider first.', onclick: async () => {
    const n = Number(limit.value); if (!(Number.isInteger(n) && n >= 1 && n <= 100)) { syncError(err, 'Choose 1 to 100 submissions.'); shake(limit); return; }
    err.replaceChildren(); ana.busy = 'ana'; renderSync();
    try { await api('/api/analysis/run', { method: 'POST', body: JSON.stringify({ eventId: evSel.value, limit: n }) }); $('announce').textContent = 'Analysis queued.'; await loadSync({ silent: true }); }
    catch (ex) { syncError(err, ex.message); } finally { ana.busy = ''; renderSync(); }
  } });
  out.push(el('div', { class: 'data-row' }, el('label',{class:'control-label'},'Event',evSel), el('label', { class: 'check' }, 'up to ', limit, ' submissions'), run),
    el('p', { class: 'muted', text: 'Drafts stay “proposed” until a reviewer approves them on the proposal; nothing model-written reaches badges or published copies before that.' }));
  const jobs = (a.jobs || []).slice(0, 12);
  out.push(jobs.length ? el('ul', { class: 'runs' }, ...jobs.map(x => el('li', null, el('span', { class: 'rid', text: eventName(x.eventId) }), el('span', { class: `rstat ${x.status}`, text: JOB_STATUS[x.status] || x.status }), el('span', { class: 'rid', text: x.createdAt ? fmtRel(x.createdAt) : '' }),
    el('span', { class: 'rdet', text: [x.stage && x.stage !== x.status ? `stage ${x.stage}` : '', `${x.modelCalls ?? 0} model call${x.modelCalls === 1 ? '' : 's'}`, `${x.searchCalls ?? 0} search${x.searchCalls === 1 ? '' : 'es'}`, Number.isInteger(x.findings) ? `${plural(x.findings, 'finding')}` : '', Number.isInteger(x.topics) ? `${plural(x.topics, 'topic')}` : ''].filter(Boolean).join(' · ') }),
    x.error ? el('span', { class: 'rerr', text: x.error }) : null))) : el('p', { class: 'muted', text: 'No analysis jobs yet.' }));
  return out;
}
function detectorSection() {
  const err = el('div'); const out = [err]; const d = ana.det || {}; const evs = events();
  if (d.error) { out.push(el('p', { class: 'data-error', text: d.error })); return out; }
  out.push(el('p', { class: 'muted', text: 'AI-text detection is a separate, paid provider signal. It is never a quality judgement and never counts as a finding against a proposal.' }),
    el('p', { class: 'cred' }, el('span', { class: `state ${d.configured ? 'state-verified' : 'state-contested'}`, 'aria-hidden': 'true' }, icon(d.configured ? 'verified' : 'contested')), d.configured ? `Pangram model ${d.model || '?'} configured locally.` : 'No detector configured on this Mac.'));
  const evSel = el('select', { id: 'det-event', 'aria-label': 'Event for detection' }, ...evs.map(([id, n]) => el('option', { value: id, text: `${eventName(id)} (${n})` })));
  const limit = el('input', { id: 'det-limit', type: 'number', min: '1', max: '100', step: '1', value: '10', 'aria-label': 'Abstracts to submit' });
  const run = el('button', { type: 'button', class: 'quiet', text: ana.busy === 'det' ? 'Submitting…' : `Run ${d.model || 'detector'} (paid)`, disabled: !d.configured || ana.busy ? true : null, 'data-tip': d.configured ? 'Submits up to this many abstracts that have no cached result. Each submission is billed by the provider.' : 'Configure the detector first.', onclick: async () => {
    const n = Number(limit.value); if (!(Number.isInteger(n) && n >= 1 && n <= 100)) { syncError(err, 'Choose 1 to 100 abstracts.'); shake(limit); return; }
    err.replaceChildren(); ana.busy = 'det'; renderSync();
    try { await api('/api/detector/run', { method: 'POST', body: JSON.stringify({ eventId: evSel.value, limit: n }) }); $('announce').textContent = 'Detector run queued.'; await loadSync({ silent: true }); }
    catch (ex) { syncError(err, ex.message); } finally { ana.busy = ''; renderSync(); }
  } });
  out.push(el('div', { class: 'data-row' }, el('label',{class:'control-label'},'Event',evSel), el('label', { class: 'check' }, 'up to ', limit, ' abstracts'), run));
  const jobs = (d.jobs || []).slice(0, 12);
  out.push(jobs.length ? el('ul', { class: 'runs' }, ...jobs.map(x => el('li', null, el('span', { class: 'rid', text: eventName(x.eventId) }), el('span', { class: `rstat ${x.status}`, text: JOB_STATUS[x.status] || x.status }), el('span', { class: 'rid' }, x.status === 'paused' ? el('button', { type: 'button', class: 'ghost', text: 'Resume', 'data-tip': 'Continues polling the existing provider task; nothing is resubmitted or billed again', onclick: async e => { e.currentTarget.disabled = true; try { await api('/api/detector/resume', { method: 'POST', body: JSON.stringify({ id: x.id }) }); await loadSync({ silent: true }); } catch (ex) { syncError(err, ex.message); } } }) : ''),
    el('span', { class: 'rdet', text: [x.model ? `model ${x.model}` : '', `${(x.versionIds || []).length} abstract${(x.versionIds || []).length === 1 ? '' : 's'}`, x.result ? `${x.result.headline} (${Math.round((x.result.fraction_ai || 0) * 100)}% generated fraction)` : '', x.polls ? `${x.polls} polls` : ''].filter(Boolean).join(' · ') }),
    x.error ? el('span', { class: 'rerr', text: x.error }) : null))) : el('p', { class: 'muted', text: 'No detector jobs yet.' }));
  return out;
}
function renderSync({ keepDrafts = true } = {}) {
  // Progress updates must not discard an event ID or schedule the user is editing.
  const drafts = new Map((keepDrafts ? [...dataDlg.querySelectorAll('input[id],select[id]')] : []).map(input => [input.id, { value: input.value, checked: input.checked }]));
  const focused = dataDlg.contains(document.activeElement) ? document.activeElement : null;
  const focusId = focused?.id;
  const selection = focused?.type === 'text' ? [focused.selectionStart, focused.selectionEnd] : null;
  const d = syncData || {}; const body = $('data-body'); const configs = d.configs || [], runs = (d.runs || []).slice().sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || ''))).slice(0, 12);
  const sources = d.sources || [];
  const cred = el('p', { class: 'cred fallback' }, el('span', { class: `state ${d.credentialConfigured ? 'state-verified' : 'state-contested'}`, 'aria-hidden': 'true' }, icon(d.credentialConfigured ? 'verified' : 'contested')),
    d.credentialConfigured ? 'Fallback cookie login is configured on this Mac; the saved API source is used first.' : el('span', null, 'Fallback only: if an event has no saved API source, sync needs a cookie login. Run ', el('code', { text: CRED_CLI }), '; the file stays local.'));
  const err = el('div');
  const choices = new Map(events().map(([id]) => [id, eventName(id)]));
  sources.forEach(x => choices.set(x.eventId, x.eventName || eventName(x.eventId)));
  configs.forEach(x => { if (!choices.has(x.eventId)) choices.set(x.eventId, eventName(x.eventId)); });
  if (!choices.has(syncEvent)) syncEvent = choices.has(state.event) ? state.event : choices.keys().next().value || '';
  const input = el('select', { id:'sync-event', 'aria-label':'Event to sync', onchange: e => {syncEvent = e.target.value; sourceForm.open = false; sourceError = ''; renderSync({keepDrafts:false});} }, ...[...choices].map(([id,name])=>el('option',{value:id,text:name,selected:id===syncEvent ? true:null})));
  input.value = syncEvent;
  const selectedSource = sources.find(x=>x.eventId===syncEvent);
  const selectedConfig = configs.find(x=>x.eventId===syncEvent);
  const selectedRun = runs.find(x=>x.eventId===syncEvent);
  const connected = Boolean(selectedSource || d.credentialConfigured);
  const running = ['queued','running'].includes(selectedRun?.status);
  const editConnection = (fresh = false) => {
    Object.assign(sourceForm, {eventId:fresh?'':syncEvent,eventName:fresh?'':choices.get(syncEvent)||'',url:'',expectedCount:selectedSource && !fresh ? String(selectedSource.expectedCount||''):'',requiredFields:[],allStatuses:false,unscheduled:false,allowRemoval:false,open:true});
    sourceResult = null; sourceError = ''; renderSync({keepDrafts:false}); $('src-event')?.focus();
  };
  const connectionStatus = el('div', {class:'connection-status'}, el('strong',{text:selectedSource?'Sessionize API configured':d.credentialConfigured?'Saved Sessionize login available':'Not connected'}),
    el('p',{class:'muted',text:selectedSource?'Sync imports this event’s submissions into Committee.':d.credentialConfigured?'Sync will use the legacy login-based importer. If the login has expired, the run will ask for renewed access.':'Connect a Sessionize API endpoint before syncing this event.'}),
    el('button',{type:'button',class:'ghost',text:selectedSource?'Edit connection':'Set up API connection',onclick:()=>editConnection()}));
  const btn = el('button', { type: 'button', class: 'primary', text: running ? 'Syncing…' : 'Sync now', disabled: !syncEvent || !connected || running ? true : null, onclick: async () => {
    const eventId = parseEventId(input.value); if (!eventId) { syncError(err, 'Enter a numeric event ID, or paste an organiser URL of the form sessionize.com/app/organizer/event/<id> or /sessions/<id>.'); shake(input); input.focus(); return; }
    btn.disabled = true; err.replaceChildren();
    try { const r = await api('/api/sync', { method: 'POST', body: JSON.stringify({ eventId }) }); syncData = syncData || {}; syncData.runs = [r.run, ...(syncData.runs || []).filter(x => x.id !== r.run?.id)]; renderSync(); clearTimeout(syncPoll); syncPoll = setTimeout(() => loadSync({ silent: true }), 1500); }
    catch (ex) { syncError(err, ex.message); }
    finally { btn.disabled = false; }
  } });
  const form = el('form', { class: 'data-row', onsubmit: e => { e.preventDefault(); btn.click(); } }, input, btn);
  const cfgList = selectedConfig ? [selectedConfig].map(cfg => {
    const enabled = el('input', { type: 'checkbox', id: `sync-enabled-${cfg.eventId}`, checked: cfg.enabled ? true : null });
    const interval = el('input', { type: 'number', id: `sync-interval-${cfg.eventId}`, min: '15', max: '10080', step: '1', value: String(cfg.intervalMinutes ?? 60), 'aria-label': `Interval in minutes for event ${cfg.eventId}` });
    const save = el('button', { type: 'button', class: 'quiet', text: 'Save schedule', onclick: async () => {
      const minutes = Number(interval.value); if (!(Number.isInteger(minutes) && minutes >= 15 && minutes <= 10080)) { syncError(err, 'Interval must be between 15 and 10080 minutes.'); shake(interval); return; }
      save.disabled = true; err.replaceChildren();
      try { const r = await api('/api/sync/config', { method: 'PUT', body: JSON.stringify({ eventId: cfg.eventId, enabled: enabled.checked, intervalMinutes: minutes }) }); Object.assign(cfg, r.config || {}); renderSync(); $('announce').textContent = `Saved schedule for event ${cfg.eventId}.`; }
      catch (ex) { syncError(err, ex.message); } finally { save.disabled = false; }
    } });
    const last = cfg.latestRun; const when = [cfg.lastSuccess ? `last success ${fmtRel(cfg.lastSuccess)}` : 'no successful sync yet', cfg.enabled && cfg.nextDue ? `next due ${fmtRel(cfg.nextDue)}` : (cfg.enabled ? (last?.status === 'auth_required' ? 'automatic runs paused until a manual retry (credential needed)' : 'next run not scheduled yet') : 'schedule off'), last ? `latest run ${RUN_STATUS[last.status] || last.status}${last.stage ? ` (${last.stage})` : ''}` : ''].filter(Boolean).join(' · ');
    return el('div', { class: 'cfg' }, el('span', { class: 'who', text: eventName(cfg.eventId) }), el('label', null, enabled, 'Automatically sync'), el('label', null, 'every ', interval, ' min'), save, el('span', { class: 'when', text: when }));
  }) : [el('p', { class: 'muted', text: 'Run the first sync to enable scheduling for this event.' })];
  const eventRuns = runs.filter(r=>r.eventId===syncEvent);
  const runList = eventRuns.length ? el('ul', { class: 'runs' }, ...eventRuns.map(r => {
    const pct = r.total ? Math.round(100 * (r.completed || 0) / r.total) : null;
    return el('li', null, el('span', { class: 'rid', text: eventName(r.eventId) }), el('span', { class: `rstat ${r.status}`, text: RUN_STATUS[r.status] || r.status }), el('span', { class: 'rid', text: r.startedAt ? fmtRel(r.startedAt) : '' }),
      el('span', { class: 'rdet', 'data-tip': r.result?.snapshot ? `Snapshot ${r.result.snapshot}` : null, text: [r.stage ? `stage ${r.stage}` : '', r.total ? `${r.completed || 0} of ${r.total}` : '', r.finishedAt ? `finished ${fmtDateTime(r.finishedAt)}` : '', resultText(r.result)].filter(Boolean).join(' · ') }),
      r.error ? el('span', { class: 'rerr', text: r.error }) : null,
      pct !== null && ['queued', 'running'].includes(r.status) ? el('span', { class: 'progress', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, (() => { const i = el('i'); i.style.transform = `scaleX(${pct / 100})`; return i; })()) : null);
  })) : el('p', { class: 'muted', text: 'No sync runs recorded.' });
  const section = (title, ...children) => el('section', { class: 'admin-section' }, el('h3', { text: title }), ...children);
  if (adminSection === 'analysis') body.replaceChildren(section('Editorial analysis', ...analysisSection()), section('AI-text detector', ...detectorSection()));
  else if (adminSection === 'publish') body.replaceChildren(section('Publication & reviewer access', ...publicationSection()));
  else body.replaceChildren(
    section('Your event', el('label',{class:'control-label',for:'sync-event',text:'Choose the event to update'}), form,
      el('p',{class:'sync-last',text:selectedConfig?.lastSuccess ? `Last successful sync: ${fmtDateTime(selectedConfig.lastSuccess)}` : 'No successful sync recorded for this event.'}),
      selectedRun && ['queued','running','failed','auth_required'].includes(selectedRun.status) ? el('p',{class:selectedRun.error?'data-error':'muted',role:'status',text:`${RUN_STATUS[selectedRun.status]}${selectedRun.error ? ': '+selectedRun.error : ''}`}) : null,
      err, connectionStatus,
      el('button',{type:'button',class:'ghost',text:'Connect another event',onclick:()=>editConnection(true)})),
    ...(sourceForm.open ? [section('Connect to Sessionize', ...sourceSection(sources,err))] : []),
    section('Automatic sync', ...cfgList, el('p',{class:'muted',text:'Scheduled updates run only while Committee’s local service is running.'})),
    el('details',{class:'admin-section'},el('summary',{text:'Sync history for this event'}),runList),
    el('details',{class:'admin-section'},el('summary',{text:'Advanced: legacy login'}),cred));
  for (const input of dataDlg.querySelectorAll('input[id],select[id]')) {
    const draft = drafts.get(input.id);
    if (draft) { input.value = draft.value; input.checked = draft.checked; }
  }
  if (focusId) {
    const replacement = document.getElementById(focusId);
    replacement?.focus({ preventScroll: true });
    if (selection && replacement?.type === 'text') replacement.setSelectionRange(...selection);
  }
}

// ---------- Shortcuts dialog ----------
const dlg = $('shortcuts');
$('help').onclick = () => dlg.showModal();
$('shortcuts-close').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

// ---------- Filters ----------
let searchTimer;
$('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = $('search').value.trim(); reload(); }, 180); });
// Reader mode filters locally: reload() re-runs loadReader, which applies q and topic client-side.
$('search').addEventListener('keydown', e => { if (e.key === 'Escape') { $('search').value = ''; state.q = ''; reload(); } if (e.key === 'Enter') { e.preventDefault(); const first = visible()[0]; if (first) select(first.id, { focusRow: true }); } });
$('topic').addEventListener('change', () => setTopic($('topic').value));
$('event').addEventListener('change', () => { state.event = $('event').value; state.topic = ''; state.origin = null; state.compare = null; state.selected = null; const url = new URL(location.href); url.searchParams.delete('session'); state.event ? url.searchParams.set('event', state.event) : url.searchParams.delete('event'); history.replaceState(null, '', url); reload(); });
$('profile').addEventListener('change', () => { state.profile = $('profile').value; reload({ fresh: true }); });
$('sort').addEventListener('change', () => { state.sort = $('sort').value; renderDocket(); renderReading({ keepScroll: true }); });
$('openonly').addEventListener('change', () => { state.openOnly = $('openonly').checked; renderDocket(); renderReading({ keepScroll: true }); });

// ---------- Global keys ----------
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (dlg.open) { dlg.close(); return; }
    if (!dataDlg.hidden) { showSection('review'); return; }
    if (tipFor) { hideTip(); return; }
    if (state.compare && !e.target.matches('input, textarea, select')) { closeCompare(); return; }
    return;
  }
  if (!state.loaded || e.metaKey || e.ctrlKey || e.altKey || dlg.open || !dataDlg.hidden) return;
  if (e.target.matches('input, textarea, select, [contenteditable]')) return;
  switch (e.key) {
    case 'j': case 'ArrowDown': if (e.key === 'ArrowDown' && !$('list').contains(e.target)) return; e.preventDefault(); step(1); break;
    case 'k': case 'ArrowUp': if (e.key === 'ArrowUp' && !$('list').contains(e.target)) return; e.preventDefault(); step(-1); break;
    case '/': e.preventDefault(); $('search').focus(); $('search').select(); break;
    case 'e': e.preventDefault(); toggleAll(); break;
    case '?': e.preventDefault(); dlg.showModal(); break;
    case 'c': { e.preventDefault(); const s = current(); const r = s && related(s)[0]; if (r) openCompare(r.o.id, document.activeElement); else $('announce').textContent = 'No related proposal to compare.'; break; }
    case 'd': {
      if (READER) return;
      const node = e.target.closest?.('.finding') || document.activeElement.closest?.('.finding'); if (!node) return; e.preventDefault();
      [...node.querySelectorAll('.finding-actions .ghost')].find(b => b.textContent.startsWith('Dismiss'))?.click(); break;
    }
    case 'Enter': if (e.target.matches('.row')) { e.preventDefault(); select(e.target.dataset.id, { focusReading: true }); } break;
  }
});

// ---------- Boot ----------
(async () => {
  try { const rt = await (await fetch('/api/runtime', { headers: { Accept: 'application/json' } })).json(); if (rt?.mode === 'reader') READER = true; else if (rt?.mode === 'admin' && !location.hash.startsWith('#connect=')) READER = false; } catch { /* keep the fallback decision */ }
  if (READER) {
    document.documentElement.dataset.mode = 'reader';
    $('unlock').querySelector('h1').textContent = 'Open the published review copy';
    $('unlock').querySelector('p').textContent = 'Paste the connection code from your invitation. This copy is read-only: you can read proposals and approved findings, but corrections and sync happen on the organiser\u2019s machine.';
    $('login').querySelector('label').textContent = 'Reviewer connection code';
    $('login').querySelector('button').textContent = 'Connect';
    $('lock').setAttribute('aria-label', 'Disconnect'); $('lock').querySelector('span').textContent = 'Disconnect';
    $('token').placeholder = 'Paste the whole code';
  }
  let saved = READER ? storedConnection.get() : storedToken.get();
  if (READER && location.hash.startsWith('#connect=')) { saved = decodeURIComponent(location.hash.slice(9)); history.replaceState(null, '', location.pathname + location.search); }
  if (!saved) { $('token').focus(); return; }
  try { await unlock(saved); }
  catch (ex) { if (READER) storedConnection.clear(); else storedToken.clear(); state.token = ''; connection = null; $('token').focus(); if (ex.status !== 401) banner(ex.message, () => location.reload()); else banner(READER ? 'This connection was not accepted. Ask the organiser for a new invitation.' : ex.message); }
})();

// Test hook: lets a Node test run this script in a stubbed DOM and reach the pure logic. Inert in the browser.
if (typeof globalThis.__committeeTestHook === 'function') globalThis.__committeeTestHook({ state, sessionKey, workspaceSession, eventName, sourceGate, parseConnection, checkConnectionSite, readerSessions, readerMatches, describe, findingRank, sortedFindings, summarise, related, visible, fmtRel, host, topicLabel, topicInferred, reviewTopics, plural, parseEventId, hueFor, formatClass });
