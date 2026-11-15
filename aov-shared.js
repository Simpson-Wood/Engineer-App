// ═══════════════════════════════════════════════════════════════════════════
//  aov-shared.js — AOV testing: the logic both AOV pages use   v1.0
//  15 Nov 2026. One copy of the test rules, the visit plan, the result
//  logic, coverage, the "Notes for the client" and the battery sums, so
//  aov-test.html and aov-report.html can never disagree about what a
//  result means. No Firebase in here and nothing is saved from here, so it
//  can be tested on its own. Change this file = bump CACHE_NAME.
//
//  The first rules version is Docs/aov-test-rules.md (agreed with Rob in
//  chat, 15 Nov 2026), from BS 7346-8:2013, BS 9999:2017 (Annexes I and P)
//  and BS 9991:2024 (Annex I, F.5, 21.2). Nothing counts as a Pass until a
//  Director approves a rules version (aovRules/{v}) AND the site's
//  equipment and scenarios (its "set-up") are approved. Until then results
//  are kept as "Unverified": the evidence is saved, QS decides.
// ═══════════════════════════════════════════════════════════════════════════
export const AOV_SHARED_VERSION = '1.0';

// ── Small helpers (same as gate-shared.js) ─────────────────────────────────
export const newId = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad2 = n => String(n).padStart(2, '0');
export const todayISO = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const longDate = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
export const shortDate = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
export const monthLabel = ym => { if (!ym) return ''; const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };
export const timeLabel = iso => { if (!iso) return ''; const d = new Date(iso); let h = d.getHours(); const m = d.getMinutes(), ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + (m ? ':' + pad2(m) : '') + ap; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clone = o => JSON.parse(JSON.stringify(o));
export const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
export const fmt = (n, dp = 0) => n == null || isNaN(n) ? '' : Number(n).toFixed(dp);
export function addMonths(ym, n) { const [y, m] = ym.split('-').map(Number); const t = (y * 12 + (m - 1)) + n; return `${Math.floor(t / 12)}-${pad2((t % 12) + 1)}`; }
export const monthOf = iso => String(iso).slice(0, 7);
export const dueMonthFrom = (basisDate, intervalMonths) => addMonths(monthOf(basisDate), Number(intervalMonths));
export function dueState(dueMonth, today = todayISO()) {
  if (!dueMonth) return 'none';
  if (today >= addMonths(dueMonth, 1) + '-01') return 'overdue';
  return monthOf(today) === dueMonth ? 'due' : 'ok';
}
export const addYears = (iso, y) => { if (!iso) return null; const [a, b, c] = String(iso).slice(0, 10).split('-').map(Number); return `${a + Math.floor(y)}-${pad2(b)}-${pad2(c)}`; };

// ── Visit types (Rob, 15 Nov: after a fire and modification added) ────────
export const VISIT_TYPES = {
  service:       { label: 'Periodic service',            title: 'AOV Service Report' },
  takeover:      { label: 'First visit (taking it over)', title: 'AOV Takeover Inspection Report' },
  commissioning: { label: 'New installation (commissioning)', title: 'AOV Commissioning Report' },
  replacement:   { label: 'After replacing equipment',    title: 'AOV Post-Replacement Test Report' },
  modification:  { label: 'After a modification',         title: 'AOV Modification Test Report' },
  afterFire:     { label: 'After a fire',                 title: 'AOV Inspection After a Fire' }
};
export const PARTIAL_TYPES = ['replacement', 'modification'];   // only the affected equipment is planned

// ── Equipment ──────────────────────────────────────────────────────────────
// moves: it's an output that opens / releases in a scenario.
export const ASSET_TYPES = {
  roofVent:  { label: 'Roof vent', moves: true,  look: ['condition', 'path', 'fixings'] },
  velux:     { label: 'Roof window (Velux type)', moves: true, look: ['condition', 'path', 'fixings'] },
  window:    { label: 'Window AOV', moves: true, look: ['condition', 'path', 'fixings'] },
  stairVent: { label: 'Stair vent (head of stair)', moves: true, look: ['condition', 'path', 'fixings'] },
  shaftDoor: { label: 'Shaft door (landing)', moves: true, look: ['condition', 'seals', 'fixings'] },
  damper:    { label: 'Smoke damper', moves: true, look: ['condition', 'seals', 'fixings'] },
  inlet:     { label: 'Air inlet (automatic)', moves: true, look: ['condition', 'path', 'fixings'] },
  actuator:  { label: 'Actuator', moves: false, look: ['condition', 'fixings'] },
  maglock:   { label: 'Magnetic lock / hold', moves: false, look: ['condition', 'fixings'] },
  closer:    { label: 'Opening closer', moves: false, look: ['condition', 'fixings'] },
  panel:     { label: 'Control panel', moves: false, look: ['condition', 'labels'] },
  psu:       { label: 'Power supply / battery box', moves: false, look: ['condition', 'labels'] },
  detector:  { label: 'Smoke / heat detector', moves: false, look: ['ident'] },
  manual:    { label: 'Manual control / break glass', moves: false, look: ['ident', 'reach'] },
  frs:       { label: 'Fire service switch', moves: false, look: ['ident', 'reach'] },
  interface: { label: 'Fire alarm interface', moves: false, look: ['ident'] },
  other:     { label: 'Other', moves: false, look: ['condition'] }
};
export const typeLabel = t => (ASSET_TYPES[t] || {}).label || t || '';
export const LOOK_ITEMS = {
  condition: 'In good condition (no damage)',
  path:      'Nothing in the way of it opening',
  fixings:   'Fixings secure',
  seals:     'Seals OK',
  labels:    'Labelled',
  ident:     'Device ID and location match the list',
  reach:     'Labelled and easy to reach'
};
export const MOVING_ITEMS = {
  heldBefore: 'It was held shut before the test',
  linkage:    'Linkage and fixings secure while it moved',
  actuator:   'It moved smoothly (no sticking or strain)',
  travel:     'It opened all the way'
};
export const HOLD_METHODS = ['Actuator holds it shut', 'Mag lock', 'Damper motor', 'Latch / other', 'Not known'];
export const OPEN_METHODS = ['Actuator', 'Opening closer (spring)', 'Damper motor', 'Gravity / other', 'Not known'];
export const INPUT_TYPES = ['Smoke / heat detector', 'Fire alarm signal', 'Manual control / break glass', 'Fire service switch', 'Other'];
export const METHODS = {
  endToEnd: 'Set off the real device (end to end)',
  local:    'Simulated at the panel only',
  notTested: 'Interface not tested'
};
export const EXPECT = { open: 'Opens', closed: 'Stays shut' };   // expected state per linked asset

export function movingChecksFor(asset) {
  const k = ['linkage', 'actuator', 'travel'];
  if (asset && asset.holdMethod === 'Mag lock') k.unshift('heldBefore');
  return k;
}
// BS 9991:2024 F.5.2.3.2 notes 2 and 3 (agreed 15 Nov: a note, not a fail)
export function clientNoteForAsset(a) {
  if (!a || a.status === 'retired') return null;
  const name = `${typeLabel(a.type)} ${a.ref || ''}${a.location ? ' (' + a.location + ')' : ''}`.trim();
  if (a.holdMethod === 'Mag lock') return `${name} is held shut by a magnetic lock. BS 9991:2024 (F.5.2.3.2) says magnetic holds on smoke vents have been shown to fail in a fire and are not acceptable. We recommend the building owner reviews this with their fire risk assessor.`;
  if (a.type === 'shaftDoor' && a.openMethod === 'Opening closer (spring)') return `${name} is an ordinary door made to open by an added closer or actuator. BS 9991:2024 (F.5.2.3.2) says adding actuators to other parts to "make" a smoke vent is not acceptable, as it has not been performance tested. We recommend the building owner reviews this with their fire risk assessor.`;
  return null;
}

// ── The first rules version (Docs/aov-test-rules.md) ───────────────────────
export const DEFAULT_RULES = {
  source: 'AOV test rules v1 (Docs/aov-test-rules.md, agreed with Rob 15 Nov 2026): BS 7346-8:2013, BS 9999:2017 Annexes I and P, BS 9991:2024 Annex I, F.5 and 21.2.',
  timings: { systemS: 90, openS: 60 },           // BS 7346-8 6.6 and note 3
  intervalMonths: 12,                            // BS 9999 / BS 9991 Annex I (annual by a competent person)
  battery: { standbyH: 72, factor: 1.25, defaultLifeYears: 4, recharge: '80% in 12 h, full in 24 h (check against the charger spec)' },
  reviewList: [
    'The checks before testing (A) match what we do on site.',
    'The look-only checks (B) and the moving checks during scenarios (C) are right for the equipment we look after.',
    'Defaults of 90 s (system working) and 60 s (doors, dampers and inlets open) are right (BS 7346-8 6.6). Sites can change them.',
    'The power and fault checks (D) match the panels we look after. Voltage alone never gives a pass.',
    'Battery figures: 72 h standby then a full fire operation; x1.25 end-of-life allowance; recharge 80% in 12 h and full in 24 h (BS 9991:2024 21.2, written for UPS supplies, used here for AOV panels).',
    'If a battery label gives no maker\'s life, flag it at 4 years from the date fitted (our own figure, not a standard).',
    'A full service every 12 months by default (QS can set 6).',
    'The report wording at the end of the PDF is right.'
  ],
  reportWording: 'We tested the system against the operating sequence documented at the initial visit, reviewed against the available site records listed in this report. The results apply to the equipment and functions tested, subject to the stated limitations. System design and design compliance are outside the scope of this report.',
  instructions: {
    pre_panel: 'Look at the AOV panel before you touch anything. It should show normal with no faults. If it shows a fault, write it down before you start.',
    pre_logbook: 'Is the site\'s logbook on site?',
    pre_contact: 'Is the maintenance company name and phone number displayed at the panel?',
    pre_isolator: 'Does the AOV supply have its own isolator, labelled, and secured so it can\'t be switched off by accident?',
    pre_told: 'Have you told everyone who needs to know before testing: the site contact, the fire alarm company and the ARC?',
    look: 'Look only. Don\'t operate it yet: that happens in the scenarios.',
    scenario: 'Set off the trigger shown, using the method in the plan. Watch every item listed. Then reset.',
    comfort: 'With comfort ventilation open, send a fire signal. The fire signal should take over.',
    power: 'Use the panel maker\'s method. Voltage alone never shows a battery is good.',
    restore: 'Put everything back to normal before you leave: openings, panel, isolations removed, fire alarm, ARC and any other links back on.',
    docs: 'Which documents are on site or have been given to us?',
    inlets: 'Count the air inlets and vents and compare with the design. Measure the free area on one of each size.',
    currents: 'Measure the real current in standby and in fire mode (all outputs driving).',
    bldg: 'Look for building changes that could stop the system working: new partitions, blocked inlets, things stored in front of vents.',
    links: 'Test the circuits outside the AOV system that link to it (for example the fire alarm interface).',
    change: 'Record what was changed and the old and new equipment.'
  }
};

// ── The plan: every check this visit needs (rules v1, groups A to H) ───────
// A check is { key, kind, group, title, sub, systemId?, assetId?, scenarioId?, supplyId? }.
// Keys never contain dots or slashes (they are part of Firestore ids).
// A "no" to these fails; a "no" to the logbook or the contact sign is a Note for the client.
export const PRE_FAIL = ['pre_panel', 'pre_isolator', 'pre_told'];
const PRE = [['pre_panel', 'Panel shows normal'], ['pre_logbook', 'Logbook on site'], ['pre_contact', 'Maintenance contact at the panel'], ['pre_isolator', 'Own isolator, labelled and secured'], ['pre_told', 'Everyone told before testing']];
export const activeAssets = site => (site.assets || []).filter(a => a.status !== 'retired');
export const systemName = (site, id) => { const s = (site.systems || []).find(x => x.id === id); if (!s) return ''; const b = (site.blocks || []).find(x => x.id === s.blockId); return (b ? b.name + ' · ' : '') + s.name; };
export const assetName = a => `${typeLabel(a.type)}${a.ref ? ' ' + a.ref : ''}`;
export function scopeSystems(site, visit) {
  const all = (site.systems || []).map(s => s.id);
  const sc = (visit && visit.scope && visit.scope.systems) || [];
  return sc.length ? all.filter(id => sc.includes(id)) : all;
}
export function buildPlan(site, visit) {
  const type = visit.visitType, out = [], sys = scopeSystems(site, visit);
  const partial = PARTIAL_TYPES.includes(type);
  const affA = new Set((visit.change && visit.change.assets) || []), affS = new Set((visit.change && visit.change.scenarios) || []);
  const inScopeA = a => sys.includes(a.systemId) && (!partial || affA.has(a.id));
  const scenarios = (site.scenarios || []).filter(s => sys.includes(s.systemId) && !s.retired && (!partial || affS.has(s.id) || Object.keys(s.expected || {}).some(id => affA.has(id))));
  // H: what changed (first, so the plan follows it)
  if (partial) out.push({ key: 'chg_record', kind: 'change', group: 'Start', title: 'What was changed' });
  // A: before testing
  PRE.forEach(([k, t]) => out.push({ key: k, kind: 'pre', group: 'Before testing', title: t }));
  // F: takeover and commissioning
  if (type === 'takeover' || type === 'commissioning') {
    out.push({ key: 'doc_check', kind: 'docs', group: 'Before testing', title: 'Site documents' });
    out.push({ key: 'bldg_change', kind: 'bldg', group: 'Before testing', title: 'Building changes' });
  }
  // B: look only, one asset at a time
  activeAssets(site).filter(inScopeA).forEach(a => out.push({ key: 'look_' + a.id, kind: 'look', group: 'Look checks', title: assetName(a), sub: [systemName(site, a.systemId), a.location].filter(Boolean).join(' · '), assetId: a.id, systemId: a.systemId }));
  // C: one scenario at a time
  scenarios.forEach(s => out.push({ key: 'sc_' + s.id, kind: 'scenario', group: 'Scenarios', title: s.name || 'Scenario', sub: systemName(site, s.systemId), scenarioId: s.id, systemId: s.systemId }));
  (site.systems || []).filter(s => sys.includes(s.id) && s.comfortVent && !partial).forEach(s => out.push({ key: 'comfort_' + s.id, kind: 'comfort', group: 'Scenarios', title: 'Fire signal overrides comfort ventilation', sub: systemName(site, s.id), systemId: s.id }));
  // D: power, one supply at a time
  const supplies = (site.supplies || []).filter(p => !p.retired && (p.systems || []).some(id => sys.includes(id)) && (!partial || (visit.change && (visit.change.supplies || []).includes(p.id)) || (p.systems || []).some(id => scenarios.some(s => s.systemId === id))));
  supplies.forEach(p => out.push({ key: 'pw_' + p.id, kind: 'power', group: 'Power and faults', title: p.name || 'Power supply', supplyId: p.id }));
  if (type === 'takeover' || type === 'commissioning') {
    supplies.forEach(p => out.push({ key: 'cur_' + p.id, kind: 'currents', group: 'Power and faults', title: 'Measured currents: ' + (p.name || 'supply'), supplyId: p.id }));
    supplies.forEach(p => out.push({ key: 'calc_' + p.id, kind: 'calc', group: 'Power and faults', title: 'Battery suitability: ' + (p.name || 'supply'), supplyId: p.id }));
    sys.forEach(id => out.push({ key: 'inl_' + id, kind: 'inlets', group: 'Look checks', title: 'Inlets and vent area', sub: systemName(site, id), systemId: id }));
  }
  if (type === 'afterFire') out.push({ key: 'fire_links', kind: 'links', group: 'Power and faults', title: 'Circuits linked to the AOV system' });
  // E: restoration, each system
  sys.forEach(id => out.push({ key: 'rs_' + id, kind: 'restore', group: 'Restoration', title: 'Put back to normal', sub: systemName(site, id), systemId: id }));
  return out;
}

// ── Results ────────────────────────────────────────────────────────────────
// A result is a Firestore doc in aovResults, id `${visitId}__${key}`.
// Retests are `${visitId}__${key}__rt${n}` with retestOf = key. A failed
// result is never changed or replaced (spec): a retest is added next to it.
export const RESULT = { pass: 'Pass', fail: 'Fail', nottested: 'Not tested', unverified: 'Unverified', pending: 'Pending', incomplete: 'Incomplete' };
const yes = v => v === 'yes', no = v => v === 'no';
// What the engineer still has to answer (empty = complete)
export function missingInResult(check, r, site) {
  const m = []; if (!r) return ['Not started'];
  if (r.cant) { if (!String(r.cantWhy || '').trim()) m.push('Say why it could not be done'); return m; }
  switch (check.kind) {
    case 'pre': if (!r.answer) m.push('Answer the question'); else if (no(r.answer) && PRE_FAIL.includes(check.key) && !String(r.note || '').trim()) m.push('Say what you found'); break;
    case 'look': { const a = (site.assets || []).find(x => x.id === check.assetId) || {}; ((ASSET_TYPES[a.type] || {}).look || ['condition']).forEach(k => { const v = (r.items || {})[k]; if (!v) m.push('Answer: ' + LOOK_ITEMS[k]); else if (v === 'bad' && !String((r.notes || {})[k] || '').trim()) m.push('Say what is wrong: ' + LOOK_ITEMS[k]); }); break; }
    case 'scenario': {
      const s = (site.scenarios || []).find(x => x.id === check.scenarioId) || {};
      if (!r.method) m.push('Say how it was set off');
      if (r.method === 'notTested') { if (!String(r.note || '').trim()) m.push('Say why the interface was not tested'); break; }
      Object.entries(s.expected || {}).forEach(([aid, exp]) => {
        const o = (r.outputs || {})[aid] || {}, a = (site.assets || []).find(x => x.id === aid);
        if (!a || a.status === 'retired') return;
        if (!o.state) m.push(`Say what ${assetName(a)} did`);
      });
      if (!r.within90) m.push('Fully working within the time?');
      if (hasOpenings(s) && !r.within60) m.push('Doors, dampers and inlets open within the time?');
      if (!r.panelFire) m.push('Panel showed fire?');
      if ((s.indications || '').trim() && !r.indications) m.push('Did the other outputs happen?');
      if (!r.reset) m.push('Did everything reset?');
      if (r.reset === 'no' && !String(r.resetNote || '').trim()) m.push('Say what did not reset');
      break;
    }
    case 'comfort': if (!r.answer) m.push('Answer the question'); break;
    case 'power': ['mainsOff', 'onBattery', 'mainsBack', 'faultMains', 'faultBattery', 'faultActuator', 'label'].forEach(k => { if (!r[k]) m.push('Answer: ' + POWER_Q[k]); }); if (!(r.readings || []).some(x => x && x.v != null && x.v !== '')) m.push('Record the battery readings'); break;
    case 'currents': if (num(r.standbyA) == null || num(r.fireA) == null) m.push('Enter both currents'); break;
    case 'calc': break;   // checked from the supply record (calcMissing)
    case 'inlets': if (!r.countMatches) m.push('Do the numbers match the design?'); if (r.countMatches === 'no' && !String(r.note || '').trim()) m.push('Say what is different'); break;
    case 'docs': DOCS.forEach(([k]) => { if (!(r.items || {})[k]) m.push('Answer: ' + DOC_LABEL[k]); }); break;
    case 'bldg': if (!r.answer) m.push('Answer the question'); else if (yes(r.answer) && !String(r.note || '').trim()) m.push('Say what has changed'); break;
    case 'links': if (!r.answer) m.push('Answer the question'); break;
    case 'restore': if (!r.restored) m.push('Is everything back to normal?'); else if (no(r.restored)) { if (!String(r.what || '').trim()) m.push('Say what is not restored'); if (!String(r.state || '').trim()) m.push('Say the state it is left in'); if (!r.rangOffice) m.push('Ring the office and record it'); if (r.agreed && !String(r.agreedWith || '').trim()) m.push('Who agreed to leave it unrestored?'); } break;
    case 'change': if (!String(r.what || '').trim()) m.push('Say what was changed'); break;
  }
  return m;
}
export const POWER_Q = {
  mainsOff: 'Mains off: battery took over straight away and the panel showed the mains fault',
  onBattery: 'With mains off, a full fire scenario still worked on battery',
  mainsBack: 'Mains back on: panel back to normal and showing charging',
  faultMains: 'Fault shown for mains failure',
  faultBattery: 'Fault shown for battery disconnected',
  faultActuator: 'Fault shown for an open circuit to an actuator',
  faultInput: 'Fault shown for the detector / input line (if the panel monitors it)',
  label: 'Batteries labelled with the date fitted or replaced'
};
export const DOCS = [['asFitted', 'As-fitted drawings'], ['om', 'Operation and maintenance manual'], ['ce', 'Cause-and-effect'], ['certs', 'Certificates (design, installation, commissioning)'], ['logbook', 'Logbook']];
export const DOC_LABEL = Object.fromEntries(DOCS);
function hasOpenings(s) { return Object.values(s.expected || {}).some(v => v === 'open'); }

// The result of one check. ctx: { site, rulesApproved, setupApproved, visit }
export function evaluate(check, r, ctx) {
  const site = ctx.site;
  if (!r) return { state: 'pending', why: '' };
  if (r.cant) return String(r.cantWhy || '').trim() ? { state: 'nottested', why: r.cantWhy } : { state: 'incomplete', why: 'Reason missing' };
  const miss = missingInResult(check, r, site);
  if (miss.length) return { state: 'incomplete', why: miss[0], missing: miss };
  let fail = [], unv = [], noted = '';
  switch (check.kind) {
    case 'pre': if (no(r.answer) && !PRE_FAIL.includes(check.key)) noted = 'See Notes for the client'; if (no(r.answer) && PRE_FAIL.includes(check.key)) fail.push({ pre_panel: 'Panel was not normal before testing', pre_isolator: 'The AOV supply has no labelled, secured isolator', pre_told: 'Testing started without telling everyone first' }[check.key] + (r.note ? ': ' + r.note : '')); break;
    case 'look': Object.entries(r.items || {}).forEach(([k, v]) => { if (v === 'bad') fail.push(LOOK_ITEMS[k] + ': ' + ((r.notes || {})[k] || '')); }); break;
    case 'scenario': {
      const s = (site.scenarios || []).find(x => x.id === check.scenarioId) || {};
      if (r.method === 'notTested') return { state: 'nottested', why: 'Interface not tested: ' + (r.note || '') };
      Object.entries(s.expected || {}).forEach(([aid, exp]) => {
        const o = (r.outputs || {})[aid] || {}, a = (site.assets || []).find(x => x.id === aid); if (!a || a.status === 'retired') return;
        if (exp === 'open' && o.state !== 'opened') fail.push(`${assetName(a)} did not open fully`);
        if (exp === 'closed' && o.state !== 'stayed') fail.push(`${assetName(a)} opened when it should have stayed shut`);
        Object.entries(o.moving || {}).forEach(([k, v]) => { if (v === 'bad') fail.push(`${assetName(a)}: ${MOVING_ITEMS[k]} — not OK`); });
      });
      (r.unexpected || []).forEach(u => fail.push(`${u} opened unexpectedly`));
      if (no(r.within90)) fail.push('Not fully working within the time');
      if (no(r.within60)) fail.push('Doors / dampers / inlets not open within the time');
      if (no(r.panelFire)) fail.push('Panel did not show fire');
      if (no(r.indications)) fail.push('Other outputs did not happen');
      if (no(r.reset)) fail.push('Did not reset: ' + (r.resetNote || ''));
      if (r.method === 'local') unv.push('Simulated at the panel only, not end to end');
      if (!ctx.setupApproved && !(ctx.visit && ctx.visit.baselineDecision)) unv.push('The expected sequence for this site is not approved yet');
      break;
    }
    case 'comfort': if (no(r.answer)) fail.push('Comfort ventilation did not give way to the fire signal'); break;
    case 'power': {
      Object.keys(POWER_Q).forEach(k => { if (no(r[k])) fail.push(POWER_Q[k]); });
      const p = (site.supplies || []).find(x => x.id === check.supplyId) || {};
      const lim = num(p.minVolts);
      if (lim == null) unv.push('No maker\'s battery limit recorded for this supply');
      else (r.readings || []).forEach((x, i) => { const v = num(x && x.v); if (v != null && v < lim) fail.push(`Battery ${i + 1}: ${v} V is below the maker's limit of ${lim} V`); });
      const age = batteryAge(p, ctx.rules); if (age.state === 'over') fail.push(`Batteries past their replace-by date (${shortDate(age.replaceBy)})`);
      if (!(p.batteries && p.batteries.count)) fail.push('No batteries recorded for this supply');
      break;
    }
    case 'currents': break;
    case 'calc': { const c = batteryCalc((site.supplies || []).find(x => x.id === check.supplyId), ctx.rules); if (c.missing.length) return { state: 'incomplete', why: 'Calculation missing: ' + c.missing[0], missing: c.missing.map(x => 'Calculation: ' + x) }; if (!c.ok) fail.push(`Batteries too small: need ${fmt(c.needAh, 1)} Ah, fitted ${fmt(c.bankAh, 1)} Ah`); break; }
    case 'inlets': if (no(r.countMatches)) fail.push('Inlets / vents differ from the design: ' + (r.note || '')); { const d = num(r.designArea), m = num(r.measuredArea); if (d != null && m != null && m < d) fail.push(`Measured free area ${m} m² is less than the design ${d} m²`); if (d == null) unv.push('No design free area to compare with'); } break;
    case 'docs': if (Object.values(r.items || {}).includes('no')) noted = 'See Notes for the client'; break;   // missing documents become a Note for the client, not a fail
    case 'bldg': if (yes(r.answer)) noted = 'See Notes for the client'; break;   // a building change becomes a Note for the client
    case 'links': if (no(r.answer)) fail.push('A linked circuit did not work'); break;
    case 'restore': if (no(r.restored)) fail.push('Not restored: ' + (r.what || '')); break;
    case 'change': break;
  }
  if (fail.length) return { state: 'fail', why: fail.join('; '), fails: fail };
  if (!ctx.rulesApproved) unv.push('The test rules are not approved yet');
  if (unv.length) return { state: 'unverified', why: unv.join('; ') };
  return { state: 'pass', why: noted };
}
// Original + retests for one key: the latest retest decides, the original fail is kept.
export function resultsFor(key, results) {
  const orig = results[key] || null;
  const rts = Object.values(results).filter(x => x && x.retestOf === key).sort((a, b) => (a.n || 0) - (b.n || 0));
  return { orig, retests: rts, latest: rts.length ? rts[rts.length - 1] : orig };
}
export function evaluateAll(plan, results, ctx) {
  const rows = plan.map(c => {
    const g = resultsFor(c.key, results), ev = evaluate(c, g.latest, ctx);
    const origEv = g.orig && g.retests.length ? evaluate(c, g.orig, ctx) : null;
    return { check: c, ...g, ev, origEv };
  });
  const count = s => rows.filter(x => x.ev.state === s).length;
  const tally = { pass: count('pass'), fail: count('fail'), nottested: count('nottested'), unverified: count('unverified'), pending: count('pending') + count('incomplete'), total: rows.length };
  return { rows, tally, overall: overallOf(tally, rows, ctx) };
}
// Never a full pass unless every check passed and everything is restored.
export function overallOf(t, rows, ctx) {
  const unrestored = rows.some(x => x.check.kind === 'restore' && x.latest && x.latest.restored === 'no');
  if (t.fail) return { label: 'Fail', cls: 'bad', text: `${t.fail} check${t.fail > 1 ? 's' : ''} failed.` + (t.pending + t.nottested ? ` ${t.pending + t.nottested} not done.` : '') + (unrestored ? ' Not everything was put back to normal.' : '') };
  if (t.pending || t.nottested) return { label: 'Incomplete', cls: 'warn', text: `${t.pending + t.nottested} check${t.pending + t.nottested > 1 ? 's' : ''} not done.` };
  if (t.unverified) return { label: 'Unverified', cls: 'warn', text: `${t.unverified} check${t.unverified > 1 ? 's' : ''} recorded without approved criteria. QS decides.` };
  return { label: 'Pass', cls: 'good', text: 'Every check in the plan passed.' };
}

// ── Coverage for the schedule (spec: completed coverage is not pass status)
export function coverage(site, plan, rows) {
  const by = {};
  activeAssets(site).forEach(a => by[a.id] = { asset: a, total: 0, done: 0, failed: 0, blocked: 0, pending: 0, keys: [] });
  const add = (aid, row, failedHere) => { const c = by[aid]; if (!c) return; c.total++; c.keys.push(row.check.key); const s = row.ev.state; if (s === 'pending' || s === 'incomplete') c.pending++; else { c.done++; if (failedHere) c.failed++; if (s === 'nottested') c.blocked++; } };
  rows.forEach(row => {
    const c = row.check, r = row.latest;
    if (c.kind === 'look') add(c.assetId, row, row.ev.state === 'fail');
    if (c.kind === 'scenario') {
      const s = (site.scenarios || []).find(x => x.id === c.scenarioId) || {};
      // an asset only counts as failed if its own part went wrong
      Object.entries(s.expected || {}).forEach(([aid, exp]) => { const o = ((r && r.outputs) || {})[aid] || {}; const bad = row.ev.state === 'fail' && ((exp === 'open' && o.state !== 'opened') || (exp === 'closed' && o.state !== 'stayed') || Object.values(o.moving || {}).includes('bad')); add(aid, row, bad); });
      if (s.inputAssetId && !(s.expected || {})[s.inputAssetId]) add(s.inputAssetId, row, row.ev.state === 'fail' && r && (r.panelFire === 'no'));
    }
  });
  // missing set-up: an active moving asset with no scenario
  Object.values(by).forEach(c => { c.unmapped = !!(ASSET_TYPES[c.asset.type] || {}).moves && !(site.scenarios || []).some(s => !s.retired && (s.expected || {})[c.asset.id] === 'open'); });
  return by;
}

// ── Battery suitability and runtime (BS 9991:2024 21.2; Rob approved 15 Nov)
// Batteries in series add volts, not Ah. A bank of identical batteries in
// `strings` parallel strings has strings x Ah.
export function bankOf(p) {
  const b = (p && p.batteries) || {}, n = num(b.count) || 0, ah = num(b.ahEach), v = num(b.voltsEach), strings = Math.max(1, num(b.strings) || 1);
  if (!n || ah == null) return { ah: null, v: null };
  if (b.arrangement === 'parallel') return { ah: ah * n, v };
  if (b.arrangement === 'single' || n === 1) return { ah, v };
  // series (one string) or series-parallel
  const perString = Math.max(1, Math.round(n / strings));
  return { ah: ah * strings, v: v != null ? v * perString : null };
}
export function batteryCalc(p, rules) {
  const R = (rules && rules.battery) || DEFAULT_RULES.battery, missing = [];
  if (!p) return { missing: ['No supply'], ok: false };
  const sA = num(p.standbyA), fA = num(p.fireA), fMin = num(p.fireMinutes), standbyH = num(p.standbyH) ?? R.standbyH, factor = num(p.factor) ?? R.factor;
  const bank = bankOf(p);
  if (sA == null) missing.push('standby current (A)'); if (fA == null) missing.push('fire-mode current (A)'); if (fMin == null) missing.push('how long the fire operation runs (minutes)');
  if (bank.ah == null) missing.push('the batteries fitted (number and Ah)');
  if (!String(p.manualRef || '').trim()) missing.push('the panel manual or reference used');
  if (missing.length) return { missing, ok: false, bankAh: bank.ah, bankV: bank.v };
  const needAh = (sA * standbyH + fA * fMin / 60) * factor;
  const runtimeH = Math.max(0, (bank.ah / factor - fA * fMin / 60) / sA);
  return { missing, ok: bank.ah >= needAh, needAh, bankAh: bank.ah, bankV: bank.v, runtimeH, standbyH, factor, sA, fA, fMin };
}
export function batteryAge(p, rules) {
  const R = (rules && rules.battery) || DEFAULT_RULES.battery, b = (p && p.batteries) || {};
  if (!b.fittedDate) return { state: 'unknown', life: null };
  const life = num(b.makerLifeYears) ?? R.defaultLifeYears, fromMaker = num(b.makerLifeYears) != null;
  const replaceBy = addYears(b.fittedDate, life), today = todayISO();
  return { state: today >= replaceBy ? 'over' : (addMonths(monthOf(replaceBy), -3) + '-01' <= today ? 'soon' : 'ok'), replaceBy, life, fromMaker };
}

// ── Notes for the client (rule 32: built automatically) ────────────────────
export function clientNotes(site, plan, rows, extra) {
  const notes = [];
  activeAssets(site).forEach(a => { const n = clientNoteForAsset(a); if (n) notes.push({ auto: 'asset', text: n }); });
  rows.forEach(({ check: c, latest: r, ev }) => {
    if (!r) return;
    if (c.kind === 'docs') { const miss = DOCS.filter(([k]) => (r.items || {})[k] === 'no').map(([, t]) => t); if (miss.length) notes.push({ auto: 'docs', text: 'These documents were not available: ' + miss.join(', ') + '. BS 7346-8 (8.2) says they should be kept for the system.' }); }
    if (c.kind === 'pre' && c.key === 'pre_logbook' && r.answer === 'no') notes.push({ auto: 'logbook', text: 'There was no logbook on site. BS 7346-8 (9.3.1) recommends one is kept.' });
    if (c.kind === 'pre' && c.key === 'pre_contact' && r.answer === 'no') notes.push({ auto: 'contact', text: 'The maintenance company\'s name and number are not displayed at the panel (BS 7346-8 9.3.2).' });
    if (c.kind === 'bldg' && r.answer === 'yes') notes.push({ auto: 'bldg', text: 'Building changes that could affect the smoke ventilation: ' + (r.note || '') });
    if (c.kind === 'inlets' && ev.state === 'fail') notes.push({ auto: 'inlets', text: ev.why });
    if (c.kind === 'currents') { const p = (site.supplies || []).find(x => x.id === c.supplyId) || {}; const ds = num(p.designStandbyA), df = num(p.designFireA); if ((ds != null && num(r.standbyA) > ds) || (df != null && num(r.fireA) > df)) notes.push({ auto: 'currents', text: `Measured currents on ${p.name || 'the supply'} are higher than the design figures.` }); }
    if (ev.state === 'fail' && !['inlets'].includes(c.kind)) notes.push({ auto: 'fail', text: `${c.title}${c.sub ? ' (' + c.sub + ')' : ''}: ${ev.why}` });
    if (ev.state === 'unverified') notes.push({ auto: 'unverified', text: `${c.title}${c.sub ? ' (' + c.sub + ')' : ''}: not verified (${ev.why}).` });
    if (ev.state === 'nottested') notes.push({ auto: 'nottested', text: `${c.title}${c.sub ? ' (' + c.sub + ')' : ''}: could not be tested (${ev.why}).` });
  });
  (extra || []).forEach(t => { if (String(t || '').trim()) notes.push({ auto: '', text: t }); });
  const seen = new Set(); return notes.filter(n => { if (seen.has(n.text)) return false; seen.add(n.text); return true; });
}

// ── Site set-up checks (before it can go to QS) ────────────────────────────
export function setupGaps(site) {
  const gaps = [], flags = [];
  if (!(site.systems || []).length) gaps.push('Add at least one system or riser.');
  if (!activeAssets(site).length) gaps.push('Add the equipment.');
  activeAssets(site).forEach(a => { if (!a.systemId) gaps.push(`${assetName(a)}: choose its system.`); if (!a.location) gaps.push(`${assetName(a)}: say where it is.`); });
  if (!(site.scenarios || []).filter(s => !s.retired).length) gaps.push('Add at least one scenario (what sets it off and what should happen).');
  (site.scenarios || []).filter(s => !s.retired).forEach(s => { if (!String(s.inputRef || '').trim() && !String(s.inputLocation || '').trim()) gaps.push(`${s.name || 'A scenario'}: say which device sets it off.`); if (!Object.values(s.expected || {}).some(v => v === 'open')) gaps.push(`${s.name || 'A scenario'}: choose what should open.`); });
  activeAssets(site).filter(a => (ASSET_TYPES[a.type] || {}).moves).forEach(a => { if (!(site.scenarios || []).some(s => !s.retired && (s.expected || {})[a.id] === 'open')) flags.push(`${assetName(a)} is not opened by any scenario.`); if (a.type === 'shaftDoor' && (!a.holdMethod || a.holdMethod === 'Not known')) flags.push(`${assetName(a)}: how it is held shut is not known.`); });
  activeAssets(site).forEach(a => { const n = clientNoteForAsset(a); if (n) flags.push(n); });
  if (!(site.supplies || []).filter(p => !p.retired).length) flags.push('No power supply recorded.');
  return { gaps, flags };
}
export function nextRef(sites) { let n = 1; const used = new Set(sites.map(s => s.siteRef)); while (used.has(`SW-AOV-${pad2(n)}`)) n++; return `SW-AOV-${pad2(n)}`; }
export const reportRef = (visit, n) => `AOV-${visit.siteRef}-${String(visit.date || '').replace(/-/g, '')}${n > 1 ? '-R' + n : ''}`;
