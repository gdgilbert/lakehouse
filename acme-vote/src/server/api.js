// Mock server for the ACME voting demo.
//
// Everything the app would normally ask a server to do lives in this file:
// the church registry, delegate credentials, ballots, vote storage and
// tallying. Data is kept in the browser's localStorage. Every exported
// function is async so this module can be replaced by real HTTP calls
// without changing the screens.

import {
  BALLOT_TYPES,
  churchWeight,
  evaluateElectionRound,
  evaluateMotion,
} from './rules.js';
import { GROUPS, MEASURING_YEAR, seedBallots, seedChurches } from './seed.js';

const DB_KEY = 'acme-vote-db-v5'; // v5: Grace's figures changed for the slideshow
const SESSION_KEY = 'acme-vote-session-v2';
const CHANGE_EVENT = 'acme-vote-db-change';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

let memoryDb = null; // fallback when localStorage is unavailable

function freshDb() {
  return {
    version: 1,
    measuringYear: MEASURING_YEAR,
    churches: seedChurches(),
    ballots: seedBallots().map((b) => ({ ...b, createdAt: Date.now(), openedAt: b.status === 'open' ? Date.now() : null })),
    elections: [],
    commissions: [],
    demo: { autoNext: true, step: 0, tutorial: { seen: [], off: false } },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    if (memoryDb) return memoryDb;
  }
  const db = freshDb();
  save(db, false);
  return db;
}

function save(db, notify = true) {
  memoryDb = db;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* keep in memory only */
  }
  if (notify && typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
}

function mutate(fn) {
  const db = load();
  const out = fn(db);
  save(db);
  return out;
}

const respond = (value, ms = 0) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

const fail = (message) => Promise.reject(new Error(message));

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function receiptCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Call cb whenever data changes in this tab or another tab. Returns an unsubscribe function. */
export function subscribe(cb) {
  const onStorage = (e) => {
    if (e.key === DB_KEY) cb();
  };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Start the demo over. mode 'path' is the guided tutorial with set results;
 * mode 'free' lets the viewer choose each result. In free mode the opening
 * tips are skipped, since the viewer has already seen them.
 */
export async function resetDemo({ mode = 'path' } = {}) {
  const db = freshDb();
  db.demo.mode = mode;
  if (mode === 'free') db.demo.tutorial.seen = ['start', 'signin', 'home', 'voted:first', 'charts'];
  save(db);
  return respond(true);
}

// The result each guided-tutorial ballot is set to show (see README).
function scriptedTarget(b) {
  if (b.commissionId) return 'pass';                                  // slate passes
  if (b.electionId) {
    if (b.region || b.title.startsWith('Judicial Commission, Seat')) return 'pass'; // elected on ballot 1
    return b.round >= 3 ? 'combined' : 'fail';                         // runoff, split, combined score
  }
  if (b.type === 'procedural') return 'pass';
  if (b.type === 'budget') return 'fail';                              // passes church count, fails weighted
  if (b.type === 'amendment') return 'pass';                           // passes both
  if (b.threshold === 'twoThirds') return 'short';                     // majority, but short of two-thirds
  return 'pass';
}

// ---------------------------------------------------------------------------
// Delegate sign-in (demo only: a credential is a code printed on the delegate's card)
// ---------------------------------------------------------------------------

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(s) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export async function signInDelegate(credential) {
  const code = String(credential).replace(/\s/g, '');
  const church = load().churches.find((c) => c.credential.replace('-', '') === code.replace('-', ''));
  if (!church) return fail('That code was not recognized. Check the code on your delegate card.');
  writeSession({ role: 'delegate', churchId: church.id });
  return respond(publicChurch(church), 250);
}

export async function signInManager() {
  writeSession({ role: 'manager' });
  return respond(true);
}

export async function signOut() {
  writeSession(null);
  return respond(true);
}

export async function getSession() {
  return respond(readSession());
}

// ---------------------------------------------------------------------------
// Church registry
// ---------------------------------------------------------------------------

function publicChurch(c) {
  const w = churchWeight(c);
  return { ...c, weight: w.votes, weightReason: w.reason, contributionPct: w.percent };
}

export async function getMeta() {
  const db = load();
  return respond({ measuringYear: db.measuringYear, autoNext: demoState(db).autoNext });
}

// Tutorial tips: which ones the viewer has seen, and whether tips are turned off.
function tutorialState(db) {
  const d = demoState(db);
  if (!d.tutorial) d.tutorial = { seen: [], off: false };
  return d.tutorial;
}

export async function getTutorial() {
  const db = load();
  return respond({ ...tutorialState(db), mode: demoState(db).mode });
}

export async function markTipSeen(id) {
  return respond(mutate((db) => {
    const t = tutorialState(db);
    if (!t.seen.includes(id)) t.seen.push(id);
    return true;
  }));
}

export async function setTipsOff(off) {
  return respond(mutate((db) => { tutorialState(db).off = Boolean(off); return true; }));
}

export async function restartTutorial() {
  return respond(mutate((db) => { const t = tutorialState(db); t.seen = []; t.off = false; return true; }));
}

export async function setAutoNext(on) {
  return respond(mutate((db) => { demoState(db).autoNext = Boolean(on); return true; }));
}

export async function listChurches() {
  return respond(load().churches.map(publicChurch));
}

export async function getChurch(id) {
  const c = load().churches.find((x) => x.id === id);
  return c ? respond(publicChurch(c)) : fail('Church not found.');
}

export async function updateChurch(id, patch) {
  const allowed = ['budget', 'contributions', 'budgetCertified', 'fullYearMember', 'delegate', 'region'];
  return respond(
    mutate((db) => {
      const c = db.churches.find((x) => x.id === id);
      for (const k of allowed) if (k in patch) c[k] = patch[k];
      return publicChurch(c);
    })
  );
}

const eligible = (church, region) => !region || church.region === region;

// ---------------------------------------------------------------------------
// Ballots
// ---------------------------------------------------------------------------

function choiceList(b) {
  if (b.kind === 'candidates') return b.options.map((o) => o.id);
  return ['yes', 'no'];
}

function summarize(db, b, churchId) {
  const eligibleChurches = db.churches.filter((c) => eligible(c, b.region));
  const out = {
    ...b,
    votes: undefined,
    eligibleCount: eligibleChurches.length,
    votedCount: Object.keys(b.votes).length,
  };
  if (churchId) {
    const church = db.churches.find((c) => c.id === churchId);
    out.eligible = church ? eligible(church, b.region) : false;
    out.myVote = b.votes[churchId] || null;
  }
  return out;
}

function computeResult(db, b) {
  const votes = Object.values(b.votes);
  if (b.kind === 'candidates') {
    const names = Object.fromEntries(b.options.map((o) => [o.id, o.label]));
    return evaluateElectionRound(
      { round: b.round, threshold: b.threshold, names },
      votes,
      choiceList(b)
    );
  }
  return evaluateMotion(b, votes);
}

export async function listBallots({ churchId } = {}) {
  const db = load();
  return respond(db.ballots.map((b) => summarize(db, b, churchId)).reverse());
}

export async function getBallot(id, { churchId, includeVotes } = {}) {
  const db = load();
  const b = db.ballots.find((x) => x.id === id);
  if (!b) return fail('Ballot not found.');
  const out = summarize(db, b, churchId);
  if (includeVotes) out.votes = b.votes; // manager view
  if (b.status === 'closed') out.result = b.result;
  return respond(out);
}

export async function createMotion({ title, description, type, countRule, threshold, region }) {
  if (!title?.trim()) return fail('Enter a title.');
  const defaults = BALLOT_TYPES[type];
  return respond(
    mutate((db) => {
      const b = {
        id: uid('b'),
        kind: 'motion',
        type,
        title: title.trim(),
        description: (description || '').trim(),
        countRule: countRule || defaults.countRule,
        threshold: threshold || defaults.threshold,
        region: region || null,
        status: 'draft',
        options: [],
        votes: {},
        createdAt: Date.now(),
      };
      db.ballots.push(b);
      return b.id;
    })
  );
}

export async function deleteBallot(id) {
  return respond(
    mutate((db) => {
      const b = db.ballots.find((x) => x.id === id);
      if (b && b.status === 'draft' && b.kind === 'motion') db.ballots = db.ballots.filter((x) => x.id !== id);
      return true;
    })
  );
}

export async function openBallot(id) {
  return respond(
    mutate((db) => {
      const b = db.ballots.find((x) => x.id === id);
      if (b.status === 'draft') {
        b.status = 'open';
        b.openedAt = Date.now();
      }
      return true;
    })
  );
}

export async function closeBallot(id) {
  return respond(
    mutate((db) => {
      const b = db.ballots.find((x) => x.id === id);
      if (b.status !== 'open') return null;
      return closeInDb(db, b);
    })
  );
}

function closeInDb(db, b) {
  b.status = 'closed';
  b.closedAt = Date.now();
  b.result = computeResult(db, b);
  if (b.electionId) afterElectionBallot(db, b);
  if (b.commissionId) afterSlateBallot(db, b);
  demoAdvance(db, b);
  return b.result;
}

// ---------------------------------------------------------------------------
// Demo sequence: after a ballot closes, put up the next one so a presenter can
// walk through every kind of ballot without switching to the manager.
// Turn it off in the manager's Settings tab.
// ---------------------------------------------------------------------------

function demoState(db) {
  if (!db.demo) db.demo = { autoNext: true, step: 0 };
  if (!db.demo.mode) db.demo.mode = 'path';
  return db.demo;
}

function addMotion(db, spec) {
  const b = {
    id: uid('b'), kind: 'motion', options: [], votes: {}, region: null,
    status: 'open', createdAt: Date.now(), openedAt: Date.now(), ...spec,
  };
  db.ballots.push(b);
  return b;
}

function addElection(db, { office, names, threshold = 'majority', region = null }) {
  const e = newElection({ office, threshold, region });
  for (const n of names) e.candidates.push({ id: uid('p'), name: n, disqualified: false });
  db.elections.push(e);
  openNextInDb(e, db);
}

function sessionRegion(db) {
  const s = readSession();
  const c = s?.churchId && db.churches.find((x) => x.id === s.churchId);
  return c ? c.region : 'Midwest';
}

// Each step opens one ballot of a different kind.
// The tutorial's story ballots, in order. Each one opens when the one before it
// closes. Their stories (see STORY_VOTES) show what Double Majority Voting does.
const DEMO_STEPS = [
  (db) => { // everyone agrees: passes both counts easily
    const b = db.ballots.find((x) => x.id === 'b-demo-2');
    if (b && b.status === 'draft') { b.status = 'open'; b.openedAt = Date.now(); return true; }
    return false;
  },
  (db) => addMotion(db, { // size does not buy votes
    story: 'size', delegateChoice: 'no', type: 'spending', countRule: 'both', threshold: 'majority',
    title: 'Lease a downtown office',
    description: 'Spend $250,000 of reserves over five years to lease a downtown office for ACME staff.',
  }),
  (db) => addMotion(db, { // churches that give little cannot spend what others give
    story: 'spend', delegateChoice: 'no', type: 'spending', countRule: 'both', threshold: 'majority',
    title: 'Fund an advertising campaign',
    description: 'Spend $180,000 of next year\u2019s grant budget on a national radio and online advertising campaign for ACME.',
  }),
  (db) => addMotion(db, { // committed churches cannot overrule most churches
    story: 'impose', delegateChoice: 'yes', type: 'spending', countRule: 'both', threshold: 'majority',
    title: 'Give the conference budget to missions',
    description: 'Cancel the next National Conference and give its $200,000 budget to missionary grants instead.',
  }),
];

// How the other churches vote on each story ballot in the guided tutorial.
// (w = the church's weighted votes.) The margins are wide enough that the
// delegate's own vote, whatever it is, does not change the outcome.
const STORY_VOTES = {
  procedural: (c) => (['c07', 'c17'].includes(c.id) ? 'no' : 'yes'),
  // passes both counts
  agree: (c) => (c.id === 'c07' ? 'no' : c.id === 'c15' ? 'abstain' : 'yes'),
  // the large churches and their allies lose both counts
  size: (c, w) => (c.group === 'large-low' ? 'yes' : c.group === 'small-high' ? 'no'
    : c.group === 'mid' ? (w === 2 ? 'yes' : 'no') : (['c04', 'c07'].includes(c.id) ? 'yes' : 'no')),
  // most churches vote Yes, but they give little: passes the church count, fails the weighted count
  spend: (c, w) => (c.group === 'small-high' ? 'no' : c.group === 'mid' ? (w === 2 ? 'yes' : 'no') : 'yes'),
  // the committed churches vote Yes: passes the weighted count, fails the church count
  impose: (c, w) => (c.group === 'small-high' ? 'yes' : c.group === 'mid' ? (w === 3 ? 'yes' : 'no') : 'no'),
};

/** Run it yourself: fill in the other churches' votes by group, then close the ballot.
 *  choices: { [group]: 'yes' | 'no' | 'split' | 'abstain' } */
export async function demoFinishGroups(ballotId, choices) {
  return respond(
    mutate((db) => {
      const b = db.ballots.find((x) => x.id === ballotId);
      if (!b || b.status !== 'open') return null;
      const seen = {};
      for (const c of db.churches) {
        if (!eligible(c, b.region) || b.votes[c.id]) continue;
        const pick = choices[c.group] || 'abstain';
        seen[c.group] = (seen[c.group] || 0) + 1;
        const choice = pick === 'split' ? (seen[c.group] % 2 ? 'yes' : 'no') : pick;
        b.votes[c.id] = { choice, weight: churchWeight(c).votes, at: Date.now(), receipt: receiptCode() };
      }
      return closeInDb(db, b);
    })
  );
}

export async function getGroups() {
  return respond(GROUPS);
}

const FLOOR_NAMES = ['Scott Turner', 'Brian Kelly', 'Adam Ross', 'Ryan Hughes', 'Neil Foster'];

function demoAdvance(db, closed) {
  const d = demoState(db);
  if (!d.autoNext) return;

  // An undecided election goes straight to its next ballot (runoff, ballot 3, ballot 4).
  if (closed.electionId) {
    const e = db.elections.find((x) => x.id === closed.electionId);
    if (e.status === 'awaiting') { openNextInDb(e, db); return; }
    if (e.status === 'reopened') {
      e.candidates.push({ id: uid('p'), name: FLOOR_NAMES[e.series % FLOOR_NAMES.length], disqualified: false });
      e.candidates.push({ id: uid('p'), name: FLOOR_NAMES[(e.series + 2) % FLOOR_NAMES.length], disqualified: false });
      openNextInDb(e, db);
      return;
    }
  }
  // A failed slate or a filled seat leaves the next seat taking nominations: nominate and open it.
  const seat = db.elections.find((x) => x.commissionId && x.status === 'nominating');
  if (seat) {
    const c = db.commissions.find((x) => x.id === seat.commissionId);
    const pres = c.nominees.filter((n) => !c.members.includes(n)).slice(0, 2);
    const floor = FLOOR_NAMES[(seat.seat - 1) % FLOOR_NAMES.length];
    for (const n of [...pres, floor]) seat.candidates.push({ id: uid('p'), name: n, disqualified: false });
    openNextInDb(seat, db);
    return;
  }

  if (db.ballots.some((x) => x.status === 'open')) return; // something is already up
  while (d.step < DEMO_STEPS.length) {
    const made = DEMO_STEPS[d.step](db);
    d.step += 1;
    if (made !== false) return;
  }
}

function recordVote(db, ballotId, churchId, choice) {
  const b = db.ballots.find((x) => x.id === ballotId);
  const church = db.churches.find((c) => c.id === churchId);
  if (!b || !church) throw new Error('Ballot or church not found.');
  if (b.status !== 'open') throw new Error('This ballot is not open.');
  if (!eligible(church, b.region)) throw new Error(`This ballot is for ${b.region} churches only.`);
  if (b.votes[churchId]) throw new Error('This church has already voted on this ballot.');
  if (choice !== 'abstain' && !choiceList(b).includes(choice)) throw new Error('Invalid choice.');
  // The church's weight is fixed at the moment it votes.
  const weight = churchWeight(church).votes;
  const v = { choice, weight, at: Date.now(), receipt: receiptCode() };
  b.votes[churchId] = v;
  return v;
}

/** A delegate casts all of the church's votes for one choice. */
export async function castVote(ballotId, choice) {
  const s = readSession();
  if (!s || s.role !== 'delegate') return fail('Sign in as a delegate to vote.');
  try {
    return respond(mutate((db) => recordVote(db, ballotId, s.churchId, choice)), 400);
  } catch (e) {
    return fail(e.message);
  }
}

// Demo helpers for the manager: record a vote for any church, or fill the rest at random.
export async function demoRecordVote(ballotId, churchId, choice) {
  try {
    return respond(mutate((db) => recordVote(db, ballotId, churchId, choice)));
  } catch (e) {
    return fail(e.message);
  }
}

/** Run it yourself: the other churches vote at random, then the ballot closes.
 *  Each ballot gets its own random lean, so results vary from run to run. */
export async function demoFinishRandom(ballotId) {
  return respond(
    mutate((db) => {
      const b = db.ballots.find((x) => x.id === ballotId);
      if (!b || b.status !== 'open') return null;
      const choices = choiceList(b);
      const lean = 0.2 + Math.random() * 0.6; // how strongly this ballot leans Yes
      for (const c of db.churches) {
        if (!eligible(c, b.region) || b.votes[c.id]) continue;
        let choice;
        if (Math.random() < 0.05) choice = 'abstain';
        else if (b.kind === 'motion') choice = Math.random() < lean ? 'yes' : 'no';
        else choice = choices[Math.floor(Math.random() * choices.length)];
        b.votes[c.id] = { choice, weight: churchWeight(c).votes, at: Date.now(), receipt: receiptCode() };
      }
      return closeInDb(db, b);
    })
  );
}

export async function demoFillRemaining(ballotId) {
  return respond(
    mutate((db) => {
      const b = db.ballots.find((x) => x.id === ballotId);
      const choices = choiceList(b);
      for (const c of db.churches) {
        if (!eligible(c, b.region) || b.votes[c.id]) continue;
        const r = Math.random();
        let choice;
        if (r < 0.08) choice = 'abstain';
        else if (b.kind === 'motion') choice = r < 0.7 ? 'yes' : 'no';
        else choice = choices[Math.floor(Math.random() * choices.length)];
        recordVote(db, ballotId, c.id, choice);
      }
      return true;
    })
  );
}

/**
 * Demo only: fill in votes for the churches that have not voted so the ballot
 * comes out the way the presenter wants, then close it and count it.
 *   motions:   target 'pass' or 'fail'. A failing two-count motion is set up,
 *              when possible, to pass the church count and fail the weighted
 *              count, since that is the case the committee most needs to see.
 *   elections: target 'pass' (someone is elected, preferably the delegate's
 *              choice) or 'fail' (no one is elected, preferably a split).
 * The votes are random within those limits, so each run looks different.
 */
export async function demoFinishBallot(ballotId, target = 'pass', favoredChoice = null) {
  return respond(
    mutate((db) => {
      const b = db.ballots.find((x) => x.id === ballotId);
      if (!b || b.status !== 'open') return null;
      if (target === 'script' && STORY_VOTES[b.story]) {
        for (const c of db.churches) {
          if (!eligible(c, b.region) || b.votes[c.id]) continue;
          const w = churchWeight(c).votes;
          b.votes[c.id] = { choice: STORY_VOTES[b.story](c, w), weight: w, at: Date.now(), receipt: receiptCode() };
        }
        return closeInDb(db, b);
      }
      if (target === 'script') target = scriptedTarget(b);
      const remaining = db.churches.filter((c) => eligible(c, b.region) && !b.votes[c.id]);
      const choices = choiceList(b);
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const favored = favoredChoice && choices.includes(favoredChoice) ? favoredChoice : pick(choices);

      const plan = (attempt) => {
        const strict = attempt < 400; // first look for the more illustrative result
        const r = Math.random();
        if (b.kind === 'motion') {
          if (target === 'short') {
            const pYes = 0.54 + 0.1 * r;
            return () => (Math.random() < 0.04 ? 'abstain' : Math.random() < pYes ? 'yes' : 'no');
          }
          if (target === 'pass') {
            const pYes = 0.62 + 0.25 * r;
            return (c) => (Math.random() < 0.05 ? 'abstain' : Math.random() < pYes ? 'yes' : 'no');
          }
          if (strict && b.countRule === 'both') {
            // small churches lean yes, large-weight churches lean no
            return (c) => {
              if (Math.random() < 0.04) return 'abstain';
              const w = churchWeight(c).votes;
              return Math.random() < (w <= 2 ? 0.85 : 0.15) ? 'yes' : 'no';
            };
          }
          const pYes = 0.15 + 0.4 * r;
          return () => (Math.random() < 0.05 ? 'abstain' : Math.random() < pYes ? 'yes' : 'no');
        }
        // elections
        if (target === 'pass') {
          const p = 0.55 + 0.4 * r;
          return () => (Math.random() < 0.04 ? 'abstain' : Math.random() < p ? favored : pick(choices));
        }
        if ((strict || target === 'combined') && choices.length >= 2) {
          const [a, bb] = [favored, pick(choices.filter((x) => x !== favored))];
          return (c) => {
            if (Math.random() < 0.04) return 'abstain';
            const w = churchWeight(c).votes;
            const lean = w <= 2 ? a : bb;
            return Math.random() < 0.8 ? lean : pick(choices);
          };
        }
        return () => (Math.random() < 0.04 ? 'abstain' : pick(choices));
      };

      const ok = (result, attempt) => {
        const strict = attempt < 400;
        if (b.kind === 'motion') {
          if (target === 'short') return !result.passed && result.churchYesPct > 50 && result.weightedYesPct > 50;
          if (target === 'pass') return result.passed;
          if (result.passed) return false;
          if (strict && b.countRule === 'both') return result.churchPass && !result.weightedPass;
          return true;
        }
        if (target === 'pass') {
          if (result.outcome !== 'elected') return false;
          if (!strict) return true;
          const win = result.standings.rows.find((x) => x.id === result.winner);
          return result.winner === favored && win.churchPct < 100; // a win, but not a unanimous one
        }
        if (target === 'combined') {
          if (result.outcome !== 'elected') return false;
          const win = result.standings.rows.find((x) => x.id === result.winner);
          return !strict || !(win.carriesChurch && win.carriesWeighted);
        }
        if (result.outcome === 'elected' || result.outcome === 'repeat') return false;
        if (!strict) return true;
        const rows = result.standings.rows;
        const ch = rows.find((x) => x.carriesChurch);
        const wt = rows.find((x) => x.carriesWeighted);
        return Boolean(ch && wt && ch.id !== wt.id) || b.round >= 3;
      };

      let chosen = null;
      for (let attempt = 0; attempt < 800 && !chosen; attempt++) {
        const fn = plan(attempt);
        const trial = { ...b.votes };
        for (const c of remaining) {
          trial[c.id] = { choice: fn(c), weight: churchWeight(c).votes, at: Date.now(), receipt: receiptCode() };
        }
        if (ok(computeResult(db, { ...b, votes: trial }), attempt)) chosen = trial;
      }
      if (!chosen) {
        // The votes already cast make the requested result impossible; fill at random.
        chosen = { ...b.votes };
        for (const c of remaining) {
          chosen[c.id] = { choice: pick(choices), weight: churchWeight(c).votes, at: Date.now(), receipt: receiptCode() };
        }
      }
      b.votes = chosen;
      return closeInDb(db, b);
    })
  );
}

/** Everything needed to chart a closed ballot: the result plus each church's vote. */
export async function getBallotDetails(id) {
  const db = load();
  const b = db.ballots.find((x) => x.id === id);
  if (!b) return fail('Ballot not found.');
  if (b.status !== 'closed') return fail('Details are available after voting closes.');
  const rows = db.churches
    .filter((c) => eligible(c, b.region))
    .map((c) => {
      const v = b.votes[c.id];
      return {
        churchId: c.id,
        name: c.name,
        region: c.region,
        weight: v ? v.weight : churchWeight(c).votes,
        contributions: c.contributions,
        group: c.group,
        choice: v ? v.choice : null, // null = did not vote
      };
    });
  return respond({ ...summarize(db, b), result: b.result, rows });
}

// ---------------------------------------------------------------------------
// Elections
// ---------------------------------------------------------------------------

export async function listElections() {
  return respond(load().elections.slice().reverse());
}

export async function getElection(id) {
  const db = load();
  const e = db.elections.find((x) => x.id === id);
  if (!e) return fail('Election not found.');
  const ballots = e.ballotIds.map((bid) => summarize(db, db.ballots.find((b) => b.id === bid)));
  const commission = e.commissionId ? db.commissions.find((c) => c.id === e.commissionId) : null;
  return respond({ ...e, ballots, commission });
}

function newElection({ office, threshold = 'majority', region = null, commissionId = null, seat = null }) {
  return {
    id: uid('e'),
    office,
    threshold,
    region,
    commissionId,
    seat,
    status: 'nominating', // nominating | voting | awaiting | elected | reopened
    candidates: [],
    round: 0,
    series: 1,
    nextCandidateIds: null,
    ballotIds: [],
    history: [],
    winnerId: null,
    createdAt: Date.now(),
  };
}

export async function createElection({ office, threshold, region, candidates = [] }) {
  if (!office?.trim()) return fail('Enter the office.');
  return respond(
    mutate((db) => {
      const e = newElection({ office: office.trim(), threshold, region });
      for (const n of candidates) if (n.trim()) e.candidates.push({ id: uid('p'), name: n.trim(), disqualified: false });
      db.elections.push(e);
      return e.id;
    })
  );
}

export async function addCandidate(electionId, name) {
  if (!name?.trim()) return fail('Enter a name.');
  return mutateElection(electionId, (e, db) => {
    if (!['nominating', 'reopened'].includes(e.status)) throw new Error('Nominations are closed.');
    const n = name.trim();
    if (e.commissionId) {
      const c = db.commissions.find((x) => x.id === e.commissionId);
      if (c.members.some((m) => m.toLowerCase() === n.toLowerCase())) {
        throw new Error(`${n} already holds a seat on the Judicial Commission.`);
      }
    }
    const existing = e.candidates.find((c) => c.name.toLowerCase() === n.toLowerCase());
    if (existing?.disqualified) throw new Error(`${n} was disqualified in this election.`);
    if (existing) throw new Error(`${n} is already nominated.`);
    e.candidates.push({ id: uid('p'), name: n, disqualified: false, series: e.series });
  });
}

export async function removeCandidate(electionId, candidateId) {
  return mutateElection(electionId, (e) => {
    if (!['nominating', 'reopened'].includes(e.status)) throw new Error('Nominations are closed.');
    e.candidates = e.candidates.filter((c) => c.id !== candidateId || c.disqualified);
  });
}

function mutateElection(id, fn) {
  try {
    return respond(
      mutate((db) => {
        const e = db.elections.find((x) => x.id === id);
        if (!e) throw new Error('Election not found.');
        fn(e, db);
        return true;
      })
    );
  } catch (err) {
    return fail(err.message);
  }
}

/** Create and open the next ballot of an election. */
export async function openNextElectionBallot(electionId) {
  return mutateElection(electionId, (e, db) => openNextInDb(e, db));
}

function openNextInDb(e, db) {
    let ids;
    if (e.status === 'nominating' || e.status === 'reopened') {
      ids = e.candidates.filter((c) => !c.disqualified).map((c) => c.id);
      if (ids.length < 1) throw new Error('Add at least one nominee.');
      e.round = 1;
    } else if (e.status === 'awaiting') {
      ids = e.nextCandidateIds;
      e.round += 1;
    } else {
      throw new Error('No ballot can be opened now.');
    }
    const byId = Object.fromEntries(e.candidates.map((c) => [c.id, c]));
    const label = e.round === 2 && ids.length === 2 ? ' (runoff)' : '';
    const b = {
      id: uid('b'),
      kind: 'candidates',
      type: 'election',
      title: `${e.office}: Ballot ${e.round}${label}`,
      description: roundDescription(e, ids.length),
      countRule: 'both',
      threshold: e.threshold,
      region: e.region,
      status: 'open',
      options: ids.map((id) => ({ id, label: byId[id].name })),
      votes: {},
      electionId: e.id,
      round: e.round,
      series: e.series,
      createdAt: Date.now(),
      openedAt: Date.now(),
    };
    db.ballots.push(b);
    e.ballotIds.push(b.id);
    e.status = 'voting';
    e.nextCandidateIds = null;
}

// What each ballot of an election is, in plain words, shown on the ballot.
function roundDescription(e, count) {
  const reopened = e.series > 1 ? 'Nominations were reopened after a tie. ' : '';
  if (e.round === 1) {
    return reopened + `A candidate must win a majority of the votes cast in both counts. If no one does, the two candidates with the highest combined scores go to a runoff.`;
  }
  if (e.round === 2) {
    return reopened + `Runoff between the ${count === 2 ? 'two' : count} candidates with the highest combined scores. A candidate must still win a majority in both counts. If the runoff splits, there is a third ballot.`;
  }
  if (e.round === 3) {
    return 'Third ballot. This ballot is final unless the combined scores tie: if the counts split, the higher combined score wins.';
  }
  return 'Fourth and final ballot. If the combined scores tie again, both candidates are disqualified and nominations are reopened.';
}

function afterElectionBallot(db, b) {
  const e = db.elections.find((x) => x.id === b.electionId);
  const r = b.result;
  e.history.push({ ballotId: b.id, round: b.round, series: b.series, outcome: r.outcome, explanation: r.explanation });
  if (r.outcome === 'elected') {
    e.status = 'elected';
    e.winnerId = r.winner;
    if (e.commissionId) afterSeatFilled(db, e);
  } else if (r.outcome === 'disqualified') {
    for (const c of e.candidates) if (r.disqualified.includes(c.id)) c.disqualified = true;
    e.status = 'reopened';
    e.round = 0;
    e.series += 1;
  } else {
    e.status = 'awaiting';
    e.nextCandidateIds = r.advancing;
    if (r.outcome === 'repeat') e.round -= 1; // take the same ballot number again
  }
}

// ---------------------------------------------------------------------------
// Judicial Commission
// ---------------------------------------------------------------------------

export async function listCommissions() {
  return respond(load().commissions.slice().reverse());
}

export async function getCommission(id) {
  const db = load();
  const c = db.commissions.find((x) => x.id === id);
  if (!c) return fail('Not found.');
  const slate = c.slateBallotId ? db.ballots.find((b) => b.id === c.slateBallotId) : null;
  const seats = c.seats.map((s) => {
    const e = db.elections.find((x) => x.id === s.electionId);
    return { ...s, status: e?.status, winner: e?.winnerId ? e.candidates.find((p) => p.id === e.winnerId)?.name : null };
  });
  return respond({ ...c, slate: slate ? { ...summarize(db, slate), result: slate.result } : null, seats });
}

export async function createCommission({ nominees }) {
  const names = nominees.map((n) => n.trim()).filter(Boolean);
  if (names.length !== 5) return fail('Enter all five of the President’s nominees.');
  return respond(mutate((db) => createCommissionInDb(db, names).id));
}

function createCommissionInDb(db, names) {
      const c = {
        id: uid('jc'),
        nominees: names,
        status: 'draft', // draft | slate | seats | complete
        slateBallotId: null,
        seats: [],
        members: [],
        createdAt: Date.now(),
      };
      db.commissions.push(c);
      return c;
}

export async function openSlateBallot(commissionId) {
  return respond(mutate((db) => openSlateInDb(db, db.commissions.find((x) => x.id === commissionId))));
}

function openSlateInDb(db, c) {
      if (c.status !== 'draft') return false;
      const b = {
        id: uid('b'),
        kind: 'motion',
        type: 'election',
        title: 'Judicial Commission: President’s slate',
        description: `Elect the President’s five nominees as a single slate: ${c.nominees.join(', ')}.`,
        countRule: 'both',
        threshold: 'majority',
        region: null,
        status: 'open',
        options: [],
        votes: {},
        commissionId: c.id,
        createdAt: Date.now(),
        openedAt: Date.now(),
      };
      db.ballots.push(b);
      c.slateBallotId = b.id;
      c.status = 'slate';
      return true;
}

function afterSlateBallot(db, b) {
  const c = db.commissions.find((x) => x.id === b.commissionId);
  if (b.result.passed) {
    c.members = c.nominees.slice();
    c.status = 'complete';
  } else {
    c.status = 'seats';
    openSeat(db, c, 1);
  }
}

function openSeat(db, c, seat) {
  const e = newElection({ office: `Judicial Commission, Seat ${seat}`, commissionId: c.id, seat });
  db.elections.push(e);
  c.seats.push({ seat, electionId: e.id });
}

function afterSeatFilled(db, e) {
  const c = db.commissions.find((x) => x.id === e.commissionId);
  c.members.push(e.candidates.find((p) => p.id === e.winnerId).name);
  if (e.seat < 5) openSeat(db, c, e.seat + 1);
  else c.status = 'complete';
}
