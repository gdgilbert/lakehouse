// Tutorial tips. Each function returns the tips for one screen, in the order
// they should appear. A tip is shown once (tracked by id) and has one or more
// pages. `target` is a CSS selector for the element the tip points to; that
// element gets a highlight while the tip is open.
//
// All of the wording lives here so it can be revised in one place.

import { MEASURING_YEAR } from './server/seed.js';
import { fmt } from './server/rules.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const pct = (n, d) => (d > 0 ? fmt((n / d) * 100) : '0.0');

/** Which kind of ballot this is, for choosing the right explanation. */
export function ballotKind(b) {
  if (b.commissionId) return 'slate';
  if (b.electionId) {
    if (b.title.startsWith('Judicial Commission, Seat')) return 'seat';
    if (b.region) return 'regional';
    return 'election';
  }
  if (b.type === 'procedural') return 'procedural';
  if (b.type === 'budget') return 'budget';
  if (b.type === 'amendment') return 'amendment';
  if (b.threshold === 'twoThirds') return 'special';
  return 'motion';
}

// ---------------------------------------------------------------------------
// Opening, sign-in, home
// ---------------------------------------------------------------------------

export function startTips(mode = 'path') {
  return [{
    id: 'start',
    target: '.start-btn',
    placement: 'bottom',
    pages: [
      {
        title: 'Welcome',
        body: 'This tutorial shows how Double Majority Voting would work at the ACME National Business Meeting. You will vote as the delegate for one Member Church on each kind of ballot. Notes like this one explain each step.',
      },
      {
        title: 'The main idea',
        body: 'Under Double Majority Voting, most decisions are counted two ways: once with one vote per church, and once with each church’s votes weighted by its giving to ACME as a share of its own budget. A motion or candidate must win in both counts. Some ballots, such as procedural motions, use only the first count. The tutorial shows when each is used and why.',
      },
      {
        title: 'How the tutorial works',
        body: 'Your church is one of 17. The other churches\u2019 votes are set so that you can see each rule at work. At the end, you can try it yourself and choose how each vote comes out. Tap Start the tutorial when you are ready.',
      },
    ],
  }];
}

export function signInTips(fillCode) {
  return [{
    id: 'signin',
    target: '.input.code',
    pages: [{
      title: 'Sign in as a delegate',
      body: 'At the National Business Meeting, each Member Church has one voting delegate, certified in writing by its elders. The delegate signs in with the code on the delegate card. For this tutorial, use 0000-0001, the code for Grace Fellowship Church, then tap Sign in.',
      action: { label: 'Fill in the code', onClick: fillCode },
    }],
  }];
}

export function homeTips() {
  return [{
    id: 'home',
    target: '.list .row',
    pages: [{
      title: 'Open ballots',
      body: 'This list shows the ballots that are open for your church. One is open now. Tap Adopt the agenda to begin.',
    }],
  }];
}

// ---------------------------------------------------------------------------
// Before voting
// ---------------------------------------------------------------------------

export function beforeVoteTips(b, church, mode = 'path') {
  const guided = mode === 'path';
  const kind = ballotKind(b);
  const w = church.weight;
  const votes = plural(w, 'weighted vote', 'weighted votes');
  const tips = [];

  if (kind === 'procedural') {
    tips.push({ id: 'before:procedural', pages: [
      {
        title: 'One church, one vote',
        body: `This is a procedural motion: a question about running the meeting. It is decided by the church count, where every church that votes casts 1 vote. ${church.name} has ${votes} on other ballots, but here it has 1, the same as every other church.`,
      },
      {
        title: 'Your turn',
        body: 'Choose Yes or No, then tap Review vote. To submit, press and hold the button for two seconds; this keeps a vote from being sent by a stray tap. You can also abstain. An abstention is not counted as a vote cast, so it does not help or hurt either side.',
      },
    ] });
  }

  if (kind === 'budget') {
    const p = church.contributionPct == null ? null : fmt(church.contributionPct);
    tips.push({ id: 'before:budget', pages: [
      {
        title: 'A double majority',
        body: `Approving the budget needs a double majority: it must pass both counts. In the church count, ${church.name} casts 1 vote. In the weighted count, it casts ${w}. Both go to the choice you make.`,
      },
      {
        title: 'Where weighted votes come from',
        body: `Each church casts 1 to 4 weighted votes, based on what it gave to ACME in ${MEASURING_YEAR} as a share of its own adopted budget: under 2% is 1 vote, 2% to under 3% is 2, 3% to under 4% is 3, and 4% or more is 4.` +
          (p ? ` ${church.name} gave ${p}% of its budget, so it has ${w}.` : '') +
          ' A church whose elders have not certified its budget, or that was not a member for the whole year, has 1.',
      },
      {
        title: 'Share, not size',
        body: 'Weight depends on the share of a church’s own budget, not on dollars. A small church that gives 4% has the same 4 votes as a large church that gives 4%.',
      },
      guided
        ? { title: 'Your turn', body: 'Vote however you like, then compare the two counts on the result.' }
        : {
          title: 'Try this',
          body: 'Vote, then on the next screen choose Demo fail. The demo will set up a result where most churches vote Yes but the weighted count says No, so you can see what happens when the two counts disagree.',
        },
    ] });
  }

  if (kind === 'amendment') {
    tips.push({ id: 'before:amendment', pages: [
      {
        title: 'A higher bar',
        body: 'Amendments to the bylaws need 75% of the votes cast, in both counts. Changing the rules that every Member Church agreed to should take more than a bare majority.',
      },
      { title: 'Your turn', body: guided ? 'Vote however you like, then see the result.' : 'Vote however you like. On the next screen you can choose whether it passes or fails.' },
    ] });
  }

  if (kind === 'election' || kind === 'seat' || kind === 'regional') {
    if (b.round === 1 && kind === 'election') {
      tips.push({ id: 'before:election:1', pages: [
        {
          title: 'Electing an At-Large Director',
          body: `The President has presented ${b.options.length} nominees for this At-Large seat. Each seat is elected separately. To be elected, a candidate needs a double majority: a majority of the votes cast in both counts.`,
        },
        {
          title: 'If no one wins',
          body: 'With three candidates, that often does not happen on the first ballot. Then the two with the highest combined scores go to a runoff, as the Bylaws provide.' +
            (guided ? ' Vote for any candidate, then see the result.' : ' Choose a candidate, then choose No one elected to see how the runoff works.'),
        },
      ] });
    }
    if (b.round === 2) {
      tips.push({ id: 'before:election:2', pages: [{
        title: 'The runoff',
        body: 'Two candidates remain. A candidate still has to carry both counts. If one wins the church count and the other wins the weighted count, there is a third ballot.' +
          (guided ? '' : ' Choose No one elected again to see ballot 3, or Someone elected to finish here.'),
      }] });
    }
    if (b.round === 3) {
      tips.push({ id: 'before:election:3', pages: [
        {
          title: 'Ballot 3 is different',
          body: 'This ballot is final unless there is an exact tie. If one candidate carries both counts, he is elected. If the counts split again, the candidate with the higher combined score is elected.',
        },
        {
          title: 'Combined score',
          body: 'A candidate\u2019s combined score is his share of the church count plus his share of the weighted count. Adding the two shares weighs both counts equally.',
        },
      ] });
    }
    if (b.round >= 4) {
      tips.push({ id: 'before:election:4', pages: [{
        title: 'The final ballot',
        body: 'The combined scores tied on ballot 3, so this fourth ballot is final. It is decided the same way. If the combined scores tie again, both candidates are disqualified and nominations are reopened.',
      }] });
    }
  }

  if (kind === 'seat') {
    tips.push({ id: 'before:seat', pages: [{
      title: 'One seat at a time',
      body: 'The slate did not pass, so each of the five seats is now its own election. Nominees come from the floor, and some of the President’s nominees are among them. Each seat is decided under the normal election rules before the next seat opens.',
    }] });
  }

  if (kind === 'slate') {
    tips.push({ id: 'before:slate', pages: [
      {
        title: 'The Judicial Commission',
        body: 'The President has nominated five people to the Judicial Commission. The first vote is on all five together, as a slate. The slate needs a majority in both counts.',
      },
      {
        title: 'If the slate fails',
        body: 'The five seats are then filled one at a time, with nominees from the floor.' +
          (guided ? ' In this tutorial the slate passes, to keep it short. You can make it fail when you try it yourself.' : ' Choose Demo pass to keep the tutorial short, or Demo fail to see the seat-by-seat elections.'),
      },
    ] });
  }

  if (kind === 'regional') {
    tips.push({ id: 'before:regional', pages: [{
      title: `${b.region} churches only`,
      body: `This ballot is for the ${b.region} Region. Only churches in that Region can vote, and both counts include only those churches. The same rule applies: a candidate needs a majority in both counts.`,
    }] });
  }

  if (kind === 'special') {
    tips.push({ id: 'before:special', pages: [{
      title: 'Two-thirds',
      body: 'Under Article III, Section 10(b), a President seeking a third consecutive term needs two-thirds of the votes cast. Under Double Majority Voting, that means two-thirds in both counts. The Bylaws set a higher bar where the Fellowship has decided that wider agreement is needed.',
    }] });
  }

  return tips;
}

// ---------------------------------------------------------------------------
// After voting, before the result
// ---------------------------------------------------------------------------

const SUGGEST = {
  procedural: 'Choose Demo pass for this one.',
  budget: 'Choose Demo fail to see the two counts disagree.',
  amendment: 'Choose either one.',
  election: 'Choose No one elected to see a runoff.',
  slate: 'Choose Demo pass to keep the tutorial short, or Demo fail to see the seats filled one at a time.',
  seat: 'Choose either one.',
  regional: 'Choose either one.',
  special: 'Choose either one.',
  motion: 'Choose either one.',
};

export function afterVoteTips(b, mode = 'path') {
  const kind = ballotKind(b);
  if (mode === 'path') {
    return [{
      id: 'voted:first',
      target: '.demo-panel',
      pages: [
        {
          title: 'Your vote is recorded',
          body: 'Once submitted, a vote cannot be changed. The receipt number lets a delegate confirm later that the vote was counted.',
        },
        {
          title: 'See the result',
          body: 'At the meeting, results appear when voting closes. Here, tap See the result. The other churches\u2019 votes are set for this tutorial.',
        },
      ],
    }];
  }
  return [
    {
      id: 'voted:first',
      alsoMarks: [`voted:${kind}:${b.round || 0}`],
      target: '.demo-panel',
      pages: [
        {
          title: 'Your vote is recorded',
          body: 'Once submitted, a vote cannot be changed. The receipt number lets a delegate confirm later that the vote was counted.',
        },
        {
          title: 'Choose the result',
          body: `At the meeting, results appear when voting closes. For the tutorial, you choose how this vote comes out, and the other churches’ votes are filled in to match. ${SUGGEST[kind]}`,
        },
      ],
    },
    {
      id: `voted:${kind}:${b.round || 0}`,
      target: '.demo-panel',
      pages: [{ title: 'Choose the result', body: SUGGEST[kind] }],
    },
  ];
}

// ---------------------------------------------------------------------------
// After the result
// ---------------------------------------------------------------------------

const NEXT_PAGE = {
  title: 'Next',
  body: 'The next ballot is open. At a real meeting, a Ballot open bar appears at the top of every screen whenever there is a ballot your church has not voted on. Tap it, or tap Go to the next ballot.',
  target: '.next-ballot',
  action: { label: 'Go to the next ballot', onClick: () => document.querySelector('.next-ballot')?.click() },
};

function motionNumbers(b) {
  const r = b.result;
  const c = r.tally.church;
  const wt = r.tally.weighted;
  return {
    cYes: c.by.yes, cCast: c.cast, cPct: pct(c.by.yes, c.cast),
    wYes: wt.by.yes, wCast: wt.cast, wPct: pct(wt.by.yes, wt.cast),
  };
}

function bothCountsSentence(b) {
  const r = b.result;
  const n = motionNumbers(b);
  const need = { majority: 'a majority of the votes cast', twoThirds: 'two-thirds of the votes cast', threeQuarters: '75% of the votes cast' }[b.threshold];
  const cMaj = Number(n.cPct) > 50;
  const wMaj = Number(n.wPct) > 50;
  if (r.passed) {
    return b.threshold === 'majority'
      ? `It won a double majority: Yes had ${n.cPct}% of the church count and ${n.wPct}% of the weighted count.`
      : `It passed both counts: Yes had ${n.cPct}% of the church count and ${n.wPct}% of the weighted count. It needed ${need}.`;
  }
  if (r.churchPass) {
    return `Yes had ${n.cPct}% of the church count, enough to pass, but only ${n.wPct}% of the weighted count.` +
      (wMaj ? '' : ' The churches that give a larger share of their budgets mostly voted No.') +
      ` It needed ${need} in both counts, so it fails.`;
  }
  if (r.weightedPass) {
    return `Yes had ${n.wPct}% of the weighted count, enough to pass, but only ${n.cPct}% of the church count.` +
      (cMaj ? '' : ' Most churches voted No.') +
      ` It needed ${need} in both counts, so it fails.`;
  }
  return `Yes had ${n.cPct}% of the church count and ${n.wPct}% of the weighted count. It needed ${need}, so it fails.` +
    (cMaj && wMaj ? ' A majority voted Yes in both counts, but a majority is not enough here.' : '');
}

function electionNames(b) {
  return Object.fromEntries(b.options.map((o) => [o.id, o.label]));
}

export function resultTips(b, { hasNext, mode = 'path' }) {
  const kind = ballotKind(b);
  const r = b.result;
  // On the last result of the tutorial, the final page sums it up.
  const next = hasNext ? [NEXT_PAGE] : [{
    title: mode === 'path' ? 'You have finished the tutorial' : 'That was the last ballot',
    body: 'You have seen every kind of ballot at the National Business Meeting under Double Majority Voting: church count only, a double majority, 75% and two-thirds in both counts, the Judicial Commission slate, and an election that went to a runoff and a third ballot. In each case the rules ask for agreement from most churches and, where money or governance is at stake, from the churches that fund the work.' +
      (mode === 'path' ? ' Tap Try it yourself to vote again and choose each result.' : ''),
  }];

  if (r.kind === 'motion' && kind === 'procedural') {
    const n = motionNumbers(b);
    return [{ id: 'after:procedural', alsoMarks: [`after:procedural:${b.id}`], pages: [
      {
        title: 'What happened',
        body: `The motion ${r.passed ? 'passed' : 'did not pass'}: ${n.cYes} of ${plural(n.cCast, 'church', 'churches')} voted Yes (${n.cPct}%). Each church had 1 vote, so giving played no part.`,
      },
      {
        title: 'Why count this way',
        body: 'Procedural questions are about how the meeting runs, not about money or the bylaws. One church, one vote keeps them quick and gives every church an equal voice.',
      },
      ...next,
    ] }, { id: `after:procedural:${b.id}`, pages: [
      {
        title: 'What happened',
        body: `Another procedural motion, so one vote per church again. It ${r.passed ? 'passed' : 'did not pass'} with ${n.cYes} of ${plural(n.cCast, 'church', 'churches')} voting Yes (${n.cPct}%).`,
      },
      ...next,
    ] }];
  }

  if (r.kind === 'motion' && kind === 'budget') {
    return [{ id: 'after:budget', pages: [
      { title: 'What happened', body: bothCountsSentence(b) },
      {
        title: 'Why a double majority',
        body: 'Each count guards against a different problem. The church count keeps a small group of churches from deciding the fellowship’s spending over the objection of most churches. The weighted count keeps a majority of churches from directing money that comes mostly from others.',
      },
      {
        title: 'What a double majority means',
        body: 'A budget that passes both counts has the support of most churches and of the churches that give the most relative to their own budgets.',
      },
      {
        title: 'See the details',
        body: 'Tap Charts and details, then By weight, to see how churches with 1, 2, 3 and 4 weighted votes voted. Come back here when you are done.',
        target: '.results-link',
      },
      ...next,
    ] }];
  }

  if (r.kind === 'motion' && kind === 'amendment') {
    return [{ id: 'after:amendment', pages: [
      { title: 'What happened', body: bothCountsSentence(b) },
      {
        title: 'Why 75% in both counts',
        body: 'The bylaws are the agreement every Member Church made when it joined. Requiring 75% in both counts means a change needs wide support among churches and among the churches that fund the work. Abstentions are not counted, so a church that abstains does not count against it.',
      },
      ...next,
    ] }];
  }

  if (r.kind === 'motion' && kind === 'slate') {
    return [{ id: 'after:slate', pages: [
      r.passed
        ? { title: 'What happened', body: `${bothCountsSentence(b)} All five nominees are elected to the Judicial Commission.` }
        : { title: 'What happened', body: `${bothCountsSentence(b)} The five seats will now be filled one at a time.` },
      {
        title: 'Why a slate first',
        body: 'Voting on the President’s nominees together is quick when the fellowship supports them. When it does not, no one has to accept all five: each seat is then decided on its own.',
      },
      ...next,
    ] }];
  }

  if (r.kind === 'motion' && kind === 'special') {
    return [{ id: 'after:special', pages: [
      { title: 'What happened', body: bothCountsSentence(b) },
      {
        title: 'Why two-thirds',
        body: 'Keeping the same President for a third consecutive term is an exception to the usual pattern, so it needs wider agreement than a normal election: two-thirds of the churches voting and two-thirds of the weighted votes.',
      },
      ...next,
    ] }];
  }

  if (r.kind === 'motion') {
    return [{ id: `after:${kind}`, pages: [{ title: 'What happened', body: bothCountsSentence(b) }, ...next] }];
  }

  // Elections
  const names = electionNames(b);
  const rows = r.standings.rows;
  const late = b.round >= 3;
  const id = `after:${kind}:${r.outcome}:${late ? 'late' : b.round}`;

  if (r.outcome === 'elected') {
    const win = rows.find((x) => x.id === r.winner);
    const other = rows.find((x) => x.id !== r.winner);
    const byBoth = win.carriesChurch && win.carriesWeighted;
    if (byBoth) {
      return [{ id, pages: [
        {
          title: `${names[r.winner]} is elected`,
          body: `${names[r.winner]} won a majority in both counts: ${fmt(win.churchPct)}% of the churches voting and ${fmt(win.weightedPct)}% of the weighted votes.`,
        },
        {
          title: 'Why require a double majority',
          body: 'The winner has the support of most churches and of the churches that give the most relative to their budgets. Neither group can elect someone the other opposes.',
        },
        ...next,
      ] }];
    }
    return [{ id, pages: [
      {
        title: `${names[r.winner]} is elected on combined score`,
        body: `Neither candidate carried both counts, so the combined score decided. ${names[r.winner]}: ${fmt(win.churchPct)}% + ${fmt(win.weightedPct)}% = ${fmt(win.combined)}.` +
          (other ? ` ${names[other.id]}: ${fmt(other.churchPct)}% + ${fmt(other.weightedPct)}% = ${fmt(other.combined)}.` : ''),
      },
      {
        title: 'Why this tie-breaker',
        body: 'The combined score gives the two counts equal weight. It settles an election when the church count and the weighted count point different ways, so the election ends without either count simply overruling the other.',
      },
      ...next,
    ] }];
  }

  if (r.outcome === 'runoff') {
    const [a, c] = r.advancing.map((x) => rows.find((y) => y.id === x));
    return [{ id, pages: [
      { title: 'No one is elected yet', body: r.explanation },
      {
        title: 'Combined score',
        body: `A candidate’s combined score is their share of the church count plus their share of the weighted count. ${names[a.id]} had ${fmt(a.churchPct)}% + ${fmt(a.weightedPct)}% = ${fmt(a.combined)}; ${names[c.id]} had ${fmt(c.churchPct)}% + ${fmt(c.weightedPct)}% = ${fmt(c.combined)}. Adding the two shares weighs both counts equally.`,
      },
      ...next,
    ] }];
  }

  if (r.outcome === 'next') {
    return [{ id, pages: [
      { title: 'Still no winner', body: r.explanation },
      {
        title: 'Why the election still ends',
        body: 'A split cannot go on forever. Ballot 3 is final unless there is an exact tie: if the counts split again, the higher combined score wins.',
      },
      ...next,
    ] }];
  }

  return [{ id, pages: [{ title: 'What happened', body: r.explanation }, ...next] }];
}

export function chartsTips() {
  return [{
    id: 'charts',
    pages: [{
      title: 'Charts and details',
      body: 'Overview compares the counts with the share needed to pass. By weight shows how churches with 1, 2, 3 and 4 weighted votes voted; this is where you can see why the counts differ. By region shows each Region, and Churches lists every church’s vote. Tap any bar to see its numbers.',
    }],
  }];
}
