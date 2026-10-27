// ═══════════════════════════════════════════════════════════════════════════
//  sw-shared.js — Simpson & Wood engineer apps, shared code   v1.0
//  27 Oct 2026. One copy of the blocks every page needs, instead of a copy
//  pasted into each page:
//    · access level · View as (Rob only) · What's New · Help   (standards §15)
//    · Not sent yet                                             (standards §15.1)
//    · "A new version is ready" bar + service worker            (standards §15.2)
//    · error reporting (new)                                    (standards §15.3)
//
//  How a page uses it (index.html and management.html so far):
//    import * as SWS from './sw-shared.js';
//    SWS.swSetup({ db, auth });                 // straight after Firebase starts
//    const va = await SWS.swViewAsInit(user);   // when someone signs in
//    SWS.swExtrasStart({ page, version, level, news, help, tab });
//  Pages that haven't switched yet still have their own inline copies.
//
//  Change this file = bump CACHE_NAME in service-worker.js. Keep what it
//  exports working the same way, because every page that uses it relies on it.
// ═══════════════════════════════════════════════════════════════════════════
import {
  doc, getDoc, getDocs, collection, setDoc, getDocFromServer, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const SW_SHARED_VERSION = '1.0';
export const SW_OWNER = 'rob.rose@simpsonandwood.co.uk';
export const SW_MGMT_POSITIONS = ['Manager', 'QS', 'Director'];   // must match isManager() in the rules
export const SW_VA_MSG = 'You\'re viewing as someone else, so nothing is saved or sent.';

let db = null, auth = null;
let VIEW_AS = null;      // { email, name, position } while Rob is viewing the app as someone else
export const SW = { page: '', version: '', level: 'engineer', news: {}, help: [], tab: () => '' };

export function swSetup(opts) {
  db = opts.db; auth = opts.auth;
  if (opts.page) SW.page = opts.page;
  if (opts.version) SW.version = opts.version;
  window.addEventListener('online', () => { sweFlush(); });
  if (auth && auth.onAuthStateChanged) auth.onAuthStateChanged(u => { if (u) sweFlush(); });
  setTimeout(sweFlush, 4000);
}
export const swViewingAs = () => VIEW_AS;
export const swEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function swBlocked() { return Promise.reject(new Error(SW_VA_MSG)); }
// Wrap anything that saves, so "View as" can never change real data.
export function swGuard(fn) { return (...a) => VIEW_AS ? swBlocked() : fn(...a); }
export function swGuardBatch(fn) { return (...a) => { const b = fn(...a); const c = b.commit.bind(b); b.commit = () => VIEW_AS ? swBlocked() : c(); return b; }; }
(() => {   // and nothing goes to Microsoft (email, calendars) while viewing as someone
  const f = window.fetch.bind(window);
  window.fetch = (u, o) => (VIEW_AS && String(u).includes('graph.microsoft.com')) ? swBlocked() : f(u, o);
})();

// Who someone is: 'management' (Manager / QS / Director, or the console-only
// managers list), 'office' or 'engineer'.
export async function swAccess(email) {
  let managers = false, position = '', staff = null;
  try { managers = (await getDoc(doc(db, 'managers', email))).exists(); } catch (e) {}
  try { const s = await getDoc(doc(db, 'staff', String(email).toLowerCase())); if (s.exists()) { staff = s.data(); position = staff.position || ''; } } catch (e) {}
  const level = (managers || SW_MGMT_POSITIONS.includes(position)) ? 'management' : position === 'Office' ? 'office' : 'engineer';
  return { level, position, staff, isManager: level === 'management', isOffice: level === 'office' };
}
// Header buttons go before the name: in the homepage's .topbar-right, or in a
// guide header's .right (design guide 6.1), or next to header .who.
export function swHeaderButton(id, icon, label, onClick) {
  if (document.getElementById(id)) return;
  const b = document.createElement('button');
  b.type = 'button'; b.id = id; b.className = 'sw-hbtn'; b.title = label; b.setAttribute('aria-label', label);
  b.innerHTML = `<i class="ti ${icon}" aria-hidden="true"></i><span>${swEsc(label)}</span>`;
  b.addEventListener('click', onClick);
  const right = document.querySelector('.topbar-right');
  const gright = document.querySelector('header .right');
  if (right) right.prepend(b);
  else if (gright) { const who = gright.querySelector('.who'); gright.insertBefore(b, who || null); }
  else { const who = document.querySelector('header .who'); let box = document.getElementById('swHbox'); if (!box) { box = document.createElement('div'); box.id = 'swHbox'; box.className = 'sw-hbox'; who.parentNode.insertBefore(box, who); } box.appendChild(b); }
}
export function swModal(html, cls) {
  const bg = document.createElement('div');
  bg.className = 'sw-modal-bg ' + (cls || '');
  bg.innerHTML = html;
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-swclose]')) bg.remove(); });
  document.body.appendChild(bg);
  return bg;
}

// ---- View as (Rob only) ----------------------------------------------------
// Rob picks a person and every page shows what they'd see, read-only. The
// choice lasts for this browser tab (all pages) until he presses Stop. Data is
// still read with Rob's own access, so it shows screens, not the database rules.
export async function swViewAsInit(user) {
  const real = String(user.email || '').toLowerCase();
  if (real !== SW_OWNER) return null;
  swHeaderButton('swViewAsBtn', 'ti-eye', 'View as', swPickViewAs);
  let v = null;
  try { v = sessionStorage.getItem('sw-viewas'); } catch (e) {}
  if (!v) return null;
  let name = v, position = '';
  try { const s = await getDoc(doc(db, 'staff', v)); if (s.exists()) { name = s.data().name || v; position = s.data().position || ''; } } catch (e) {}
  VIEW_AS = { email: v, name, position };
  const bar = document.createElement('div');
  bar.className = 'sw-vabar';
  bar.innerHTML = `<i class="ti ti-eye"></i><span>Viewing as <b>${swEsc(name)}</b>${position ? ' (' + swEsc(position) + ')' : ''}. Nothing can be saved or sent.</span><button type="button" data-va="change">Change</button><button type="button" data-va="stop">Stop</button>`;
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-va]'); if (!b) return;
    if (b.dataset.va === 'change') swPickViewAs();
    else { try { sessionStorage.removeItem('sw-viewas'); } catch (er) {} location.reload(); }
  });
  document.body.prepend(bar);
  document.body.classList.add('sw-va-on');
  return VIEW_AS;
}
export async function swPickViewAs() {
  let people = [];
  try { const snap = await getDocs(collection(db, 'staff')); snap.forEach(d => { const x = d.data(); people.push({ email: d.id.toLowerCase(), name: x.name || d.id, position: x.position || '' }); }); } catch (e) {}
  people = people.filter(p => p.email !== SW_OWNER).sort((a, b) => a.name.localeCompare(b.name));
  const m = swModal(`<div class="sw-modal"><h3>View the app as…</h3><input class="sw-inp" placeholder="Type a name" data-q><div class="sw-people" data-list></div>
    <div class="sw-mbtns"><button type="button" class="sw-btn" data-swclose>Cancel</button></div></div>`);
  const draw = () => {
    const q = m.querySelector('[data-q]').value.trim().toLowerCase();
    m.querySelector('[data-list]').innerHTML = people.filter(p => !q || p.name.toLowerCase().includes(q)).map(p => `<button type="button" data-pick="${swEsc(p.email)}"><b>${swEsc(p.name)}</b><small>${swEsc(p.position || 'No position')}</small></button>`).join('') || '<p>Nobody found.</p>';
  };
  m.querySelector('[data-q]').addEventListener('input', draw);
  m.addEventListener('click', e => { const p = e.target.closest('[data-pick]'); if (!p) return; try { sessionStorage.setItem('sw-viewas', p.dataset.pick); } catch (er) {} location.reload(); });
  draw(); m.querySelector('[data-q]').focus();
}

// ---- What's New + Help -------------------------------------------------------
// The page passes its name, version, notes per level and help questions (each
// with the tab it belongs to and, if not everyone, the levels it's for).
// What's New is only for new features (standards §15): a level with no notes
// gets no popup.
function swNewsItems() { return SW.news[SW.level] || SW.news.all || []; }
export function swShowNews() {
  const items = swNewsItems();
  swModal(`<div class="sw-modal"><h3>What's new <small>${swEsc(SW.version)}</small></h3>${items.length ? `<ul class="sw-news">${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '<p>Nothing new for you on this page.</p>'}
    <div class="sw-mbtns"><button type="button" class="sw-btn sw-btn-red" data-swclose>OK</button></div></div>`);
}
async function swNewsCheck() {
  if (VIEW_AS || !swNewsItems().length || !auth.currentUser) return;
  const key = 'seen_' + SW.page;
  try {
    const ref = doc(db, 'userPrefs', auth.currentUser.email);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()[key] === SW.version) return;
    swShowNews();
    await setDoc(ref, { [key]: SW.version }, { merge: true });
  } catch (e) { console.warn('What\'s new check failed', e); }
}
export function swShowHelp() {
  const tab = SW.tab() || '';
  const mine = SW.help.filter(h => !h.levels || h.levels.includes(SW.level));
  const groups = new Map();
  mine.forEach(h => { const g = h.tab || ''; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(h); });
  const order = [...groups.keys()].sort((a, b) => (a === tab ? -1 : b === tab ? 1 : 0));
  const m = swModal(`<aside class="sw-help"><div class="sw-help-h"><h3><i class="ti ti-help-circle"></i> Help</h3><button type="button" class="sw-x" data-swclose aria-label="Close">×</button></div>
    ${order.map(g => `<div class="sw-help-g">${g ? `<div class="sw-help-t">${swEsc(g)}</div>` : ''}${groups.get(g).map(h => `<details ${g === tab && groups.get(g)[0] === h ? 'open' : ''}><summary>${swEsc(h.q)}</summary><div>${h.a}</div></details>`).join('')}</div>`).join('') || '<p>No help for this page yet.</p>'}
    <div class="sw-help-f"><button type="button" class="sw-btn" data-swnews>What's new in ${swEsc(SW.version)}</button><p>Still stuck? Ask Rob.</p></div></aside>`, 'sw-help-bg');
  m.querySelector('[data-swnews]').addEventListener('click', () => { m.remove(); swShowNews(); });
}
export function swExtrasStart(opts) {
  Object.assign(SW, opts || {});
  swHeaderButton('swHelpBtn', 'ti-help-circle', 'Help', swShowHelp);
  swNewsCheck();
}

// ═══════════════════════════════════════════════════════════════════════════
//  NOT SENT YET (standards §15.1).
//  Every save made on this device is written down here (localStorage, which
//  every page on the site shares) until the server copy is confirmed.
//  Firestore keeps its own queue of unsent saves on the phone; this list is
//  how we *show* it, and unlike an in-page counter it survives the app being
//  closed or reloaded. Every page that uses it checks the list against the
//  server when it opens, when signal comes back and every minute, so anything
//  that went up in the background clears itself.
//  An item: { c: collection, id: doc id, label, app, site, at, by, failed?, why? }
//  Fires a 'swu-change' event on document with { waiting, failed }.
// ═══════════════════════════════════════════════════════════════════════════
const SWU_KEY = 'sw-unsent-v1';
const SWU_SLOW_MS = 30 * 60000;   // still not there after 30 min with signal: say so
function swuMe() { return String((auth && auth.currentUser && auth.currentUser.email) || '').toLowerCase(); }
function swuAll() { try { const a = JSON.parse(localStorage.getItem(SWU_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function swuSave(a) { try { localStorage.setItem(SWU_KEY, JSON.stringify(a)); } catch (e) {} swuRender(); }
export function swuMine() { const me = swuMe(); return swuAll().filter(x => x.by === me); }
export function swuAdd(item) { const a = swuAll().filter(x => x.id !== item.id); a.push(Object.assign({ at: Date.now(), by: swuMe() }, item)); swuSave(a); }
export function swuSent(id) { const a = swuAll(); if (a.some(x => x.id === id)) swuSave(a.filter(x => x.id !== id)); }
export function swuFailed(id, why) { swuSave(swuAll().map(x => x.id === id ? Object.assign({}, x, { failed: true, why: String(why || '') }) : x)); }
export function swuWaiting(id) { return swuAll().some(x => x.id === id && !x.failed); }
let swuChecking = false;
export async function swuCheck() {
  if (swuChecking || !navigator.onLine || !auth || !auth.currentUser) return;
  swuChecking = true;
  try {
    for (const x of swuMine().filter(x => !x.failed)) {
      try {
        const s = await getDocFromServer(doc(db, x.c, x.id));
        if (s.exists()) swuSent(x.id);
      } catch (e) { if (e && e.code === 'unavailable') break; }   // no real signal: try again later
    }
  } finally { swuChecking = false; swuRender(); }
}
function swuAgo(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' days ago';
}
function swuRender() {
  const head = document.querySelector('#appRoot header');
  if (!head) return;
  let bar = document.getElementById('swuBar');
  if (!bar) {
    bar = document.createElement('button');
    bar.type = 'button'; bar.id = 'swuBar'; bar.className = 'swu-bar'; bar.hidden = true;
    bar.addEventListener('click', swuShowList);
    head.insertAdjacentElement('afterend', bar);
  }
  const mine = swuMine(), bad = mine.filter(x => x.failed), wait = mine.filter(x => !x.failed);
  document.dispatchEvent(new CustomEvent('swu-change', { detail: { waiting: wait, failed: bad } }));
  if (!mine.length) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.classList.toggle('bad', bad.length > 0);
  const n = (k, w) => k + ' ' + w + (k === 1 ? '' : 's');
  bar.innerHTML = bad.length
    ? `<i class="ti ti-alert-triangle" aria-hidden="true"></i><span>${n(bad.length, 'test')} didn't save. Tap to see which, then log ${bad.length === 1 ? 'it' : 'them'} again.</span>`
    : `<i class="ti ti-cloud-upload" aria-hidden="true"></i><span>${n(wait.length, 'test')} not sent yet. ` +
      (navigator.onLine ? 'Sending… keep the app open.' : `No signal. ${wait.length === 1 ? 'It' : 'They'}'ll send when you're back in signal. Don't clear the app.`) + `</span>`;
}
function swuShowList() {
  const mine = swuMine().sort((a, b) => b.at - a.at);
  const slow = x => !x.failed && navigator.onLine && Date.now() - x.at > SWU_SLOW_MS;
  const row = x => `<div class="swu-row ${x.failed ? 'bad' : ''}"><div><b>${swEsc(x.label || x.id)}</b>
      <small>${swEsc([x.app, x.site].filter(Boolean).join(' · '))}${x.app || x.site ? ' · ' : ''}saved ${swuAgo(x.at)}</small>
      ${x.failed ? `<small class="swu-why">Didn't save${x.why ? ' (' + swEsc(x.why) + ')' : ''}. Log it again, then press Remove.</small>` : ''}
      ${slow(x) ? `<small class="swu-why">Still not sent. Open ${swEsc(x.app || 'the app')} with signal. If it stays here, tell the office.</small>` : ''}</div>
      ${x.failed ? `<button type="button" class="sw-btn" data-swudrop="${swEsc(x.id)}">Remove</button>` : '<span class="swu-pill">Waiting</span>'}</div>`;
  const m = swModal(`<div class="sw-modal"><h3>Not sent yet</h3>
    ${mine.length ? `<div class="swu-list">${mine.map(row).join('')}</div>` : '<p>Everything has been sent.</p>'}
    <p class="swu-note">Tests stay safe on this phone until the office has them. Keep the app open with signal and they go up on their own. Don't clear the app's data or uninstall it while anything is waiting.</p>
    <div class="sw-mbtns"><button type="button" class="sw-btn" data-swucheck>Check again</button><button type="button" class="sw-btn sw-btn-red" data-swclose>OK</button></div></div>`);
  m.addEventListener('click', e => {
    const d = e.target.closest('[data-swudrop]');
    if (d) { swuSave(swuAll().filter(x => x.id !== d.dataset.swudrop)); m.remove(); swuShowList(); return; }
    if (e.target.closest('[data-swucheck]')) { m.remove(); swuCheck().then(swuShowList); }
  });
}
export function swuStart() {
  swuRender();
  swuCheck();
  window.addEventListener('online', () => { swuRender(); swuCheck(); });
  window.addEventListener('offline', swuRender);
  window.addEventListener('storage', e => { if (e.key === SWU_KEY) swuRender(); });
  setInterval(swuCheck, 60000);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ERROR REPORTING (standards §15.3, agreed 27 Oct 2026).
//  Records crashes, saves that fail and things that didn't load, so Rob sees
//  problems nobody reports. Only Rob can read them (Management → Errors).
//  - Each error: page, version, time, who, phone/tablet/PC, browser and the
//    error message. NEVER anything typed into a form.
//  - The same error, from the same person, on the same page, on the same day
//    is one record with a count (the record's id is built from those).
//  - Waits on the device (the 20 most recent) until there's signal and
//    someone is signed in, then sends.
//  - Pages report their own failed saves / loads with swReport(kind, message).
// ═══════════════════════════════════════════════════════════════════════════
const SWE_KEY = 'sw-errors-v1';
const SWE_MAX_QUEUE = 20, SWE_MAX_PER_LOAD = 15;
let sweThisLoad = 0, sweFlushing = false, sweTimer = null;
function sweHash(s) {   // FNV-1a, 32-bit, as 8 hex characters
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function sweDay() {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
function sweDevice() {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'Phone';
  return 'PC';
}
function sweBrowser() {
  const ua = navigator.userAgent || '';
  const m = (re, name) => { const x = ua.match(re); return x ? name + ' ' + x[1] : ''; };
  return m(/Edg\/(\d+)/, 'Edge') || m(/SamsungBrowser\/(\d+)/, 'Samsung Internet') || m(/OPR\/(\d+)/, 'Opera')
    || m(/CriOS\/(\d+)/, 'Chrome') || m(/FxiOS\/(\d+)/, 'Firefox') || m(/Firefox\/(\d+)/, 'Firefox')
    || m(/Chrome\/(\d+)/, 'Chrome') || m(/Version\/(\d+)[\d.]*.*Safari/, 'Safari') || 'Other';
}
function sweQueue() { try { const a = JSON.parse(localStorage.getItem(SWE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function sweSaveQueue(a) { try { localStorage.setItem(SWE_KEY, JSON.stringify(a.slice(-SWE_MAX_QUEUE))); } catch (e) {} }
function sweClean(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); }
// Things that aren't our bugs: browser quirks, extensions, no signal.
function sweIgnore(msg) {
  return !msg || /^Script error\.?$/i.test(msg) || /ResizeObserver loop/i.test(msg)
    || msg.includes(SW_VA_MSG)
    || (!navigator.onLine && /(Failed to fetch|NetworkError|Load failed|unavailable|client is offline)/i.test(msg));
}
// kind: 'crash' | 'save' | 'load'. message: what went wrong, in a few words,
// plus the error's own message. Never put form contents in it.
export function swReport(kind, message, where) {
  try {
    const msg = sweClean(message, 500);
    if (sweIgnore(msg) || sweThisLoad >= SWE_MAX_PER_LOAD) return;
    sweThisLoad++;
    const page = SW.page || (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
    const day = sweDay();
    const key = sweHash([day, page, kind, msg].join('|'));
    const q = sweQueue();
    const hit = q.find(x => x.key === key);
    if (hit) { hit.n = (hit.n || 1) + 1; hit.version = SW.version || hit.version; }
    else q.push({ key, page, version: SW.version || '', kind, message: msg, where: sweClean(where, 200), device: sweDevice(), browser: sweBrowser(), day, n: 1 });
    sweSaveQueue(q);
    clearTimeout(sweTimer); sweTimer = setTimeout(sweFlush, 3000);
  } catch (e) {}
}
// A short "where": file:line:column, our own files only.
function sweWhere(file, line, col) {
  if (!file) return '';
  try { const u = new URL(file, location.href); if (u.origin !== location.origin) return u.host + u.pathname.split('/').pop(); return u.pathname.split('/').pop() + ':' + (line || 0) + ':' + (col || 0); }
  catch (e) { return String(file).slice(-80); }
}
function sweOurs(file) {
  if (!file) return false;
  try { const u = new URL(file, location.href); return u.origin === location.origin || /(^|\.)gstatic\.com$|jsdelivr\.net$|cdnjs\.cloudflare\.com$/.test(u.host); } catch (e) { return false; }
}
window.addEventListener('error', e => {
  const t = e.target;
  if (t && t !== window && (t.src || t.href)) {   // a file that didn't load (script, stylesheet, image)
    const url = t.src || t.href;
    if (navigator.onLine && sweOurs(url)) swReport('load', 'Couldn\'t load ' + sweWhere(url));
    return;
  }
  if (!sweOurs(e.filename)) return;               // browser extensions and the like
  swReport('crash', e.message || (e.error && e.error.message) || 'Unknown error', sweWhere(e.filename, e.lineno, e.colno));
}, true);
window.addEventListener('unhandledrejection', e => {
  const r = e.reason;
  const msg = (r && (r.code ? r.code + ': ' : '') + (r.message || '')) || String(r);
  const line = String((r && r.stack) || '').split('\n').find(l => l.includes(location.origin)) || '';
  const m = line.match(/(https?:\/\/[^\s)]+):(\d+):(\d+)/);
  swReport('crash', msg, m ? sweWhere(m[1], m[2], m[3]) : '');
});
// Send what's waiting. Each record's id is the day plus a hash of who, page,
// kind and message, so repeats land on the same record and add to its count.
export async function sweFlush() {
  if (sweFlushing || !db || !auth || !auth.currentUser || !navigator.onLine) return;
  const q = sweQueue(); if (!q.length) return;
  sweFlushing = true;
  const email = String(auth.currentUser.email || '').toLowerCase();
  try {
    for (const x of q) {
      const id = x.day + '_' + sweHash([email, x.page, x.kind, x.message].join('|'));
      const data = { page: x.page, version: x.version, kind: x.kind, message: x.message, where: x.where, device: x.device, browser: x.browser,
        day: x.day, email, count: increment(x.n || 1), lastAt: serverTimestamp(), dealt: false };
      let ok = false, drop = false;
      try {
        await Promise.race([setDoc(doc(db, 'appErrors', id), data, { merge: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))]);
        ok = true;
      } catch (e) { drop = e && e.code === 'permission-denied'; }   // never going to be allowed: don't keep trying
      if (ok || drop) { const now = sweQueue(); const left = now.map(y => y.key === x.key ? Object.assign({}, y, { n: (y.n || 1) - (x.n || 1) }) : y).filter(y => (y.n || 0) > 0); sweSaveQueue(left); }
      else break;   // no real signal: try again later
    }
  } finally { sweFlushing = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE WORKER + "A new version is ready" bar (standards §15.2).
//  After an upload (with CACHE_NAME bumped), the new service worker installs
//  in the background and takes over; that's the moment the new files are
//  saved on the device. The bar then asks to reload onto them. It never
//  reloads by itself, and a page can stop it while something's unfinished
//  by setting window.swUpdateBlocker = () => 'reason' (or '' when it's fine).
//  Checks for an update when the app is opened or brought back to the
//  front, and every 30 minutes.
// ═══════════════════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  const swvHadController = !!navigator.serviceWorker.controller;   // first ever install isn't an "update"
  window.swvShowBar = function () {
    if (document.getElementById('swvBar')) return;
    const bar = document.createElement('div');
    bar.id = 'swvBar'; bar.className = 'swv-bar';
    bar.innerHTML = '<span>A new version of the app is ready.</span><button type="button">Update</button>';
    bar.querySelector('button').addEventListener('click', () => {
      const why = typeof window.swUpdateBlocker === 'function' ? window.swUpdateBlocker() : '';
      if (why) { bar.querySelector('span').textContent = why; bar.classList.add('wait'); return; }
      bar.querySelector('button').disabled = true;
      location.reload();
    });
    document.body.appendChild(bar);
    document.body.classList.add('swv-on');
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (swvHadController) window.swvShowBar(); });
  const swvRegister = () => {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      setInterval(check, 30 * 60000);
    }).catch(err => console.error('Service worker registration failed:', err));
  };
  if (document.readyState === 'complete') swvRegister(); else window.addEventListener('load', swvRegister);
}
