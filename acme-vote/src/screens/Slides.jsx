import React, { useState } from 'react';
import { Icon, Logo, useNav } from '../components.jsx';
import * as api from '../server/api.js';

// Two short slideshows that bracket the ballot tutorial. The viewer moves them
// along with one button. Both use the same five churches, which also appear in
// the ballots (see src/server/seed.js).

const FIVE = [
  { name: 'Emmanuel Church', short: 'Emmanuel', budget: 2400000, pct: 1.0, gives: 24000, votes: 1 },
  { name: 'Covenant Presbyterian', short: 'Covenant', budget: 1800000, pct: 1.5, gives: 27000, votes: 1 },
  { name: 'Hope Community', short: 'Hope', budget: 600000, pct: 2.2, gives: 13200, votes: 2 },
  { name: 'Harbor Church', short: 'Harbor', budget: 450000, pct: 3.1, gives: 13950, votes: 3 },
  { name: 'Grace Fellowship', short: 'Grace', budget: 300000, pct: 4.5, gives: 13500, votes: 4 },
];
const dollars = (n) => '$' + Math.round(n).toLocaleString('en-US');
const money = (n) => (n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : dollars(n));
const TOTAL_GIVES = FIVE.reduce((s, c) => s + c.gives, 0);
const TOTAL_VOTES = FIVE.reduce((s, c) => s + c.votes, 0);

// Staggered entrance for the items on a slide.
const rise = (i) => ({ animationDelay: `${120 + i * 110}ms` });

function Chips({ n, delay = 0, tone = '' }) {
  return (
    <span className="slide-chips">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={tone} style={{ animationDelay: `${delay + i * 90}ms` }} />
      ))}
    </span>
  );
}

function ChurchRows({ show }) {
  const maxBudget = FIVE[0].budget;
  const maxGives = Math.max(...FIVE.map((c) => c.gives));
  return (
    <div className="slide-rows">
      {FIVE.map((c, i) => (
        <div className="slide-row" key={c.name} style={rise(i)}>
          <div className="slide-row-name">
            <b>{c.short}</b>
            <span>
              {show === 'budget' && `${money(c.budget)} budget`}
              {show === 'one' && '1 church vote'}
              {show === 'dollars' && `gives ${dollars(c.gives)}`}
              {show === 'weight' && `gives ${c.pct.toFixed(1)}%`}
            </span>
          </div>
          <div className="slide-row-viz">
            {show === 'budget' && <span className="slide-bar navy" style={{ width: `${(c.budget / maxBudget) * 100}%`, ...rise(i) }} />}
            {show === 'one' && <Chips n={1} delay={200 + i * 110} />}
            {show === 'dollars' && <span className="slide-bar gold" style={{ width: `${(c.gives / maxGives) * 100}%`, ...rise(i) }} />}
            {show === 'weight' && <Chips n={c.votes} delay={250 + i * 140} tone="gold" />}
          </div>
        </div>
      ))}
    </div>
  );
}

/** One side of a small "who voted Yes" example, with both counts. */
function Example({ yes, label }) {
  const churchYes = yes.length;
  const weightYes = FIVE.filter((c) => yes.includes(c.short)).reduce((s, c) => s + c.votes, 0);
  const cPass = churchYes * 2 > FIVE.length;
  const wPass = weightYes * 2 > TOTAL_VOTES;
  return (
    <div className="slide-example">
      <div className="slide-example-head">{label}</div>
      <div className="slide-example-who">{FIVE.map((c) => (
        <span key={c.short} className={yes.includes(c.short) ? 'yes' : 'no'}>{c.short}</span>
      ))}</div>
      <div className="slide-tally">
        <span className={cPass ? 'pass' : 'fail'}>Church count {churchYes} of {FIVE.length} · {cPass ? 'Yes' : 'No'}</span>
        <span className={wPass ? 'pass' : 'fail'}>Weighted {weightYes} of {TOTAL_VOTES} · {wPass ? 'Yes' : 'No'}</span>
      </div>
      <div className="slide-verdict">Double Majority Voting: <b>No</b></div>
    </div>
  );
}

const INTRO = [
  {
    title: 'How should churches decide together?',
    body: 'ACME is a fellowship of churches of every size. Here are five of them. The bars show each church’s annual budget.',
    viz: () => <ChurchRows show="budget" />,
  },
  {
    title: 'One way: one church, one vote',
    body: 'Every church has an equal say. But Emmanuel gives 1% of its budget to ACME and Grace gives 4.5%, and each has the same say over how ACME spends what they give.',
    viz: () => <ChurchRows show="one" />,
  },
  {
    title: 'Another way: votes by dollars',
    body: `The two largest churches give ${dollars(51000)} of the ${dollars(TOTAL_GIVES)} these five give, ${Math.round((51000 / TOTAL_GIVES) * 100)}%. Counted by dollars, they would outvote the other three together, though they give the smallest share of their budgets.`,
    viz: () => <ChurchRows show="dollars" />,
  },
  {
    title: 'Double Majority Voting weighs commitment',
    body: 'Each church gets 1 to 4 weighted votes based on the share of its own budget it gives: under 2% is 1 vote, 2% to 3% is 2, 3% to 4% is 3, and 4% or more is 4. Size does not matter. Grace, the smallest church here, has the most.',
    viz: () => <ChurchRows show="weight" />,
  },
  {
    title: 'Then it counts both',
    body: 'Every decision is counted two ways: one vote per church, and the weighted votes. To pass, it needs a majority in both.',
    viz: () => (
      <div className="slide-two">
        <div style={rise(0)}>
          <div className="slide-two-head">Church count</div>
          <Chips n={5} delay={250} />
          <div className="slide-two-sub">1 vote per church · 5 votes</div>
        </div>
        <div className="slide-two-plus" style={rise(1)}>and</div>
        <div style={rise(2)}>
          <div className="slide-two-head">Weighted count</div>
          <Chips n={TOTAL_VOTES} delay={450} tone="gold" />
          <div className="slide-two-sub">1 to 4 per church · {TOTAL_VOTES} votes</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Why both?',
    body: 'Either count alone can be unfair. Counting churches alone, churches that give little could spend what others give. Counting weight alone, a few committed churches could overrule everyone else. Together, neither group can decide for the other.',
    viz: () => (
      <div className="slide-examples">
        <div style={rise(0)}><Example yes={['Emmanuel', 'Covenant', 'Hope']} label="Three churches that give less vote Yes" /></div>
        <div style={rise(1)}><Example yes={['Harbor', 'Grace']} label="Two churches that give more vote Yes" /></div>
      </div>
    ),
  },
  {
    title: 'Now try it',
    body: 'Next, you will be the delegate for Grace Fellowship at a National Business Meeting and vote on five ballots. Each one shows a different side of Double Majority Voting.',
    viz: () => (
      <div className="slide-try" style={rise(0)}>
        <Icon name="vote" size={48} stroke={1.5} />
      </div>
    ),
  },
];

const OUTRO = [
  {
    title: 'What you saw',
    body: 'Five ballots, four lessons.',
    viz: () => (
      <div className="slide-list">
        {[
          ['When churches agree, both counts agree.', 'The budget passed easily.'],
          ['Size does not buy votes.', 'Counted by dollars, the large churches would have leased the office. They could not.'],
          ['Churches that give little cannot spend what others give.', 'Counting churches alone, the ad campaign would have passed. The weighted count stopped it.'],
          ['Committed churches cannot overrule everyone else.', 'Counting weight alone, the conference money would have gone to missions. The church count stopped it.'],
        ].map(([a, b], i) => (
          <div className="slide-list-item" key={a} style={rise(i)}>
            <span className="slide-list-check"><Icon name="check" size={16} stroke={3} /></span>
            <span><b>{a}</b> {b}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Big does not mean powerful',
    body: 'Emmanuel’s budget is eight times Grace’s. Emmanuel has 1 weighted vote. Grace has 4.',
    viz: () => (
      <div className="slide-vs">
        {[FIVE[0], FIVE[4]].map((c, i) => (
          <div className="slide-vs-side" key={c.short} style={rise(i)}>
            <b>{c.short}</b>
            <span className="slide-vs-budget" style={{ width: `${(c.budget / FIVE[0].budget) * 100}%` }} />
            <span className="slide-two-sub">{money(c.budget)} budget · gives {c.pct.toFixed(1)}%</span>
            <Chips n={c.votes} delay={400 + i * 300} tone="gold" />
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Commitment is a choice',
    body: 'Any church, of any size, can earn more weight. A church that raises its giving from 1.9% to 2.1% of its budget goes from 1 weighted vote to 2. A church whose elders certify its budget counts fully.',
    viz: () => (
      <div className="slide-gauge" style={rise(0)}>
        <div className="slide-gauge-track">
          {[['under 2%', 1], ['2–3%', 2], ['3–4%', 3], ['4%+', 4]].map(([l, v]) => (
            <span key={l}><b>{v}</b>{l}</span>
          ))}
          <i className="slide-gauge-dot" />
        </div>
      </div>
    ),
  },
  {
    title: 'Double Majority Voting',
    body: 'Every church has a voice. Commitment has weight. A decision needs both.',
    viz: () => (
      <div className="slide-final" style={rise(0)}>
        <Chips n={5} delay={200} />
        <span className="slide-two-plus">+</span>
        <Chips n={TOTAL_VOTES} delay={500} tone="gold" />
      </div>
    ),
  },
];

function Slideshow({ slides, lastLabel, onDone, onSkip }) {
  const [i, setI] = useState(0);
  const s = slides[i];
  const last = i === slides.length - 1;
  return (
    <div className="slides">
      <div className="slides-top">
        <Logo />
        {onSkip && !last && <button className="slides-skip" onClick={onSkip}>Skip</button>}
      </div>
      <div className="slides-body" key={i}>
        <h1 className="slides-title" style={rise(0)}>{s.title}</h1>
        <div className="slides-viz">{s.viz()}</div>
        <p className="slides-text" style={rise(2)}>{s.body}</p>
      </div>
      <div className="slides-bottom">
        <button className="slides-back" onClick={() => setI(i - 1)} style={{ visibility: i > 0 ? 'visible' : 'hidden' }}>Back</button>
        <div className="slides-dots">{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <button className="btn gold slides-next" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? lastLabel : 'Next'}</button>
      </div>
    </div>
  );
}

export function Intro() {
  const nav = useNav();
  const go = () => nav.replace('delegateSignIn');
  return <Slideshow slides={INTRO} lastLabel="Start" onDone={go} onSkip={go} />;
}

export function Outro() {
  const nav = useNav();
  const done = async () => {
    await api.resetDemo({ mode: 'path' });
    await api.signOut();
    nav.reset('start');
  };
  return <Slideshow slides={OUTRO} lastLabel="Done" onDone={done} />;
}
