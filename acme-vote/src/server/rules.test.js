import test from 'node:test';
import assert from 'node:assert/strict';
import { churchWeight, evaluateMotion, evaluateElectionRound } from './rules.js';

const ch = (budget, contributions, o = {}) => ({ budget, contributions, budgetCertified: true, fullYearMember: true, ...o });

test('weight bands, including exact boundaries', () => {
  assert.equal(churchWeight(ch(100000, 1999)).votes, 1);
  assert.equal(churchWeight(ch(100000, 2000)).votes, 2);
  assert.equal(churchWeight(ch(100000, 2999)).votes, 2);
  assert.equal(churchWeight(ch(100000, 3000)).votes, 3);
  assert.equal(churchWeight(ch(100000, 3999)).votes, 3);
  assert.equal(churchWeight(ch(100000, 4000)).votes, 4);
  assert.equal(churchWeight(ch(100000, 9000)).votes, 4);
});

test('uncertified or partial-year church gets 1 vote', () => {
  assert.equal(churchWeight(ch(100000, 9000, { budgetCertified: false })).votes, 1);
  assert.equal(churchWeight(ch(100000, 9000, { fullYearMember: false })).votes, 1);
});

const v = (choice, weight) => ({ choice, weight });

test('motion: abstentions are not votes cast', () => {
  const r = evaluateMotion({ countRule: 'both', threshold: 'majority' }, [v('yes', 1), v('no', 1), v('yes', 1), v('abstain', 4), v('abstain', 4)]);
  assert.equal(r.tally.church.cast, 3);
  assert.ok(r.passed);
});

test('motion: exact majority tie fails; 75% exactly passes', () => {
  assert.equal(evaluateMotion({ countRule: 'church', threshold: 'majority' }, [v('yes', 1), v('no', 1)]).passed, false);
  const votes = [v('yes', 1), v('yes', 1), v('yes', 1), v('no', 1)];
  assert.equal(evaluateMotion({ countRule: 'both', threshold: 'threeQuarters' }, votes).passed, true);
  assert.equal(evaluateMotion({ countRule: 'both', threshold: 'twoThirds' }, [v('yes', 1), v('yes', 1), v('no', 1)]).passed, true);
});

test('motion: both counts required unless church only', () => {
  // 3 small churches yes (1 each), 2 big churches no (4 each)
  const votes = [v('yes', 1), v('yes', 1), v('yes', 1), v('no', 4), v('no', 4)];
  const both = evaluateMotion({ countRule: 'both', threshold: 'majority' }, votes);
  assert.equal(both.churchPass, true);
  assert.equal(both.weightedPass, false);
  assert.equal(both.passed, false);
  assert.equal(evaluateMotion({ countRule: 'church', threshold: 'majority' }, votes).passed, true);
});

test('election round 1 split goes to runoff of top two by combined score', () => {
  // A: 3 churches x1 = 3 church, 3 weighted. B: 2 churches x4 = 2, 8. C: 2 x1 = 2, 2.
  const votes = [v('A', 1), v('A', 1), v('A', 1), v('B', 4), v('B', 4), v('C', 1), v('C', 1)];
  const r = evaluateElectionRound({ round: 1, threshold: 'majority' }, votes, ['A', 'B', 'C']);
  assert.equal(r.outcome, 'runoff');
  assert.deepEqual(r.advancing.sort(), ['A', 'B']);
});

test('election round 3 split decided by combined score', () => {
  // A: 3 of 5 churches (60%), 3 of 11 weighted (27.3%) => 87.3
  // B: 2 of 5 (40%), 8 of 11 (72.7%) => 112.7
  const votes = [v('A', 1), v('A', 1), v('A', 1), v('B', 4), v('B', 4)];
  const r2 = evaluateElectionRound({ round: 2, threshold: 'majority' }, votes, ['A', 'B']);
  assert.equal(r2.outcome, 'next');
  const r3 = evaluateElectionRound({ round: 3, threshold: 'majority' }, votes, ['A', 'B']);
  assert.equal(r3.outcome, 'elected');
  assert.equal(r3.winner, 'B');
});

test('election combined tie on ballot 3 goes to ballot 4, then disqualifies', () => {
  const votes = [v('A', 2), v('B', 2)];
  assert.equal(evaluateElectionRound({ round: 3, threshold: 'majority' }, votes, ['A', 'B']).outcome, 'next');
  const r4 = evaluateElectionRound({ round: 4, threshold: 'majority' }, votes, ['A', 'B']);
  assert.equal(r4.outcome, 'disqualified');
  assert.deepEqual(r4.disqualified.sort(), ['A', 'B']);
});

test('election: carrying both counts on ballot 1 elects', () => {
  const votes = [v('A', 4), v('A', 1), v('B', 1)];
  const r = evaluateElectionRound({ round: 1, threshold: 'majority' }, votes, ['A', 'B']);
  assert.equal(r.outcome, 'elected');
  assert.equal(r.winner, 'A');
});
