// ACME voting rules. Pure functions only: no storage, no UI.
// Every count here is done in whole numbers so percentages at a boundary
// (exactly 2%, exactly 75%, and so on) are decided exactly.

export const REGIONS = ['Midwest', 'Northeast', 'Southeast', 'Southwest', 'West'];

export const THRESHOLDS = {
  majority: {
    label: 'Majority of votes cast',
    short: 'Majority',
    // more than half
    test: (votesFor, cast) => cast > 0 && 2 * votesFor > cast,
  },
  twoThirds: {
    label: 'Two-thirds of votes cast',
    short: 'Two-thirds',
    test: (votesFor, cast) => cast > 0 && 3 * votesFor >= 2 * cast,
  },
  threeQuarters: {
    label: '75% of votes cast',
    short: '75%',
    test: (votesFor, cast) => cast > 0 && 4 * votesFor >= 3 * cast,
  },
};

export const COUNT_RULES = {
  both: 'Must pass both counts',
  church: 'Church count only',
};

export const BALLOT_TYPES = {
  election: { label: 'Election', countRule: 'both', threshold: 'majority' },
  budget: { label: 'Budget approval', countRule: 'both', threshold: 'majority' },
  amendment: { label: 'Amendment', countRule: 'both', threshold: 'threeQuarters' },
  procedural: { label: 'Procedural motion', countRule: 'church', threshold: 'majority' },
};

// ---------------------------------------------------------------------------
// Weighted votes for one church
// ---------------------------------------------------------------------------

/**
 * @param {{budget:number, contributions:number, budgetCertified:boolean, fullYearMember:boolean}} church
 * @returns {{votes:number, percent:number|null, reason:string}}
 */
export function churchWeight(church) {
  const { budget, contributions, budgetCertified, fullYearMember } = church;
  const percent = budget > 0 ? (contributions / budget) * 100 : null;

  if (!fullYearMember) {
    return { votes: 1, percent, reason: 'Not a member for the whole measuring year' };
  }
  if (!budgetCertified) {
    return { votes: 1, percent, reason: 'Budget not certified by the elders' };
  }
  if (!(budget > 0)) {
    return { votes: 1, percent, reason: 'No adopted budget on file' };
  }
  // Compare contributions * 100 against budget * N to avoid rounding errors.
  const c = contributions * 100;
  if (c < 2 * budget) return { votes: 1, percent, reason: 'Contributions under 2% of budget' };
  if (c < 3 * budget) return { votes: 2, percent, reason: 'Contributions 2% to under 3% of budget' };
  if (c < 4 * budget) return { votes: 3, percent, reason: 'Contributions 3% to under 4% of budget' };
  return { votes: 4, percent, reason: 'Contributions 4% or more of budget' };
}

// ---------------------------------------------------------------------------
// Tallying
// ---------------------------------------------------------------------------

/**
 * Count recorded votes both ways.
 * @param {Array<{choice:string, weight:number}>} votes  one entry per church
 * @param {string[]} choiceIds  the choices that count as votes cast (not 'abstain')
 */
export function tally(votes, choiceIds) {
  const church = { cast: 0, abstain: 0, by: {} };
  const weighted = { cast: 0, abstain: 0, by: {} };
  for (const id of choiceIds) {
    church.by[id] = 0;
    weighted.by[id] = 0;
  }
  for (const v of votes) {
    if (v.choice === 'abstain' || !(v.choice in church.by)) {
      church.abstain += 1;
      weighted.abstain += v.weight;
      continue;
    }
    church.by[v.choice] += 1;
    church.cast += 1;
    weighted.by[v.choice] += v.weight;
    weighted.cast += v.weight;
  }
  return { church, weighted, churchesVoting: votes.length };
}

const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);

/** Result of a yes/no motion. */
export function evaluateMotion({ countRule, threshold }, votes) {
  const t = tally(votes, ['yes', 'no']);
  const test = THRESHOLDS[threshold].test;
  const churchPass = test(t.church.by.yes, t.church.cast);
  const weightedPass = test(t.weighted.by.yes, t.weighted.cast);
  const passed = countRule === 'church' ? churchPass : churchPass && weightedPass;

  let explanation;
  if (t.church.cast === 0) {
    explanation = 'No votes were cast, so the motion fails.';
  } else if (countRule === 'church') {
    explanation = churchPass
      ? `Passed the church count (${THRESHOLDS[threshold].short.toLowerCase()} needed). The weighted count does not decide this ballot.`
      : `Did not reach ${THRESHOLDS[threshold].label.toLowerCase()} in the church count.`;
  } else if (passed) {
    explanation = 'Passed both the church count and the weighted count.';
  } else if (churchPass) {
    explanation = 'Passed the church count but not the weighted count. It must pass both.';
  } else if (weightedPass) {
    explanation = 'Passed the weighted count but not the church count. It must pass both.';
  } else {
    explanation = 'Did not pass either count.';
  }

  return {
    kind: 'motion',
    tally: t,
    churchPass,
    weightedPass,
    passed,
    churchYesPct: pct(t.church.by.yes, t.church.cast),
    weightedYesPct: pct(t.weighted.by.yes, t.weighted.cast),
    explanation,
  };
}

/** Per-candidate standings for one election ballot, sorted by combined score. */
export function candidateStandings(votes, candidateIds, threshold) {
  const t = tally(votes, candidateIds);
  const test = THRESHOLDS[threshold].test;
  const rows = candidateIds.map((id) => {
    const cv = t.church.by[id];
    const wv = t.weighted.by[id];
    const churchPct = pct(cv, t.church.cast);
    const weightedPct = pct(wv, t.weighted.cast);
    return {
      id,
      churchVotes: cv,
      weightedVotes: wv,
      churchPct,
      weightedPct,
      // Combined score is compared exactly as a fraction: cv/C + wv/W.
      combined: churchPct + weightedPct,
      carriesChurch: test(cv, t.church.cast),
      carriesWeighted: test(wv, t.weighted.cast),
    };
  });
  rows.sort((a, b) => compareCombined(b, a, t) || candidateIds.indexOf(a.id) - candidateIds.indexOf(b.id));
  return { tally: t, rows };
}

// Exact comparison of combined scores: a.cv/C + a.wv/W vs b.cv/C + b.wv/W
// multiply through by C*W: (a.cv - b.cv)*W + (a.wv - b.wv)*C
function compareCombined(a, b, t) {
  const C = t.church.cast;
  const W = t.weighted.cast;
  const diff = (a.churchVotes - b.churchVotes) * W + (a.weightedVotes - b.weightedVotes) * C;
  return Math.sign(diff);
}

/**
 * Decide one round of an election.
 * round 1 and 2: a candidate must carry both counts.
 *   round 1 with no winner -> runoff between the top two by combined score.
 *   round 2 with no winner -> ballot 3 with the same candidates.
 * round 3 and 4: a candidate who carries both counts wins; otherwise the
 *   higher combined score wins. A tie on round 3 goes to round 4. A tie on
 *   round 4 disqualifies the tied candidates.
 *
 * @returns {{outcome:'elected'|'runoff'|'next'|'disqualified'|'repeat', winner?:string,
 *            advancing?:string[], disqualified?:string[], explanation:string, standings}}
 */
export function evaluateElectionRound({ round, threshold, names }, votes, candidateIds) {
  const standings = candidateStandings(votes, candidateIds, threshold);
  const { rows, tally: t } = standings;
  const name = (id) => (names && names[id]) || id;
  const base = { standings };

  if (t.church.cast === 0) {
    return {
      ...base,
      outcome: 'repeat',
      advancing: candidateIds,
      explanation: 'No votes were cast. This ballot must be taken again.',
    };
  }

  const carriers = rows.filter((r) => r.carriesChurch && r.carriesWeighted);
  if (carriers.length === 1) {
    return {
      ...base,
      outcome: 'elected',
      winner: carriers[0].id,
      explanation: `${name(carriers[0].id)} carried both the church count and the weighted count.`,
    };
  }

  if (round <= 2) {
    const advancing = topTwo(rows, t);
    const splitNote = describeSplit(rows, name);
    if (round === 1) {
      return {
        ...base,
        outcome: 'runoff',
        advancing,
        explanation:
          `No candidate carried both counts.${splitNote} ` +
          `Ballot 2 is a runoff between the top two by combined score: ${advancing.map(name).join(' and ')}.`,
      };
    }
    return {
      ...base,
      outcome: 'next',
      advancing,
      explanation:
        `No candidate carried both counts.${splitNote} ` +
        'On ballot 3, if neither candidate carries both counts, the higher combined score wins.',
    };
  }

  // Round 3 or later: combined score decides.
  const top = rows[0];
  const tied = rows.filter((r) => compareCombined(r, top, t) === 0);
  if (tied.length === 1) {
    return {
      ...base,
      outcome: 'elected',
      winner: top.id,
      explanation:
        `No candidate carried both counts, so the higher combined score decides. ` +
        `${name(top.id)} has ${fmt(top.churchPct)}% + ${fmt(top.weightedPct)}% = ${fmt(top.combined)}.`,
    };
  }
  const tiedIds = tied.map((r) => r.id);
  if (round === 3) {
    return {
      ...base,
      outcome: 'next',
      advancing: tiedIds,
      explanation: `The combined scores are tied (${fmt(top.combined)}). A 4th ballot is taken and scored the same way.`,
    };
  }
  return {
    ...base,
    outcome: 'disqualified',
    disqualified: tiedIds,
    explanation:
      `The combined scores tied again on ballot ${round}. ${tiedIds.map(name).join(' and ')} ` +
      'are disqualified. The manager must reopen nominations.',
  };
}

// Top two by combined score. If several candidates tie for second place,
// all of them advance (see README: the rules do not say how to break that tie).
function topTwo(rows, t) {
  if (rows.length <= 2) return rows.map((r) => r.id);
  const second = rows[1];
  return rows.filter((r, i) => i < 2 || compareCombined(r, second, t) === 0).map((r) => r.id);
}

function describeSplit(rows, name) {
  const ch = rows.find((r) => r.carriesChurch);
  const wt = rows.find((r) => r.carriesWeighted);
  if (ch && wt && ch.id !== wt.id) {
    return ` ${name(ch.id)} carried the church count and ${name(wt.id)} carried the weighted count.`;
  }
  if (ch) return ` ${name(ch.id)} carried the church count only.`;
  if (wt) return ` ${name(wt.id)} carried the weighted count only.`;
  return '';
}

export const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);
