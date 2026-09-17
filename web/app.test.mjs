// Frontend logic tests. Run: node --test web/
// The app is a classic browser script; it runs here inside a vm context with a minimal DOM stub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadApp() {
  const handler = { get: (t, k) => k in t ? t[k] : (k === 'dataset' ? (t.dataset ||= {}) : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'style' ? (t.style ||= {}) : typeof k === 'string' && ['children', 'options'].includes(k) ? [] : () => stub()), set: (t, k, v) => (t[k] = v, true) };
  const stub = () => new Proxy({ hidden: false, value: '', textContent: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, replaceChildren() {}, append() {}, focus() {}, setAttribute() {}, removeAttribute() {}, getAttribute: () => null, contains: () => false, closest: () => null, matches: () => false }, handler);
  let internals;
  const sandbox = {
    console, Intl, Date, Set, Map, URL, URLSearchParams, Error, Object, Array, String, Number, Boolean, Math, JSON, Promise, setTimeout, clearTimeout, requestAnimationFrame: f => f(),
    matchMedia: () => ({ matches: false }), fetch: () => Promise.reject(Error('no network in tests')),
    document: stub(), location: { search: '', hash: '', pathname: '/', hostname: '127.0.0.1', origin: 'http://127.0.0.1', href: 'http://127.0.0.1/' }, history: { replaceState() {} }, innerWidth: 1440, innerHeight: 900, atob, btoa,
    addEventListener() {}, __committeeTestHook: x => { internals = x; },
  };
  sandbox.globalThis = sandbox; sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('./app.js', import.meta.url), 'utf8'), sandbox);
  assert.ok(internals, 'test hook did not run');
  return internals;
}

const finding = (over = {}) => ({ id: over.id || Math.random().toString(36).slice(2), label: 'claims', reason: 'r', kind: 'claim', strength: 'tentative', inputClasses: ['abstract'], origin: 'claim-check-v1', disposition: 'open', note: '', ...over });
const session = (id, over = {}) => ({ id, eventId: 'e', title: `Title ${id}`, abstract: 'A'.repeat(50), speakers: ['Speaker A'], topics: ['Compose'], track: ['Android'], format: ['Session'], withdrawn: false, findings: [], ...over });

test('finding state is derived honestly and never promotes unverified evidence', () => {
  const { describe } = loadApp();
  assert.equal(describe(finding({ origin: 'legacy-import', strength: 'legacy / unverified' })).state, 'legacy');
  assert.equal(describe(finding({ kind: 'mechanical', strength: 'measured', origin: 'mechanical-v1' })).state, 'measured');
  assert.equal(describe(finding({ kind: 'detector', strength: 'cached detector', status: 'verified' })).state, 'detector', 'a detector result never reads as verified');
  assert.equal(describe(finding({ strength: 'verified' })).state, 'verified');
  assert.equal(describe(finding({ status: 'verified', severity: 'major' })).state, 'concern');
  assert.equal(describe(finding({ status: 'verified', severity: 'bogus' })).state, 'verified', 'unknown severities are ignored, not trusted');
  assert.equal(describe(finding({ status: 'contested' })).state, 'contested');
  assert.equal(describe(finding({ status: 'verified', disposition: 'dismissed' })).state, 'dismissed');
  assert.equal(describe(finding({})).state, 'proposed', 'model output without verification is only proposed');
  const gated = describe(finding({ kind: 'speaker', identityConfirmed: true, humanApproved: false }));
  assert.equal(gated.identityGate, true);
  assert.equal(describe(finding({ inputClasses: ['abstract', 'reviewer'] })).reviewerDerived, true);
});

test('findings sort by severity, then state; dismissed always last; detector counted separately', () => {
  const { sortedFindings, summarise } = loadApp();
  const s = session('1', { findings: [
    finding({ id: 'legacy', origin: 'legacy-import', strength: 'legacy / unverified' }),
    finding({ id: 'dismissed', status: 'verified', severity: 'major', disposition: 'dismissed' }),
    finding({ id: 'proposed-major', severity: 'major' }),
    finding({ id: 'verified-info', status: 'verified', severity: 'info' }),
    finding({ id: 'detector', kind: 'detector', strength: 'cached detector' }),
    finding({ id: 'concern', status: 'verified', severity: 'major' }),
  ] });
  assert.deepEqual(sortedFindings(s).map(d => d.f.id), ['concern', 'proposed-major', 'verified-info', 'legacy', 'detector', 'dismissed']);
  const c = summarise(s);
  assert.equal(c.open, 4); assert.equal(c.dismissed, 1); assert.equal(c.detector, 1); assert.equal(c.concern, 1);
});

test('related proposals score shared topics and speakers, and never include the proposal itself', () => {
  const { related, state } = loadApp();
  const a = session('a', { topics: ['Compose', 'Performance'], speakers: ['Nadia Example'] });
  state.all = [a, session('b', { topics: ['Compose'] }), session('c', { topics: ['Gradle'], speakers: ['Nadia Example'] }), session('d', { topics: ['Testing'] })];
  const r = related(a);
  assert.deepEqual(r.map(x => x.o.id), ['c', 'b'], 'same speaker outranks one shared topic');
  assert.ok(!r.some(x => x.o.id === 'a'));
});

test('docket sorting and the open-only filter', () => {
  const { visible, state } = loadApp();
  state.view = [session('b', { title: 'Beta', findings: [finding({})] }), session('a', { title: 'Alpha' }), session('c', { title: 'Gamma', findings: [finding({ disposition: 'dismissed' })] })];
  state.sort = 'title'; assert.deepEqual(visible().map(s => s.id), ['a', 'b', 'c']);
  state.sort = 'open'; assert.deepEqual(visible().map(s => s.id), ['b', 'a', 'c']);
  state.view[1].eventId = 'other'; state.event = 'other'; assert.deepEqual(visible().map(s => s.id), ['a'], 'event filter narrows the docket'); state.event = '';
  state.openOnly = true; assert.deepEqual(visible().map(s => s.id), ['b'], 'dismissed findings do not count as open');
});

test('topics may be strings or objects with a source', () => {
  const { topicLabel, topicInferred } = loadApp();
  assert.equal(topicLabel('Compose'), 'Compose');
  assert.equal(topicLabel({ label: 'Compose', source: 'inferred' }), 'Compose');
  assert.equal(topicInferred({ label: 'Compose', source: 'inferred' }), true);
  assert.equal(topicInferred('Compose'), false);
});

test('event id parsing accepts a bare id or an organiser URL', () => {
  const { parseEventId } = loadApp();
  assert.equal(parseEventId('24237'), '24237');
  assert.equal(parseEventId(' https://sessionize.com/app/organizer/event/24237 '), '24237');
  assert.equal(parseEventId('https://sessionize.com/app/organizer/sessions/19193/#e=7441&o=DateDesc&h=99111,99112'), '19193', 'ids in the hash are ignored');
  assert.equal(parseEventId('https://sessionize.com/app/organizer/24237/sessions/list'), '', 'other paths are not guessed');
  assert.equal(parseEventId('no id here'), '');
  assert.equal(parseEventId('0123'), '');
});

test('categorical colour is stable per topic and fixed per format', () => {
  const { hueFor, formatClass } = loadApp();
  assert.equal(hueFor('Compose'), hueFor('compose'));
  assert.match(hueFor('Kotlin'), /^hue-[1-8]$/);
  assert.equal(formatClass('Workshop (half day)'), 'fmt fmt-workshop');
  assert.equal(formatClass('Lightning talk'), 'fmt fmt-lightning');
  assert.equal(formatClass('Something else'), 'fmt');
});

test('session identity includes the event and preserves the original ID for links', () => {
  const { workspaceSession, sessionKey } = loadApp();
  const a = workspaceSession({ eventId: '12', id: '34' });
  const b = workspaceSession({ eventId: '56', id: '34' });
  assert.notEqual(a.id, b.id);
  assert.equal(a.sourceId, '34');
  assert.equal(sessionKey({ eventId: '12', id: '34' }), '12:34');
});

test('source wizard gate lists what is still needed and opens only when the check matches', () => {
  const { sourceGate } = loadApp();
  const form = { eventId: '19193', eventName: 'droidcon', url: 'https://sessionize.com/api/v2/abc123/view/All', expectedCount: '386', requiredFields: [], allStatuses: true, unscheduled: true };
  const result = { coverage: { count: 386, missingRequiredFields: [] } };
  assert.equal(sourceGate(form, result).length, 0);
  assert.ok(sourceGate({ ...form, url: 'https://sessionize.com/api/v2/abc123/view/Sessions' }, result).some(r => r.includes('API URL')));
  assert.ok(sourceGate({ ...form, expectedCount: '385' }, result).some(r => r.includes('386')));
  assert.ok(sourceGate({ ...form, allStatuses: false }, result).some(r => r.includes('all-statuses')));
  assert.ok(sourceGate(form, null).some(r => r.includes('coverage check')));
  assert.ok(sourceGate(form, { coverage: { count: 386, missingRequiredFields: ['Level'] } }).some(r => r.includes('Level')));
  assert.ok(sourceGate(form, { coverage: { count: 386, missingRequiredFields: [], missingExisting: 2 } }).some(r => r.includes('2 known removals')));
  assert.equal(sourceGate({ ...form, allowRemoval: true }, { coverage: { count: 386, missingRequiredFields: [], missingExisting: 2 } }).length, 0);
});

test('reader connection codes are validated and bundle sessions map onto the local shape', () => {
  const { parseConnection, readerSessions, readerMatches } = loadApp();
  const code = btoa(JSON.stringify({ schemaVersion: 1, origin: 'https://reader.example.org', token: 'abc', eventIds: ['19193', '19193'] })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const c = parseConnection(code);
  assert.equal(c.origin, 'https://reader.example.org'); assert.deepEqual([...c.eventIds], ['19193']);
  assert.throws(() => parseConnection('not-a-code'), /could not be read/);
  assert.throws(() => parseConnection(btoa(JSON.stringify({ schemaVersion: 1, origin: 'http://evil.example.org', token: 'x', eventIds: ['1'] }))), /address/);
  assert.throws(() => parseConnection(btoa(JSON.stringify({ schemaVersion: 2, origin: 'https://r.example.org', token: 'x', eventIds: ['1'] }))), /not valid/);
  const [s] = readerSessions({ sessions: [{ id: '7', eventId: '19193', title: 'T', speakers: ['A'], topics: ['Compose'], track: [], format: ['Session'], withdrawn: false, findings: [{ id: 'f1', label: 'short', caption: 'Very short abstract', kind: 'mechanical', strength: 'measured', reason: 'r' }, { id: 'f2', label: 'expertise', kind: 'speaker', strength: 'verified', reason: 'ok' }] }] });
  assert.equal(s.abstractOmitted, true); assert.equal(s.abstract, '');
  assert.equal(s.findings[0].disposition, 'open'); assert.equal(s.findings[1].identityConfirmed, true, 'published speaker findings are already approved');
  assert.equal(s.findings[0].humanApproved, false, 'mechanical measurements are not approvals'); assert.equal(s.findings[1].humanApproved, true);
  assert.equal(readerMatches({ title: 'Cold start', abstract: '', speakers: ['Nadia Example'] }, 'nadia cold'), true);
  assert.equal(readerMatches({ title: 'Cold start', abstract: '', speakers: [] }, 'gradle'), false);
});

test('model-proposed findings stay proposed until a human approves them', () => {
  const { describe } = loadApp();
  const draft = finding({ origin: 'analysis-v1:some-model', strength: 'supported', humanApproved: false, verification: { verdict: 'supported', reason: 'ok', model: 'v' } });
  const d = describe(draft);
  assert.equal(d.state, 'proposed', 'a verifier model agreeing does not promote the finding');
  assert.equal(d.awaitingApproval, true); assert.equal(d.verification.verdict, 'supported');
  assert.equal(describe({ ...draft, humanApproved: true }).state, 'approved');
  assert.equal(describe({ ...draft, humanApproved: true, kind: 'speaker', identityConfirmed: false }).identityGate, true);
  assert.equal(describe({ ...draft, humanApproved: true, disposition: 'dismissed' }).state, 'dismissed');
});

test('published findings read as approved, measurements stay measured, and invitations must match the hosted site', () => {
  const { describe, readerSessions, checkConnectionSite } = loadApp();
  const [s] = readerSessions({ sessions: [{ id: '1', eventId: '1', title: 'T', speakers: [], topics: [], track: [], format: [], withdrawn: false, findings: [
    { id: 'a', label: 'promotion', kind: 'editorial', strength: 'supported', reason: 'r' }, { id: 'b', label: 'short', kind: 'mechanical', strength: 'measured', reason: 'r' }, { id: 'c', label: 'detector', kind: 'detector', strength: 'provider-signal', reason: 'r' }] }] });
  assert.deepEqual(s.findings.map(f => describe(f).state), ['approved', 'measured', 'detector']);
  const conn = { origin: 'https://reader.example.org', token: 't', eventIds: ['1'] };
  assert.doesNotThrow(() => checkConnectionSite(conn, 'https://reader.example.org', false));
  assert.doesNotThrow(() => checkConnectionSite(conn, 'http://127.0.0.1:43199', true), 'loopback pages may test any invitation');
  assert.throws(() => checkConnectionSite(conn, 'https://other.example.org', false), /not this site/);
});

test('local topic navigation includes drafts without duplicating submitted tags or promoting them',()=>{
 const {reviewTopics}=loadApp();
 const s=session('x',{topics:['Flutter'],analysis:{topics:[{name:'flutter',quote:'Flutter',role:'core'},{name:'Rendering',quote:'render',role:'supporting'}]}});
 const topics=reviewTopics(s,true);assert.equal(topics.length,2);assert.equal(topics[0].inferred,false);assert.equal(topics[1].proposed,true);
 assert.equal(reviewTopics(s,false).length,1);
 s.analysis.topicsApproved=false;assert.equal(reviewTopics(s,true).length,1);
 s.analysis.topicsApproved=true;s.submittedTopics=['Flutter'];s.topics=['Flutter','Rendering'];assert.equal(reviewTopics(s,true)[1].inferred,true);assert.equal(reviewTopics(s,true)[1].proposed,false);
});
