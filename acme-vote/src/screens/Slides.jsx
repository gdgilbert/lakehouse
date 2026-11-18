import React, { useEffect, useState } from 'react';
import { Logo, useNav } from '../components.jsx';
import * as api from '../server/api.js';

// Two short slideshows that bracket the ballot tutorial. Each slide is a series
// of steps. Next moves one step at a time: each step adds its sentence and the
// part of the animation that goes with it. Both slideshows use the same five
// churches, which also appear in the ballots (see src/server/seed.js).

const FIVE = [
  { short: 'Emmanuel', budget: 2400000, gives: 24000, pct: 1.0, votes: 1 },
  { short: 'Covenant', budget: 1800000, gives: 27000, pct: 1.5, votes: 1 },
  { short: 'Hope', budget: 600000, gives: 13200, pct: 2.2, votes: 2 },
  { short: 'Harbor', budget: 450000, gives: 13950, pct: 3.1, votes: 3 },
  { short: 'Grace', budget: 200000, gives: 9000, pct: 4.5, votes: 4 },
];
const TOTAL_VOTES = FIVE.reduce((s, c) => s + c.votes, 0);
const money = (n) => (n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${Math.round(n / 1000)},000`);
const dollars = (n) => '$' + Math.round(n).toLocaleString('en-US');
const ms = (n) => ({ animationDelay: `${n}ms` });

/** Moves through stages 1, 2, ... at each delay in `times` after `key` changes; returns the stage. */
function useTimeline(times, key) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    const ts = times.map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return stage;
}

/** Counts from 0 up to `to`, starting after `delay` ms. */
function useCountUp(to, delay = 0, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay;
    const step = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      setV(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return v;
}

function Count({ to, delay, label }) {
  const v = useCountUp(to, delay);
  return <span className="slide-count"><b>{v}</b>{label}</span>;
}

/** Church icon size in pixels for a budget: wide contrast, so the smallest looks small. */
const churchPx = (budget) => Math.round(24 + 72 * Math.pow(budget / FIVE[0].budget, 0.9));

/** A small church building. */
function Church({ size, delay = 0 }) {
  return (
    <svg className="slide-church" width={size} height={size} viewBox="0 0 40 40" style={ms(delay)} aria-hidden="true">
      <path d="M20 3v6M17 5.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 38V20l12-9 12 9v18z" fill="currentColor" opacity="0.92" />
      <path d="M17 38v-7a3 3 0 016 0v7" fill="var(--navy-dark)" />
    </svg>
  );
}

function Dots({ n, from = 0, tone = 'gold', step = 110 }) {
  return (
    <span className="slide-chips">
      {Array.from({ length: n }, (_, i) => <i key={i} className={tone} style={ms(from + i * step)} />)}
    </span>
  );
}

function Bubble({ children, style }) {
  return <span className="squash-ha" style={style}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Opening slides. Each viz takes the current step.
// ---------------------------------------------------------------------------

function VizChurches({ step }) {
  return (
    <div className="slide-town">
      {FIVE.map((c, i) => (
        <div className="slide-town-item" key={c.short} style={ms(150 + i * 180)}>
          <Church size={churchPx(c.budget)} delay={150 + i * 180} />
          <b>{c.short}</b>
          <span className={`slide-reveal${step >= 1 ? ' on' : ''}`} style={{ transitionDelay: `${i * 140}ms` }}>{money(c.budget)}</span>
        </div>
      ))}
    </div>
  );
}

// Crack and wrinkle lines drawn on a crushed church (in the icon's 40 x 40 box).
const CRACKS = ['M14 21l3 4-2 3 3 4-1 4', 'M27 20l-2 4 3 3-2 5 1 4', 'M9 29l4 1 2-2 4 2 3-1', 'M21 33l3-2 2 2 4-1 2 2'];
const WRINKLES = ['M9 25.5q2.5 1.5 5 0t5 0 5 0 5 0 5 0', 'M9 31.5q2.5 1.5 5 0t5 0 5 0 5 0 5 0'];

/** A church that can be crushed: it shrinks to `ratio` of its height, bulges, and cracks. */
function SquashChurch({ size, ratio, crushed, cracks }) {
  const bulge = 1 + (1 - ratio) * 0.32;
  return (
    <svg className={`squash-church${crushed ? ' crushed' : ''}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"
      style={{ transform: crushed ? `scale(${bulge}, ${ratio})` : 'none' }}>
      <path d="M20 3v6M17 5.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 38V20l12-9 12 9v18z" fill="currentColor" opacity="0.92" />
      <path d="M17 38v-7a3 3 0 016 0v7" fill="var(--navy-dark)" />
      {CRACKS.slice(0, cracks).map((d, k) => <path key={d} className="squash-crack" d={d} style={{ transitionDelay: `${700 + k * 220}ms` }} />)}
      {cracks >= 2 && WRINKLES.slice(0, cracks >= 4 ? 2 : 1).map((d, k) => (
        <path key={d} className="squash-wrinkle" d={d} style={{ transitionDelay: `${900 + k * 250}ms` }} />
      ))}
    </svg>
  );
}

/** One church, one vote: standing, then the press, then one ballot each and Grace laughs. */
function VizOneVote({ step }) {
  const laugh = useTimeline([2600], step === 2 ? 'laugh' : 'no') >= 1 && step === 2;
  const sizes = FIVE.map((c) => churchPx(c.budget));
  const smallest = Math.min(...sizes);
  const tallest = Math.max(...sizes);
  const crackCount = (ratio) => (ratio > 0.9 ? 0 : ratio > 0.75 ? 1 : ratio > 0.6 ? 2 : ratio > 0.4 ? 3 : 4);
  const pressDown = step === 1;
  return (
    <div className="squash">
      <div className="squash-stage" style={{ height: tallest + 34 }}>
        <div className={`squash-press${pressDown ? ' down' : ''}${step >= 2 ? ' up' : ''}`}
          style={{ bottom: pressDown ? smallest * 0.92 : tallest + 22 }} />
        <div className="squash-row">
          {FIVE.map((c, k) => {
            const ratio = smallest / sizes[k];
            return (
              <div className={`squash-item${step === 1 && ratio < 0.95 ? ' quiver' : ''}`} key={c.short} style={ms(150 + k * 180)}>
                {step >= 2 && <i className="slide-drop squash-ballot" style={{ bottom: smallest + 4, ...ms(400 + k * 220) }} />}
                {laugh && ratio === 1 && <Bubble style={{ bottom: smallest + 26 }}>Ha!</Bubble>}
                <SquashChurch size={sizes[k]} ratio={ratio} crushed={step >= 1} cracks={crackCount(ratio)} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="squash-names">{FIVE.map((c) => <b key={c.short}>{c.short}</b>)}</div>
      {step >= 2 && <div className="slide-total" style={ms(1400)}><Count to={5} delay={1400} label=" votes, one per church" /></div>}
    </div>
  );
}

/** Who gives the most: dollar bars (the big two flash and the biggest scoffs), then the budgets and the reversal. */
function VizGivers({ step }) {
  const flash = useTimeline([2200], step === 0 ? 'a' : 'b') >= 1 && step === 0;
  const flip = useTimeline([1800], step === 1 ? 'flip' : 'x') >= 1 && step >= 1;
  const share = step >= 2 || flip;
  const maxGives = Math.max(...FIVE.map((c) => c.gives));
  const top2 = [...FIVE].sort((a, b) => b.gives - a.gives).slice(0, 2).map((c) => c.short);
  const biggest = top2[0];
  return (
    <div className={`slide-morph${share ? ' share' : ''}`}>
      <div className="slide-morph-caption">{share ? 'Share of its own budget given to ACME' : 'Dollars given to ACME'}</div>
      {FIVE.map((c, i) => (
        <div className="slide-morph-row givers" key={c.short} style={ms(150 + i * 140)}>
          <div className="slide-giver-icon">
            <Church size={Math.round(churchPx(c.budget) * 0.45)} delay={150 + i * 140} />
          </div>
          <div className="slide-morph-name">
            <b>{c.short}</b>
            <span className={step >= 1 ? 'on' : ''} style={{ transitionDelay: `${i * 120}ms` }}>{money(c.budget)} budget</span>
          </div>
          <div className="slide-morph-track">
            {share && [2, 3, 4].map((t) => <i key={t} className="slide-meter-line" style={{ left: `${(t / 5) * 100}%` }} />)}
            {flash && c.short === biggest && <span className="bar-bubble">Punks!</span>}
            <span className={`slide-morph-bar${flash && top2.includes(c.short) ? ' flash' : ''}`}
              style={{ width: `${share ? (c.pct / 5) * 100 : (c.gives / maxGives) * 100}%`, transitionDelay: share ? `${i * 90}ms` : '0ms', ...ms(300 + i * 140) }} />
          </div>
          <span className="slide-morph-value">{share ? `${c.pct.toFixed(1)}%` : dollars(c.gives)}</span>
        </div>
      ))}
    </div>
  );
}

function VizWeights({ step }) {
  return (
    <div className="slide-weights">
      <div className="slide-bands">
        {[['under 2%', 1], ['2–3%', 2], ['3–4%', 3], ['4%+', 4]].map(([l, v], i) => (
          <span key={l} style={ms(150 + i * 160)}><b>{v}</b>{l}</span>
        ))}
      </div>
      {step >= 1 && FIVE.map((c, i) => (
        <div className="slide-weight-row" key={c.short} style={ms(150 + i * 260)}>
          <b>{c.short}</b>
          <span className="slide-weight-pct">{c.pct.toFixed(1)}%</span>
          <Dots n={c.votes} from={350 + i * 260} step={160} />
        </div>
      ))}
      {step >= 1 && <div className="slide-total" style={ms(1900)}><Count to={TOTAL_VOTES} delay={1900} label=" weighted votes in all" /></div>}
    </div>
  );
}

function VizBoth({ step }) {
  return (
    <div className="slide-two">
      <div className="slide-box" style={ms(150)}>
        <div className="slide-two-head">Church count</div>
        <Dots n={5} from={400} tone="white" step={160} />
        <div className="slide-two-sub"><Count to={5} delay={400} label=" votes · 1 per church" /></div>
      </div>
      <div className="slide-two-plus" style={{ visibility: step >= 1 ? 'visible' : 'hidden' }}>and</div>
      {step >= 1 ? (
        <div className="slide-box" style={ms(150)}>
          <div className="slide-two-head">Weighted count</div>
          <Dots n={TOTAL_VOTES} from={400} step={110} />
          <div className="slide-two-sub"><Count to={TOTAL_VOTES} delay={400} label=" votes · 1 to 4 per church" /></div>
        </div>
      ) : <div />}
      {step >= 2 && <div className="slide-need" style={ms(150)}>To pass: a majority of <b>both</b></div>}
    </div>
  );
}

/** An example that plays when it appears: who votes Yes, each count fills, then the verdict. */
function Example({ yes, label }) {
  const yesC = FIVE.filter((c) => yes.includes(c.short));
  const churchYes = yesC.length;
  const weightYes = yesC.reduce((s, c) => s + c.votes, 0);
  const cPass = churchYes * 2 > FIVE.length;
  const wPass = weightYes * 2 > TOTAL_VOTES;
  const t = { who: 400, church: 1700, churchLabel: 2500, weighted: 3300, weightedLabel: 4100, stamp: 5100 };
  return (
    <div className="slide-example" style={ms(0)}>
      <div className="slide-example-head">{label}</div>
      <div className="slide-example-who">
        {FIVE.map((c, i) => <span key={c.short} className={yes.includes(c.short) ? 'yes' : 'no'} style={ms(t.who + i * 160)}>{c.short}</span>)}
      </div>
      <div className="slide-mini">
        <span>Church count</span>
        <div className="slide-mini-bar"><i className={cPass ? 'pass' : 'fail'} style={{ width: `${(churchYes / FIVE.length) * 100}%`, ...ms(t.church) }} /><em /></div>
        <b className={cPass ? 'pass' : 'fail'} style={ms(t.churchLabel)}>{churchYes} of 5 · {cPass ? 'Yes' : 'No'}</b>
      </div>
      <div className="slide-mini">
        <span>Weighted</span>
        <div className="slide-mini-bar"><i className={wPass ? 'pass' : 'fail'} style={{ width: `${(weightYes / TOTAL_VOTES) * 100}%`, ...ms(t.weighted) }} /><em /></div>
        <b className={wPass ? 'pass' : 'fail'} style={ms(t.weightedLabel)}>{weightYes} of {TOTAL_VOTES} · {wPass ? 'Yes' : 'No'}</b>
      </div>
      <div className="slide-stamp" style={ms(t.stamp)}>Fails</div>
    </div>
  );
}

function VizWhyBoth({ step }) {
  return (
    <div className="slide-examples">
      {step >= 1 && <Example yes={['Emmanuel', 'Covenant', 'Hope']} label="Three churches that give less vote Yes" />}
      {step >= 2 && <Example yes={['Harbor', 'Grace']} label="Two churches that give more vote Yes" />}
    </div>
  );
}

/** A double pass carried by different churches: the large churches make the church-count
 *  majority, Grace's 4 weighted votes make the weighted majority. */
const PASS_YES = ['Emmanuel', 'Covenant', 'Grace'];
function VizDoublePass({ step }) {
  const yes = (c) => PASS_YES.includes(c.short);
  const churchYes = FIVE.filter(yes).length;
  const weightYes = FIVE.filter(yes).reduce((t, c) => t + c.votes, 0);
  const row = (weighted) => (
    <div className="dp-row">
      {FIVE.map((c) => {
        const carry = weighted ? c.short === 'Grace' : (c.short === 'Emmanuel' || c.short === 'Covenant');
        return (
          <div className={`dp-church${yes(c) ? ' yes' : ''}${carry ? ' carry' : ''}`} key={c.short}>
            <span className="dp-dots">
              {Array.from({ length: weighted ? c.votes : 1 }, (_, k) => <i key={k} style={ms(200 + k * 120)} />)}
            </span>
            <span className="dp-name">{c.short}</span>
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="slide-example dp">
      <div className="slide-example-who">
        {FIVE.map((c, i) => <span key={c.short} className={yes(c) ? 'yes' : 'no'} style={ms(300 + i * 160)}>{c.short}</span>)}
      </div>
      {step >= 1 && (
        <div className="dp-count" style={ms(100)}>
          <div className="dp-head"><span>Church count</span><b className="pass" style={ms(1200)}>{churchYes} of 5 · Yes</b></div>
          {row(false)}
        </div>
      )}
      {step >= 2 && (
        <div className="dp-count" style={ms(100)}>
          <div className="dp-head"><span>Weighted count</span><b className="pass" style={ms(1600)}>{weightYes} of {TOTAL_VOTES} · Yes</b></div>
          {row(true)}
        </div>
      )}
      {step >= 3 && <div className="slide-stamp pass" style={ms(300)}>Passes</div>}
    </div>
  );
}

function VizTry() {
  return (
    <div className="slide-try">
      <Church size={Math.round(churchPx(FIVE[4].budget) * 1.4)} delay={200} />
      <Dots n={4} from={700} step={180} />
    </div>
  );
}

const INTRO = [
  {
    title: 'How should churches decide together?',
    steps: [['ACME is a fellowship of churches of every size.'], ['Here are five of them, drawn to the size of their budgets.'], ['When they vote together, how should the votes be counted?']],
    viz: (step) => <VizChurches step={step} />,
  },
  {
    title: 'One church, one vote',
    steps: [
      ['The simplest answer: every church gets one vote, large or small.'],
      ['That presses every church down to the same size…'],
      ['…and counts it the same, whether it gives a little or a lot to the work they share.'],
    ],
    viz: (step) => <VizOneVote step={step} />,
  },
  {
    title: 'Who gives the most?',
    steps: [
      ['Counted in dollars, the large churches give the most.'],
      ['But every church gives out of its own budget.', { t: 'Measured against what each church has, the order turns over: the smallest church gives the most.', delay: 2600 }],
    ],
    viz: (step) => <VizGivers step={step} />,
  },
  {
    title: 'Weighted votes follow commitment',
    steps: [
      ['Under Double Majority Voting, each church also gets 1 to 4 weighted votes, set by the share of its budget it gives.'],
      ['Size has nothing to do with it. Grace, the smallest church, has the most.'],
    ],
    viz: (step) => <VizWeights step={step} />,
  },
  {
    title: 'Every decision is counted twice',
    steps: [['Once with one vote per church…'], ['…and once with the weighted votes.'], ['To pass, a decision needs a majority in both counts.']],
    viz: (step) => <VizBoth step={step} />,
  },
  {
    title: 'Why both?',
    steps: [
      ['Either count alone can be unfair.'],
      ['Counting churches alone, churches that give little can outvote those that give much.'],
      ['Counting weight alone, a few committed churches can outvote everyone else.'],
      ['Together, neither group can decide for the other.'],
    ],
    viz: (step) => <VizWhyBoth step={step} />,
  },
  {
    title: 'Passing both',
    steps: [
      ['Now three very different churches vote Yes: the two largest, and the smallest.'],
      ['In the church count, the two large churches make the majority: 3 of 5.'],
      ['In the weighted count, Grace\u2019s 4 votes carry it: 6 of 11.'],
      ['It wins both counts, so it passes, with a different set of churches carrying each majority.'],
    ],
    viz: (step) => <VizDoublePass step={step} />,
  },
  {
    title: 'Now try it',
    steps: [['Next, you will be the delegate for Grace, the small church that gives 4.5%, at a National Business Meeting. Five ballots, each showing a different side of Double Majority Voting.']],
    viz: () => <VizTry />,
  },
];

// ---------------------------------------------------------------------------
// Closing slides
// ---------------------------------------------------------------------------

const LESSONS = [
  ['When churches agree, both counts agree.', 'The budget passed easily.'],
  ['Size does not buy votes.', 'The three largest churches wanted the office. Each had one church vote and one weighted vote, like any church that gives under 2%.'],
  ['Churches that give little cannot outvote those that give much.', 'Counting churches alone, the ad campaign would have passed. The weighted count stopped it.'],
  ['Committed churches cannot overrule everyone else.', 'Counting weight alone, the conference money would have gone to missions. The church count stopped it.'],
];

function VizLessons({ step }) {
  return (
    <div className="slide-list">
      {LESSONS.slice(0, step + 1).map(([a, b]) => (
        <div className="slide-list-item" key={a} style={ms(100)}>
          <span className="slide-list-check">✓</span>
          <span><b>{a}</b> {b}</span>
        </div>
      ))}
    </div>
  );
}

function VizBig({ step }) {
  return (
    <div className="slide-vs">
      {[FIVE[0], FIVE[4]].slice(0, step + 1).map((c) => (
        <div className="slide-vs-side" key={c.short} style={ms(100)}>
          <div className="slide-vs-top">
            <Church size={churchPx(c.budget)} delay={100} />
            <div>
              <b>{c.short}</b>
              <span className="slide-two-sub">{money(c.budget)} budget · gives {c.pct.toFixed(1)}%</span>
            </div>
          </div>
          <Dots n={c.votes} from={700} step={220} />
        </div>
      ))}
    </div>
  );
}

function VizGauge({ step }) {
  return (
    <div className={`slide-gauge stepwise${step >= 1 ? ' climb' : ''}`}>
      <div className="slide-gauge-track">
        {[['under 2%', 1], ['2–3%', 2], ['3–4%', 3], ['4%+', 4]].map(([l, v], i) => (
          <span key={l} className={i === 0 || step >= 1 ? 'lit' : ''} style={{ transitionDelay: step >= 1 ? `${i * 1100}ms` : '0ms' }}><b>{v}</b>{l}</span>
        ))}
        <i className="slide-gauge-dot" />
      </div>
    </div>
  );
}

/** All five churches climb to 4% and 4 votes (step 1), then flash and collapse to one vote each (step 2). */
function VizEveryone({ step }) {
  const climb = useTimeline([400, 2000, 3600], step === 1 ? 'climb' : 'x');
  const collapse = useTimeline([1600], step === 2 ? 'collapse' : 'y');
  const level = step === 0 ? 0 : step === 1 ? climb : 3; // climbing stages 0..3
  const collapsed = step === 2 && collapse >= 1;
  const flashing = step === 2 && !collapsed;
  const pctAt = (c) => { const top = Math.max(4, c.pct); return c.pct + ((top - c.pct) * level) / 3; };
  const votesAt = (c) => { if (collapsed) return 1; const p = pctAt(c); return p < 2 ? 1 : p < 3 ? 2 : p < 4 ? 3 : 4; };
  return (
    <div className={`slide-everyone${flashing ? ' flash' : ''}${collapsed ? ' collapsed' : ''}`}>
      {FIVE.map((c) => (
        <div className="slide-every-row" key={c.short}>
          <b>{c.short}</b>
          <span className="slide-weight-pct">{`${pctAt(c).toFixed(1)}%`}</span>
          <span className="slide-chips steady">{[0, 1, 2, 3].map((k) => <i key={k} className={k < votesAt(c) ? 'gold' : 'off'} />)}</span>
        </div>
      ))}
    </div>
  );
}

function VizFinal({ step }) {
  return (
    <div className="slide-final">
      <Dots n={5} from={200} tone="white" step={160} />
      {step >= 1 && <span className="slide-two-plus" style={ms(100)}>+</span>}
      {step >= 1 && <Dots n={TOTAL_VOTES} from={300} step={90} />}
    </div>
  );
}

const OUTRO = [
  {
    title: 'What you saw',
    steps: LESSONS.map((_, i) => (i === 0 ? ['Five ballots, four lessons.'] : [])),
    viz: (step) => <VizLessons step={step} />,
  },
  {
    title: 'Big does not mean powerful',
    steps: [['Emmanuel’s budget is twelve times Grace’s, and Emmanuel has 1 weighted vote.'], ['Grace has 4.']],
    viz: (step) => <VizBig step={step} />,
  },
  {
    title: 'Commitment is a choice',
    steps: [['Any church, of any size, can earn more weight.'], ['As a church gives a larger share of its budget, it moves up, one weighted vote at a time, to 4.']],
    viz: (step) => <VizGauge step={step} />,
  },
  {
    title: 'If every church gave 4%',
    steps: [['Here are the five churches as they are.'], ['Now every church gives more, until each gives 4% and has 4 weighted votes.'], ['Equal weight is one church, one vote again.']],
    viz: (step) => <VizEveryone step={step} />,
  },
  {
    title: 'Double Majority Voting',
    steps: [['Every church has a voice.'], ['Commitment has weight.'], ['The more churches share in the work, the closer the two counts come to one.', { t: 'A decision needs both.', delay: 1800 }]],
    viz: (step) => <VizFinal step={step} />,
  },
];

// ---------------------------------------------------------------------------
// The slideshow
// ---------------------------------------------------------------------------

function ReplayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8.3" />
      <path d="M3 3v5.3h5.3" />
    </svg>
  );
}

/** The sentences for steps 0..step. The current step's sentences fade in (some after a delay). */
function Captions({ steps, step }) {
  return (
    <p className="slides-text">
      {steps.slice(0, step + 1).map((parts, k) => parts.map((part, j) => {
        const text = typeof part === 'string' ? part : part.t;
        const delay = typeof part === 'string' ? 0 : part.delay;
        const current = k === step;
        return (
          <span key={`${k}-${j}`} className={`slides-cap${current ? ' new' : ''}`} style={current ? ms(150 + delay) : undefined}>
            {text}{' '}
          </span>
        );
      }))}
    </p>
  );
}

function Slideshow({ slides, lastLabel, onDone, onSkip }) {
  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(0); // bumping this restarts the slide from its first step
  const s = slides[i];
  const lastStep = step >= s.steps.length - 1;
  const lastSlide = i === slides.length - 1;
  const next = () => {
    if (!lastStep) setStep(step + 1);
    else if (!lastSlide) { setI(i + 1); setStep(0); }
    else onDone();
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
    else if (i > 0) { setI(i - 1); setStep(slides[i - 1].steps.length - 1); }
  };
  return (
    <div className="slides">
      <div className="slides-top">
        <Logo />
        {onSkip && !lastSlide && <button className="slides-skip" onClick={onSkip}>Skip</button>}
      </div>
      <div className="slides-body" key={`${i}-${replay}`}>
        <h1 className="slides-title">{s.title}</h1>
        <Captions steps={s.steps} step={step} />
        <div className="slides-viz">{s.viz(step)}</div>
        <button className="slides-replay-btn" onClick={() => { setStep(0); setReplay(replay + 1); }} aria-label="Replay this slide" title="Replay">
          <ReplayIcon />
        </button>
      </div>
      <div className="slides-bottom">
        <button className="slides-back" onClick={back} style={{ visibility: i > 0 || step > 0 ? 'visible' : 'hidden' }}>Back</button>
        <div className="slides-dots">{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <button className="btn gold slides-next" onClick={next}>{lastSlide && lastStep ? lastLabel : 'Next'}</button>
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
