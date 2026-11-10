// ═══════════════════════════════════════════════════════════════════════════
//  gate-shared.js — gates & doors: the logic both gate pages use   v1.0
//  9 Nov 2026. One copy of the rules engine, the question sets, the
//  due-month sums and the small helpers, so gate-test.html and
//  gate-report.html can never disagree about what a reading means.
//  No Firebase in here and nothing is saved from here, so it can be tested
//  on its own. Change this file = bump CACHE_NAME in service-worker.js.
//
//  What is NOT in here on purpose: pass/fail judgements are only ever made
//  against a rules version that management has approved (gateRules/{v}).
//  Source for the first rules version: DHF TS013-1:2025 v5 (page numbers
//  are the document's printed pages). It stays "awaiting technical review"
//  until QS / management approve it in the reporting app.
// ═══════════════════════════════════════════════════════════════════════════
export const GATE_SHARED_VERSION = '1.0';

// ── What kinds of gate / door there are ────────────────────────────────────
// family: horizontal (sliding, swing, folding), barrier, vertical (roller,
// sectional). 'pedestrian' is kept in the register only: no assessment route.
export const TYPES = {
  'slide-single': { label: 'Single sliding gate', family: 'horizontal', leaves: 1, branch: 'slide' },
  'slide-double': { label: 'Double sliding gate', family: 'horizontal', leaves: 2, branch: 'slide' },
  'swing-single': { label: 'Single swing gate', family: 'horizontal', leaves: 1, branch: 'swing' },
  'swing-double': { label: 'Double swing gate', family: 'horizontal', leaves: 2, branch: 'swing' },
  'folding':      { label: 'Folding gate', family: 'horizontal', leaves: 1, branch: 'folding' },
  'barrier':      { label: 'Rising-arm barrier', family: 'barrier', leaves: 1, branch: 'barrier' },
  'roller':       { label: 'Roller shutter', family: 'vertical', leaves: 1, branch: 'roller' },
  'sectional':    { label: 'Sectional overhead door', family: 'vertical', leaves: 1, branch: 'sectional' },
  'pedestrian':   { label: 'Pedestrian entrance door (later module)', family: 'pedestrian', leaves: 1, branch: 'pedestrian', unsupported: true }
};
export const typeLabel = t => (TYPES[t] || {}).label || t || '';
export const leafList = inst => {
  const t = TYPES[inst.type] || {};
  if (Array.isArray(inst.leaves) && inst.leaves.length) return inst.leaves;
  return t.leaves === 2 ? [{ id: 'L1', label: 'Left-hand leaf' }, { id: 'L2', label: 'Right-hand leaf' }] : [{ id: 'L1', label: t.family === 'barrier' ? 'Arm' : 'Leaf' }];
};

// ── Answer sets (spec §5): never one generic yes/no for everything ─────────
export const ANSWER_STATES = {
  confirmed: 'Confirmed',
  na: 'Not applicable (say why)',
  unable: 'Unable to establish (say why)',
  unsure: 'Unsure: needs QS review'
};
export const NOT_DONE_STATES = {
  na: 'Not applicable', notTested: 'Not tested', notAccessible: 'Not accessible', unsafe: 'Unsafe to test', unknown: 'Unknown'
};
export const TASK_OUTCOMES = { done: 'Completed', notRequired: 'Not required (say why)', unable: 'Unable to complete (say why)' };
export const PROTECTION = {
  design: 'Safe design: clearance or guarding',
  holdtorun: 'Hold-to-run',
  force: 'Force limitation',
  noncontact: 'Non-contact presence detection',
  none: 'None / not sure'
};
export const STATUS_FLOW = ['Draft', 'Submitted', 'In review', 'Returned', 'Approved'];
export const INTERVALS = [{ v: 3, t: '3 months' }, { v: 6, t: '6 months' }, { v: 12, t: '12 months' }];

// ── Setup questions (spec §5 core sequence + §6 type branches) ─────────────
// kind: text | choice | yn | num | multi.  Every one gets an answer state
// (confirmed / not applicable / unable / unsure) in the page.
export const BRANCH_QUESTIONS = {
  slide: [
    { id: 'tracked', label: 'Is it a tracked gate or a cantilever gate?', kind: 'choice', options: ['Tracked', 'Cantilever', 'Other'] },
    { id: 'runback', label: 'Can anyone reach the runback area (where the gate slides to)?', kind: 'yn' },
    { id: 'postsFences', label: 'Describe the posts and fences the gate passes (gaps, mesh, how close).', kind: 'text' },
    { id: 'reachThrough', label: 'Can someone reach through the gate or fence to the moving parts?', kind: 'yn' },
    { id: 'guideRollers', label: 'Describe the guide rollers and how they are covered.', kind: 'text' },
    { id: 'rackPinion', label: 'Is there a rack and pinion? Is the drive covered?', kind: 'text' },
    { id: 'travelStops', label: 'Are there travel stops at both ends that stop the gate leaving its track?', kind: 'yn' },
    { id: 'retention', label: 'What stops the gate falling over or off if it fails (retention)?', kind: 'text' },
    { id: 'leafSpeeds', label: 'Speed of each leaf and what protects it.', kind: 'text' }
  ],
  swing: [
    { id: 'hinges', label: 'Describe each leaf\'s hinges and what holds the leaf on.', kind: 'text' },
    { id: 'hingeGaps', label: 'Gaps at the hinges as the leaf moves (reducing gaps).', kind: 'text' },
    { id: 'sweep', label: 'What does each leaf sweep across (walls, posts, cars, planters)?', kind: 'text' },
    { id: 'groundSlope', label: 'Is the ground under the leaf level, or are there slopes or kerbs?', kind: 'text' },
    { id: 'obstructions', label: 'Anything near the leaves that could trap or be hit?', kind: 'text' },
    { id: 'windExposure', label: 'Is the gate exposed to wind?', kind: 'choice', options: ['Sheltered', 'Some exposure', 'Very exposed'] },
    { id: 'stops', label: 'Are there open and closed stops?', kind: 'yn' },
    { id: 'overlap', label: 'Do the leaves overlap, and does one close before the other?', kind: 'text' }
  ],
  folding: [
    { id: 'sections', label: 'How many sections does it fold in?', kind: 'num' },
    { id: 'supportGuide', label: 'How is it supported and guided?', kind: 'text' },
    { id: 'foldJoints', label: 'Describe the hinges and fold joints.', kind: 'text' },
    { id: 'vGaps', label: 'Do V-shaped gaps open and close as it folds?', kind: 'yn' },
    { id: 'reachThrough', label: 'Can anyone reach through to the moving parts, or into the runback?', kind: 'yn' },
    { id: 'reversalNew', label: 'If it reverses, does the reversal make a new unprotected hazard?', kind: 'yn' }
  ],
  barrier: [
    { id: 'armLength', label: 'Arm length.', kind: 'text' },
    { id: 'pivotAccess', label: 'Can anyone reach the pivot or cabinet?', kind: 'yn' },
    { id: 'balance', label: 'How is the arm balanced (spring, counterweight)?', kind: 'text' },
    { id: 'skirt', label: 'Skirt fitted?', kind: 'choice', options: ['None', 'Fixed', 'Linked to the arm', 'Gravity (hangs free)'] },
    { id: 'pedRoute', label: 'Do pedestrians walk under or beside the arm?', kind: 'yn' },
    { id: 'vehicleControl', label: 'How are vehicles detected and controlled?', kind: 'text' }
  ],
  roller: [
    { id: 'curtain', label: 'Curtain, barrel and guides: describe them.', kind: 'text' },
    { id: 'suspension', label: 'Suspension and drive: describe them.', kind: 'text' },
    { id: 'manualOverride', label: 'How is it moved by hand if the power fails?', kind: 'text' },
    { id: 'fallBack', label: 'What stops it falling if the suspension fails (fall-back protection)?', kind: 'text' },
    { id: 'accessibleRoll', label: 'Can anyone reach the rolled-up curtain?', kind: 'yn' },
    { id: 'handFoot', label: 'Where could hands or feet be pulled in or lifted?', kind: 'text' },
    { id: 'fireFunction', label: 'Does it have a fire or smoke function?', kind: 'yn' }
  ],
  sectional: [
    { id: 'panels', label: 'Panels, hinges, tracks and rollers: describe them.', kind: 'text' },
    { id: 'cablesSprings', label: 'Cables, drums and springs: describe them and their protection.', kind: 'text' },
    { id: 'suspension', label: 'Suspension: describe it.', kind: 'text' },
    { id: 'fallBack', label: 'What stops it falling if the suspension fails (fall-back protection)?', kind: 'text' },
    { id: 'manualOp', label: 'How is it moved by hand?', kind: 'text' },
    { id: 'pinch', label: 'Where can fingers or hands be pinched, and can anyone reach them?', kind: 'text' }
  ]
};

export const SETUP_TOPICS = [
  { id: 'identity', title: '1. What is it?', intro: 'Name it, say what type it is and whether it is powered.',
    questions: [
      { id: 'construction', label: 'Construction (what it is made of, how heavy it looks).', kind: 'text' },
      { id: 'operation', label: 'Is it powered or moved by hand?', kind: 'choice', options: ['Powered', 'Manual'] },
      { id: 'dimensions', label: 'Approximate size (width, height).', kind: 'text' },
      { id: 'intendedUse', label: 'What is it used for?', kind: 'text' },
      { id: 'fireRated', label: 'Is it a fire or smoke resisting door or gate?', kind: 'yn', note: 'If yes, the fire-specific assessment is referred to QS. This report is not a fire door assessment.' }
    ] },
  { id: 'users', title: '2. Who uses it, and what is around it?', intro: 'People, vehicles and what is next to it.',
    questions: [
      { id: 'pedestrians', label: 'Could people on foot reasonably use or cross it?', kind: 'yn' },
      { id: 'vulnerable', label: 'Could children or vulnerable people be there?', kind: 'yn' },
      { id: 'traffic', label: 'What traffic uses it?', kind: 'choice', options: ['Cars', 'Vans and lorries', 'Mixed', 'No vehicles'] },
      { id: 'visibility', label: 'Can the person using it see the whole gate move?', kind: 'choice', options: ['Yes, all of it', 'Some of it', 'No'] },
      { id: 'surroundings', label: 'What is around it (walls, parking, road, pavement)?', kind: 'text' }
    ] },
  { id: 'modes', title: '3. How does it open and close?', intro: 'Say how it behaves, one mode at a time.',
    questions: [
      { id: 'openMode', label: 'How does it open (on a button, a fob, a timer)?', kind: 'text' },
      { id: 'closeMode', label: 'How does it close?', kind: 'text' },
      { id: 'autoClose', label: 'Does it close by itself after a time?', kind: 'yn' },
      { id: 'partialOpen', label: 'Is there a part-open (pedestrian) setting?', kind: 'yn' },
      { id: 'sequencing', label: 'If there are two leaves, does one move before the other?', kind: 'choice', options: ['No delay', 'One leaf delayed on opening', 'One leaf delayed on closing', 'Not applicable'] },
      { id: 'slowdown', label: 'Does it slow down before the last 500mm of travel?', kind: 'yn', note: 'This decides whether a full-speed force test is needed.' },
      { id: 'activation', label: 'What starts it?', kind: 'multi', options: ['Remote fob', 'Keypad', 'Push button', 'Intercom', 'Ground loop', 'Timer', 'Key switch', 'Other'] }
    ] }
];

// Hazards to start from, by type (DHF TS013-1 pages 9–14). The engineer
// confirms, renames, deletes or adds. mainEdge = the leading edge tests.
export const HAZARD_SEEDS = {
  slide: [
    { label: 'Crush at the closing edge (post or wall)', movement: 'closing', cls: 'crush', mainEdge: true },
    { label: 'Crush or impact at the opening edge', movement: 'opening', cls: 'crush', mainEdge: true },
    { label: 'Draw-in at the guide rollers', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Shear through the perimeter fence or mesh', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Impact anywhere in the swept area', movement: 'both', cls: 'impact', mainEdge: false },
    { label: 'Structure: retention and travel stops', movement: 'static', cls: 'structural', mainEdge: false }
  ],
  swing: [
    { label: 'Crush at the closing edge', movement: 'closing', cls: 'crush', mainEdge: true },
    { label: 'Crush or impact at the opening edge', movement: 'opening', cls: 'crush', mainEdge: true },
    { label: 'Crush at the hinges (reducing gaps)', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Crush under the leaf (feet)', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Impact anywhere in the swept area', movement: 'both', cls: 'impact', mainEdge: false },
    { label: 'Structure: hinges, leaf and wind', movement: 'static', cls: 'structural', mainEdge: false }
  ],
  folding: [
    { label: 'Trapping at the fold joints', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Crush at the closing edge', movement: 'closing', cls: 'crush', mainEdge: true },
    { label: 'Crush or impact at the opening edge', movement: 'opening', cls: 'crush', mainEdge: true },
    { label: 'Draw-in at supports and guides', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Structure: joints, supports and guides', movement: 'static', cls: 'structural', mainEdge: false }
  ],
  barrier: [
    { label: 'Impact or crush under the arm tip', movement: 'closing', cls: 'crush', mainEdge: true },
    { label: 'Crush at the pivot or skirt linkage', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Structure: arm, pivot and balance', movement: 'static', cls: 'structural', mainEdge: false }
  ],
  roller: [
    { label: 'Crush at the closing (bottom) edge', movement: 'closing', cls: 'crush', mainEdge: true },
    { label: 'Draw-in or lifting at guides and the roll', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Fall-back: curtain falling if suspension fails', movement: 'static', cls: 'structural', mainEdge: false }
  ],
  sectional: [
    { label: 'Crush at the closing (bottom) edge', movement: 'closing', cls: 'crush', mainEdge: true },
    { label: 'Pinching between panels and at the tracks', movement: 'both', cls: 'crush', mainEdge: false },
    { label: 'Fall-back: door falling if cables or springs fail', movement: 'static', cls: 'structural', mainEdge: false }
  ]
};

// The ten checks the old paper form had, as a starting servicing checklist.
// (Engineers propose changes; QS approves before the saved list changes.)
export const STARTER_TASKS = [
  'Check the internal sensors work',
  'Check the external sensors work',
  'Check the sensors for damage',
  'Check the safety edges work',
  'Check the safety edges for damage',
  'Check the fobs, keypad or push button work',
  'Check the ground loop works',
  'Grease the hinges, pivots or rollers named below',
  'Check the mechanical parts for wear and damage',
  'Check the electrical parts for damage'
];
export const DEVICE_KINDS = ['Photocell / sensor', 'Safety edge', 'Safety edge transmitter', 'Ground loop', 'Fob / keypad / push button', 'Intercom', 'Control panel', 'Isolator', 'Manual release', 'Beacon / light', 'Other'];

// ── Rules: the first version, from DHF TS013-1:2025 v5 ─────────────────────
// Everything here is DATA the reporting app can show, edit and version. It
// stays "awaiting review" (status 'Draft') until QS / management approve it,
// and no real force test can be started on an unapproved version.
export const DEFAULT_RULES = {
  schema: 1,
  source: 'DHF TS013-1:2025 v5, Code of Practice for Automated Gates, Traffic Barriers, Industrial & Garage Doors',
  limits: {
    fdCrush: 400,   // Fd: crush, shear and draw-in hazards (p36)
    fdImpact: 1400, // Fd: impact-only hazards (p36)
    td: 0.75,       // Td: seconds above 150N (p36)
    fs: 150,        // Fs: static force (p36)
    fe: 25          // Fe: end force (p36)
  },
  repeat: { trigger: 0.9, total: 3, note: 'Test each position once. If any measurement is over 90% of its maximum, repeat to three tests and use the average (p38).' },
  classification: {
    note: 'Maintenance defect classification (p55–56). Time-based limits (Fs / Fe held for a time) cannot be read straight from the tester\'s four numbers: QS maps them.',
    fdCrush: { requiresImprovement: [401, 500], safetyCritical: 500 },
    fdImpact: { requiresImprovement: [1401, 1750], safetyCritical: 1750 },
    td: { requiresImprovement: [0.76, 1], safetyCritical: 1 }
  },
  testMethods: {
    horizontal: [
      'Full speed: waist height, with an extension on the tester long enough to test full speed movement. Only needed where the gate slows down outside the last 500mm of travel (p39 to 40).',
      'With a 500mm extension, test at three heights: top (300mm from the top or 2.5m), middle (mid height or 1.5m), bottom (50mm up from the base).',
      'Re-test the point with the highest reading with no extension (50mm).',
      'Where opposing leaves are used, test in the centre where the leaves come together. Test in the mode the gate is used in (with the same leaf delay).'
    ],
    vertical: [
      'Full speed: centre of the door with an extension long enough to test full speed movement. Only needed where it slows down outside the last 300mm.',
      'With a 300mm extension: centre of the opening, and at each side 200mm in from the guides.',
      'Re-test the point of the highest reading with no extension (50mm).'
    ],
    barrier: [
      'With a 2m maximum extension, 200mm in from the tip of the arm, with the face of the tester parallel to the arm. Gravity skirts may be tied up out of the way. Maximum force under a barrier is 400N (p42).'
    ]
  },
  // How a full-speed main-edge result verifies other swept-area hazards (p41 and p42).
  verification: {
    note: 'Where testing at a hazard is not possible or not safe, a full speed main edge result can be used to assess it, but only if the table says so (p40 to 42).',
    sliding: [
      { mainMax: 400, mainProt: 'safe edge', hazardProt: 'same safe edge', hazard: 'crush', out: 'OK: no further testing or action required' },
      { mainMax: 1400, mainProt: 'safe edge', hazardProt: 'same safe edge', hazard: 'impact', out: 'OK: no further testing or action required' },
      { mainMax: 1400, mainProt: 'inherent', hazardProt: 'inherent', hazard: 'impact', out: 'OK: no further testing required' },
      { mainMax: 1400, mainProt: 'safe edge', hazardProt: 'inherent or different safe edge', hazard: 'crush', out: 'Not verified: the same safe edge is needed' },
      { mainMax: 1400, mainProt: 'inherent', hazardProt: 'inherent or different safe edge', hazard: 'crush', out: 'Not verified: a safe edge is needed at shear and draw-in hazards' }
    ],
    hinged: [
      { mainMax: 400, mainProt: 'safe edge', hazardProt: 'safe edge', hazard: 'crush', out: 'OK: no further testing or action required' },
      { mainMax: 1400, mainProt: 'safe edge', hazardProt: 'safe edge', hazard: 'impact', out: 'OK: no further testing or action required' },
      { mainMax: 1400, mainProt: 'inherent', hazardProt: 'inherent', hazard: 'impact', out: 'OK: no further testing required' },
      { mainMax: 1400, mainProt: 'safe edge', hazardProt: 'inherent or smaller safe edge', hazard: 'crush', out: 'Not verified: a safe edge or larger safe edge is needed close to the hinge, or measure the force at the hazard' },
      { mainMax: 1400, mainProt: 'safe edge', hazardProt: 'inherent or smaller safe edge', hazard: 'impact', out: 'Not verified: test the inherent protection at the main edge, away from the safe edge' },
      { mainMax: 1400, mainProt: 'inherent', hazardProt: 'inherent', hazard: 'crush', out: 'Not verified: a safe edge is needed close to the hinge, or measure the force at the hazard' }
    ]
  },
  // Adjustments: which tests need repeating (spec §9). "Unsure" always means all.
  // scope: leaf-direction | direction | leaves | device | all
  dependencies: {
    note: 'First guess, to be checked by QS: a changed setting only affects the tests that depend on it. Anything unsure repeats everything.',
    speed: 'leaf-direction',
    force: 'leaf-direction',
    slowdown: 'leaf-direction',
    travel: 'leaf-direction',
    sequencing: 'leaves',
    device: 'device',
    other: 'all'
  },
  // What has to be confirmed before each section can be relied on. Shown to
  // QS when approving the version.
  reviewList: [
    'Repeat rule: three tests in total when the first is over 90% of a maximum, and what counts when one reading is over the limit',
    'Main edge, full speed and highest-point follow-up tests for each gate type, and where it is safe to test',
    'How the tester\'s four numbers (Fd, Td, Fs, Fe) map onto the limits and the maintenance classifications',
    'Hold-to-run and non-contact test procedures and test pieces',
    'New installation or maintenance of an existing one; fire doors; manual systems',
    'Which settings changes make which tests need repeating'
  ]
};

// ── Small helpers ──────────────────────────────────────────────────────────
export const newId = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad2 = n => String(n).padStart(2, '0');
export const todayISO = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const longDate = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
export const shortDate = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
export const monthLabel = ym => { if (!ym) return ''; const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clone = o => JSON.parse(JSON.stringify(o));
export const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
export const fmt = (n, dp = 0) => n == null || isNaN(n) ? '' : Number(n).toFixed(dp);

// ── Due months (spec §15) ──────────────────────────────────────────────────
// A calendar month, not a day count: a November inspection at six months is
// due in May and is overdue from 1 June.
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const t = (y * 12 + (m - 1)) + n;
  return `${Math.floor(t / 12)}-${pad2((t % 12) + 1)}`;
}
export const monthOf = iso => String(iso).slice(0, 7);
export const dueMonthFrom = (basisDate, intervalMonths) => addMonths(monthOf(basisDate), Number(intervalMonths));
export function overdueFrom(dueMonth) { return dueMonth ? addMonths(dueMonth, 1) + '-01' : null; }   // first day it counts as overdue
export function dueState(dueMonth, today = todayISO()) {
  if (!dueMonth) return 'none';
  if (today >= overdueFrom(dueMonth)) return 'overdue';
  return monthOf(today) === dueMonth ? 'due' : 'ok';
}

// ── Batteries (spec §11) ───────────────────────────────────────────────────
// Each device has its own schedule; only an actual replacement resets it.
export function batteryNextDue(device, log) {
  const b = device.battery;
  if (!b || !b.intervalMonths) return { state: 'none' };
  const mine = (log || []).filter(x => x.deviceId === device.id).map(x => x.replacedOn).sort();
  const last = mine.length ? mine[mine.length - 1] : (b.lastReplaced || null);
  if (!last) return { state: 'unknown' };
  const due = addMonths(monthOf(last), Number(b.intervalMonths));
  return { state: dueState(due), last, due };
}

// ── Readings (spec §8) ─────────────────────────────────────────────────────
// Blank is not zero. Zero is a real value. Negative or non-numeric is refused.
export function parseReading(text) {
  const s = String(text ?? '').trim();
  if (s === '') return { blank: true };
  if (!/^\d+(\.\d+)?$/.test(s)) return { error: 'Numbers only (no minus sign or letters).' };
  return { value: Number(s) };
}
export const UNUSUAL = { fd: 3000, td: 5, fs: 3000, fe: 3000 };
export function isUnusual(metric, v) { return v > UNUSUAL[metric]; }
export const METRICS = [{ k: 'fd', t: 'Fd (N)', dp: 0, long: 'Dynamic force' }, { k: 'td', t: 'Td (s)', dp: 2, long: 'Dynamic time' }, { k: 'fs', t: 'Fs (N)', dp: 0, long: 'Static force' }, { k: 'fe', t: 'Fe (N)', dp: 0, long: 'End force' }];

export function pointLimits(point, rules) {
  const L = rules.limits;
  return { fd: point.hazardClass === 'impact' ? L.fdImpact : L.fdCrush, td: L.td, fs: L.fs, fe: L.fe };
}
// What a point's readings add up to. Every individual reading stays visible;
// an average never hides a reading over the limit.
export function evaluatePoint(point, readings, rules) {
  const lim = pointLimits(point, rules);
  const r = (readings || []).filter(x => x && x.fd != null && x.td != null && x.fs != null && x.fe != null);
  if (!r.length) return { state: 'empty', count: 0, required: 1, lim };
  const trig = rules.repeat.trigger;
  const first = r[0];
  const needs = METRICS.some(m => first[m.k] > trig * lim[m.k]);
  const required = needs ? rules.repeat.total : 1;
  const avg = {}, over = {}, individualOver = [];
  METRICS.forEach(m => {
    const used = r.slice(0, Math.max(required, 1));
    avg[m.k] = mean(used.map(x => x[m.k]));
    over[m.k] = avg[m.k] > lim[m.k];
  });
  r.forEach((x, i) => METRICS.forEach(m => { if (x[m.k] > lim[m.k]) individualOver.push({ n: i + 1, k: m.k, v: x[m.k] }); }));
  const complete = r.length >= required;
  let state = 'incomplete';
  if (complete) state = METRICS.some(m => over[m.k]) ? 'fail' : (individualOver.length ? 'review' : 'pass');
  return { state, count: r.length, required, avg, over, individualOver, lim, needsRepeat: needs, complete };
}
// Maintenance classification of a failed point (p55). Fs / Fe time-based
// limits are not classified here: QS maps them (rules.classification.note).
export function classify(point, ev, rules) {
  if (!ev || !ev.avg) return null;
  const c = rules.classification, key = point.hazardClass === 'impact' ? 'fdImpact' : 'fdCrush';
  const fd = ev.avg.fd, td = ev.avg.td;
  if (fd > c[key].safetyCritical || td > c.td.safetyCritical) return 'Safety critical: should not be returned to service';
  if (fd > ev.lim.fd || td > ev.lim.td) return 'Requires improvement: could stay in service with the client\'s agreement';
  return null;
}

// Pick the highest-reading point of a group for the 50mm follow-up.
export function highestOf(points, readingsByPoint, rules) {
  let best = null;
  points.forEach(p => {
    const ev = evaluatePoint(p, readingsByPoint[p.id], rules);
    if (!ev.avg || !ev.complete) return;
    if (!best || ev.avg.fd > best.fd) best = { point: p, fd: ev.avg.fd };
  });
  return best && best.point;
}

// ── Test plan (spec §8): built from what was set up, not a fixed grid ──────
// Returns { points: [...], checks: [...], notes: [...] }.
export function buildTestPlan(inst, rules) {
  const type = TYPES[inst.type] || {};
  const out = { points: [], checks: [], notes: [] };
  if (type.unsupported) { out.notes.push('Pedestrian doors have their own module, which is not built yet. No gate force tests are offered.'); return out; }
  const manual = inst.operation === 'Manual';
  const leaves = leafList(inst);
  const hz = (inst.hazards || []).filter(h => h && !h.removed);
  const slowdownKnownNo = inst.answers && inst.answers.slowdown && inst.answers.slowdown.v === 'No' && inst.answers.slowdown.st === 'confirmed';
  hz.forEach(h => {
    const label = h.label || 'Hazard';
    const prot = h.protection || 'none';
    if (h.cls === 'structural' || h.movement === 'static') {
      out.checks.push({ id: `${h.id}.structure`, hazardId: h.id, label: `${label}: inspect for condition, fixings and wear`, kind: 'inspect' });
      return;
    }
    if (prot === 'design') out.checks.push({ id: `${h.id}.geometry`, hazardId: h.id, label: `${label}: measure and inspect the clearance or guarding`, kind: 'measure' });
    if (prot === 'holdtorun') out.checks.push({ id: `${h.id}.htr`, hazardId: h.id, label: `${label}: check hold-to-run (releasing stops it, the whole movement is visible, only trained users, overtravel)`, kind: 'htr' });
    if (prot === 'none') out.checks.push({ id: `${h.id}.unknown`, hazardId: h.id, label: `${label}: protection not established. Needs QS review`, kind: 'unknown' });
    if (prot === 'noncontact') {
      out.checks.push({ id: `${h.id}.coverage`, hazardId: h.id, label: `${label}: check the detection covers the whole hazard, with the test piece`, kind: 'noncontact' });
      if (!h.altRouteApproved) out.notes.push(`${label}: a detection device alone does not replace force tests. Force tests are kept until QS approves the alternative protection route for this hazard.`);
    }
    const needsForce = prot === 'force' || (prot === 'noncontact' && !h.altRouteApproved) || prot === 'none';
    if (manual) { if (needsForce) out.notes.push(`${label}: manual operation, so no powered force test is generated. Mechanical checks apply instead.`); return; }
    if (!needsForce) return;
    const dirs = h.movement === 'both' ? ['closing', 'opening'] : [h.movement || 'closing'];
    if (!h.mainEdge) {
      dirs.forEach(dir => {
        if (h.verifyBy === 'inferred') {
          out.checks.push({ id: `${h.id}.${dir}.verify`, hazardId: h.id, label: `${label} (${dir}): verified from the full speed main-edge result. Say why testing here isn't possible or safe`, kind: 'infer', direction: dir });
        } else {
          out.points.push({ id: `${h.id}.${dir}.direct`, hazardId: h.id, hazardClass: h.cls || 'crush', kind: 'hazard', direction: dir, leaf: 'ALL', label: `${label}: ${dir}, tested at the hazard`, how: 'Test at the hazard. If it is not possible or not safe, change this hazard to "verify from the main-edge result".' });
        }
      });
      return;
    }
    dirs.forEach(dir => {
      const groups = (type.family === 'horizontal' && dir === 'closing' && leaves.length > 1)
        ? [{ id: 'C', label: 'Centre where the leaves meet' }]
        : leaves;
      groups.forEach(lf => {
        const base = `${h.id}.${lf.id}.${dir}`;
        const pre = `${lf.label ? lf.label + ' ' : ''}${dir}`;
        const common = { hazardId: h.id, hazardClass: h.cls || 'crush', direction: dir, leaf: lf.id };
        if (type.family === 'barrier') {
          out.points.push({ ...common, id: base + '.tip', kind: 'tip', label: `${pre}: 200mm in from the arm tip, tester face parallel to the arm`, how: rules.testMethods.barrier[0] });
          return;
        }
        if (type.family === 'vertical') {
          if (!slowdownKnownNo) out.points.push({ ...common, id: base + '.fullspeed', kind: 'fullspeed', label: `${pre}: full speed, centre, long extension`, how: rules.testMethods.vertical[0] });
          [['centre', 'Centre of the opening'], ['left', '200mm in from the left guide'], ['right', '200mm in from the right guide']].forEach(([k, t]) =>
            out.points.push({ ...common, id: `${base}.m300.${k}`, kind: 'main', group: base + '.m', ext: 300, label: `${pre}: ${t}, 300mm extension`, how: rules.testMethods.vertical[1] }));
          out.points.push({ ...common, id: base + '.follow', kind: 'followup', group: base + '.m', label: `${pre}: highest point again, no extension (50mm)`, how: rules.testMethods.vertical[2] });
          return;
        }
        if (!slowdownKnownNo) out.points.push({ ...common, id: base + '.fullspeed', kind: 'fullspeed', label: `${pre}: full speed, waist height, long extension`, how: rules.testMethods.horizontal[0] });
        [['top', 'Top (300mm from the top, or 2.5m)'], ['mid', 'Middle (mid height, or 1.5m)'], ['bot', 'Bottom (50mm up from the base)']].forEach(([k, t]) =>
          out.points.push({ ...common, id: `${base}.m500.${k}`, kind: 'main', group: base + '.m', ext: 500, label: `${pre}: ${t}, 500mm extension`, how: rules.testMethods.horizontal[1] }));
        out.points.push({ ...common, id: base + '.follow', kind: 'followup', group: base + '.m', label: `${pre}: highest point again, no extension (50mm)`, how: rules.testMethods.horizontal[2] });
      });
    });
  });
  return out;
}
// The follow-up point says which of its group was highest, once known.
export function followUpTarget(plan, point, readingsByPoint, rules) {
  if (point.kind !== 'followup') return null;
  const group = plan.points.filter(p => p.group === point.group && p.kind === 'main');
  if (group.some(p => !evaluatePoint(p, readingsByPoint[p.id], rules).complete)) return { waiting: true };
  return { point: highestOf(group, readingsByPoint, rules) };
}

// Hazard verified from the main-edge full-speed result (tables p40–42).
export function verifyFromMainEdge(inst, mainProt, hazardProt, hazardClass, fullSpeedFd, rules) {
  const table = (TYPES[inst.type] || {}).branch === 'slide' ? rules.verification.sliding : rules.verification.hinged;
  if (fullSpeedFd == null) return 'Waiting for the full speed main-edge result.';
  const cls = hazardClass === 'impact' ? 'impact' : 'crush';
  const maxOK = cls === 'impact' ? rules.limits.fdImpact : rules.limits.fdCrush;
  if (fullSpeedFd > maxOK) return 'The main-edge full speed result is over the limit. It cannot verify this hazard.';
  const same = hazardProt === mainProt;
  const row = table.find(r => r.mainProt === mainProt && r.hazard === cls && (same ? /^same|^safe edge$|^inherent$/.test(r.hazardProt) : /different|inherent or|smaller/.test(r.hazardProt)));
  return row ? row.out : 'No row in the table fits. Needs QS review.';
}

// ── Adjustments → which tests to repeat (spec §9) ──────────────────────────
export const ADJUST_CATEGORIES = [
  { k: 'speed', t: 'Speed' }, { k: 'force', t: 'Force / sensitivity' }, { k: 'slowdown', t: 'Slow-down' },
  { k: 'travel', t: 'Travel limits' }, { k: 'sequencing', t: 'Leaf sequencing' }, { k: 'device', t: 'Device replaced' }, { k: 'other', t: 'Other' }
];
// Returns { ids: [...point ids to repeat], why }.  Unsure = all.
export function suggestRetest(adj, plan, rules) {
  const all = plan.points.map(p => p.id);
  if (adj.unsure || !adj.category) return { ids: all, why: 'Unsure, so everything is repeated.' };
  const scope = rules.dependencies[adj.category] || 'all';
  const pts = plan.points;
  let sel;
  if (scope === 'all') sel = pts;
  else if (scope === 'leaf-direction') sel = pts.filter(p => (!adj.leaf || adj.leaf === 'ALL' || p.leaf === adj.leaf || p.leaf === 'C' || p.leaf === 'ALL') && (!adj.direction || adj.direction === 'both' || p.direction === adj.direction));
  else if (scope === 'leaves') sel = pts.filter(p => p.leaf === 'C' || p.direction === 'closing');
  else if (scope === 'device') sel = adj.hazardIds && adj.hazardIds.length ? pts.filter(p => adj.hazardIds.includes(p.hazardId)) : pts;
  else sel = pts;
  if (!sel.length) sel = pts;
  return { ids: sel.map(p => p.id), why: `Rules say a ${adj.category} change affects ${scope.replace('-', ' and ')}.` };
}

// ── Compare with last time (spec §8): only after the point is complete ─────
export function comparePoint(curEv, prevEv, samePlan) {
  if (!curEv || !curEv.avg || !prevEv || !prevEv.avg) return null;
  const out = { rows: [], comparable: !!samePlan };
  METRICS.forEach(m => {
    const c = curEv.avg[m.k], p = prevEv.avg[m.k];
    out.rows.push({ k: m.k, cur: c, prev: p, abs: c - p, pct: p === 0 ? null : ((c - p) / p) * 100 });
  });
  return out;
}

// ── Checking a whole inspection before it goes to QS (spec §10, §12) ───────
export function missingItems(test, inst, plan, tasks, rules) {
  const gaps = [];
  const rb = test.readings || {};
  (plan.points || []).forEach(p => {
    const ev = evaluatePoint(p, rb[p.id], rules);
    const nd = (test.notDone || {})[p.id];
    if (nd) return;
    if (!ev.complete) gaps.push({ kind: 'test', id: p.id, text: `${p.label}: ${ev.count ? `${ev.count} of ${ev.required} readings` : 'no readings yet'}` });
  });
  (tasks || []).forEach(t => { const o = (test.tasks || {})[t.id]; if (!o || !o.outcome) gaps.push({ kind: 'task', id: t.id, text: `Service task not answered: ${t.text}` }); else if ((o.outcome === 'notRequired' || o.outcome === 'unable') && !String(o.why || '').trim()) gaps.push({ kind: 'task', id: t.id, text: `Service task needs a reason: ${t.text}` }); });
  (plan.checks || []).forEach(c => { const o = (test.checks || {})[c.id]; if (!o || !o.st) gaps.push({ kind: 'check', id: c.id, text: `Not answered: ${c.label}` }); });
  (inst.devices || []).filter(d => !d.retired).forEach(d => { const o = (test.devices || {})[d.id]; if (!o || !o.result) gaps.push({ kind: 'device', id: d.id, text: `Device not checked: ${d.name}` }); });
  return gaps;
}
export function overallLabel(test, plan, rules) {
  // Never an overall pass with anything missing, failed or awaiting review.
  let fail = 0, review = 0, pass = 0, pending = 0;
  (plan.points || []).forEach(p => {
    if ((test.notDone || {})[p.id]) { pending++; return; }
    const ev = evaluatePoint(p, (test.readings || {})[p.id], rules);
    if (ev.state === 'fail') fail++; else if (ev.state === 'review') review++; else if (ev.state === 'pass') pass++; else pending++;
  });
  const defects = (test.defects || []).filter(d => d.severity === 'Safety critical').length;
  if (fail || defects) return { label: 'Fail', fail, review, pass, pending };
  if (review || pending) return { label: 'Not complete', fail, review, pass, pending };
  return { label: 'Pass', fail, review, pass, pending };
}

// ── Checklist drafts ───────────────────────────────────────────────────────
export function starterTasks() { return STARTER_TASKS.map(t => ({ id: newId('t'), text: t })); }
export function seedHazards(type) {
  const t = TYPES[type]; if (!t || t.unsupported) return [];
  return (HAZARD_SEEDS[t.branch] || []).map(h => ({ id: newId('h'), label: h.label, location: '', movement: h.movement, cls: h.cls, mainEdge: !!h.mainEdge, protection: h.cls === 'structural' ? 'design' : 'none', evidence: '', verifyBy: 'direct' }));
}
export function reportRef(inst, test) { return test.certNumber ? String(test.certNumber) : `GATE-${inst.siteRef || 'SITE'}-${(inst.shortRef || inst.id || '').slice(-4).toUpperCase()}-${String(test.date || '').replace(/-/g, '')}`; }
