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
import { MEASURING_YEAR, seedBallots, seedChurches } from './seed.js';

const DB_KEY = 'acme-vote-db-v1';
const SESSION_KEY = 'acme-vote-session-v1';
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

export async function resetDemo() {
  save(freshDb());
  return respond(true);
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
  return respond({ measuringYear: db.measuringYear });
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
      b.status = 'closed';
      b.closedAt = Date.now();
      b.result = computeResult(db, b);
      if (b.electionId) afterElectionBallot(db, b);
      if (b.commissionId) afterSlateBallot(db, b);
      return b.result;
    })
  );
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
  return mutateElection(electionId, (e, db) => {
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
      description:
        e.series > 1
          ? `Nominations were reopened. This is ballot ${e.round} of the new round of voting.`
          : '',
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
  });
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
  return respond(
    mutate((db) => {
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
      return c.id;
    })
  );
}

export async function openSlateBallot(commissionId) {
  return respond(
    mutate((db) => {
      const c = db.commissions.find((x) => x.id === commissionId);
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
    })
  );
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
