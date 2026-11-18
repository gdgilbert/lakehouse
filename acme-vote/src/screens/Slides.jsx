import React, { useEffect, useState } from 'react';
import { Logo, useNav } from '../components.jsx';
import * as api from '../server/api.js';

// Two short slideshows that bracket the ballot tutorial, moved along with one
// button. Both use the same five churches, which also appear in the ballots
// (see src/server/seed.js). Each slide puts its explanation first and its
// animation below.

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

/** A small church building, drawn to scale. */
function Church({ size, scale = 1, delay = 0 }) {
  const w = size || 30 + 44 * scale;
  return (
    <svg className="slide-church" width={w} height={w} viewBox="0 0 40 40" style={ms(delay)} aria-hidden="true">
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

// ---------------------------------------------------------------------------
// Opening slides
// ---------------------------------------------------------------------------

function SlideChurches() {
  return (
    <div className="slide-town">
      {FIVE.map((c, i) => (
        <div className="slide-town-item" key={c.short} style={ms(200 + i * 180)}>
          <Church size={churchPx(c.budget)} delay={200 + i * 180} />
          <b>{c.short}</b>
          <span>{money(c.budget)}</span>
        </div>
      ))}
    </div>
  );
}

// Crack and wrinkle lines drawn on a crushed church (in the icon's 40 x 40 box).
const CRACKS = [
  'M14 21l3 4-2 3 3 4-1 4',
  'M27 20l-2 4 3 3-2 5 1 4',
  'M9 29l4 1 2-2 4 2 3-1',
  'M21 33l3-2 2 2 4-1 2 2',
];
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
      {CRACKS.slice(0, cracks).map((d, k) => (
        <path key={d} className="squash-crack" d={d} style={{ transitionDelay: `${700 + k * 220}ms` }} />
      ))}
      {cracks >= 2 && WRINKLES.slice(0, cracks >= 4 ? 2 : 1).map((d, k) => (
        <path key={d} className="squash-wrinkle" d={d} style={{ transitionDelay: `${900 + k * 250}ms` }} />
      ))}
    </svg>
  );
}

/**
 * One church, one vote: the churches stand at their sizes, a press comes down and
 * crushes every church to the size of the smallest (the big ones shake, bulge and
 * crack), then the press lifts and each gets one ballot.
 */
function SlideOneVote() {
  const [stage, setStage] = useState(0); // 0 standing, 1 pressing, 2 crushed, 3 ballots, 4 the smallest laughs
  useEffect(() => {
    const ts = [3200, 5200, 7600, 9800].map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => ts.forEach(clearTimeout);
  }, []);
  const sizes = FIVE.map((c) => churchPx(c.budget));
  const smallest = Math.min(...sizes);
  const tallest = Math.max(...sizes);
  const crackCount = (ratio) => (ratio > 0.9 ? 0 : ratio > 0.75 ? 1 : ratio > 0.6 ? 2 : ratio > 0.4 ? 3 : 4);
  const pressDown = stage === 1 || stage === 2;
  return (
    <div className="squash">
      <div className="squash-stage" style={{ height: tallest + 34 }}>
        <div className={`squash-press${pressDown ? ' down' : ''}${stage >= 3 ? ' up' : ''}`}
          style={{ bottom: pressDown ? smallest * 0.92 : tallest + 22 }} />
        <div className="squash-row">
          {FIVE.map((c, k) => {
            const ratio = smallest / sizes[k];
            return (
              <div className={`squash-item${stage === 1 && ratio < 0.95 ? ' quiver' : ''}`} key={c.short} style={ms(200 + k * 180)}>
                {stage >= 3 && <i className="slide-drop squash-ballot" style={{ bottom: smallest + 4, ...ms(k * 220) }} />}
                {stage >= 4 && ratio === 1 && <span className="squash-ha" style={{ bottom: smallest + 26 }}>Ha!</span>}
                <SquashChurch size={sizes[k]} ratio={ratio} crushed={stage >= 1} cracks={crackCount(ratio)} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="squash-names">{FIVE.map((c) => <b key={c.short}>{c.short}</b>)}</div>
      <div className="slide-morph-note">
        {stage === 0 && 'Five churches of very different sizes\u2026'}
        {(stage === 1 || stage === 2) && '\u2026one church, one vote presses them all down to the same size\u2026'}
        {stage >= 3 && <Count to={5} delay={600} label=" votes: one per church, whatever it puts in." />}
      </div>
    </div>
  );
}

/**
 * Who gives the most? First the gifts in dollars, where the large churches look
 * like the biggest givers. Then each church's budget appears, and the bars turn
 * into the share of that budget given, which reverses the picture.
 */
function SlideDollarsToShare() {
  const [stage, setStage] = useState(0); // 0 dollars, 1 budgets shown, 2 share of budget, 3 done
  useEffect(() => {
    setStage(0);
    const ts = [4500, 8500, 10500].map((t, i) => setTimeout(() => setStage(i + 1), t)); // dollars, budgets, share, done
    return () => ts.forEach(clearTimeout);
  }, []);
  const maxGives = Math.max(...FIVE.map((c) => c.gives));
  const share = stage >= 2;
  return (
    <div className={`slide-morph${share ? ' share' : ''}`}>
      <div className="slide-morph-caption">{share ? 'Share of its own budget given to ACME' : 'Dollars given to ACME'}</div>
      {FIVE.map((c, i) => (
        <div className="slide-morph-row" key={c.short} style={ms(200 + i * 140)}>
          <div className="slide-morph-name">
            <b>{c.short}</b>
            <span className={stage >= 1 ? 'on' : ''}>{money(c.budget)} budget</span>
          </div>
          <div className="slide-morph-track">
            {share && [2, 3, 4].map((t) => <i key={t} className="slide-meter-line" style={{ left: `${(t / 5) * 100}%` }} />)}
            <span className="slide-morph-bar"
              style={{ width: `${share ? (c.pct / 5) * 100 : (c.gives / maxGives) * 100}%`, transitionDelay: share ? `${i * 90}ms` : '0ms', ...ms(300 + i * 140) }} />
          </div>
          <span className="slide-morph-value">{share ? `${c.pct.toFixed(1)}%` : dollars(c.gives)}</span>
        </div>
      ))}
      <div className="slide-morph-note">
        {stage === 0 && 'In dollars, the two largest churches give the most…'}
        {stage === 1 && '…but look at the size of their budgets.'}
        {stage >= 2 && 'As a share of what they have, the order turns over.'}
      </div>
    </div>
  );
}

function SlideCommitment() {
  return (
    <div className="slide-meters">
      <div className="slide-meter-scale" style={ms(150)}>
        {[0, 1, 2, 3, 4, 5].map((t) => <span key={t} style={{ left: `${(t / 5) * 100}%` }}>{t}%</span>)}
      </div>
      {FIVE.map((c, i) => (
        <div className="slide-meter" key={c.short} style={ms(200 + i * 150)}>
          <b>{c.short}</b>
          <div className="slide-meter-track">
            {[2, 3, 4].map((t) => <i key={t} className="slide-meter-line" style={{ left: `${(t / 5) * 100}%` }} />)}
            <span className="slide-meter-fill" style={{ width: `${(c.pct / 5) * 100}%`, ...ms(400 + i * 180) }} />
          </div>
          <span className="slide-meter-pct" style={ms(900 + i * 180)}>{c.pct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function SlideWeights() {
  return (
    <div className="slide-weights">
      <div className="slide-bands" style={ms(100)}>
        {[['under 2%', 1], ['2–3%', 2], ['3–4%', 3], ['4%+', 4]].map(([l, v], i) => (
          <span key={l} style={ms(150 + i * 120)}><b>{v}</b>{l}</span>
        ))}
      </div>
      {FIVE.map((c, i) => (
        <div className="slide-weight-row" key={c.short} style={ms(500 + i * 200)}>
          <b>{c.short}</b>
          <span className="slide-weight-pct">{c.pct.toFixed(1)}%</span>
          <Dots n={c.votes} from={700 + i * 240} />
        </div>
      ))}
      <div className="slide-total" style={ms(2100)}><Count to={TOTAL_VOTES} delay={2100} label=" weighted votes in all" /></div>
    </div>
  );
}

function SlideBoth() {
  return (
    <div className="slide-two">
      <div className="slide-box" style={ms(200)}>
        <div className="slide-two-head">Church count</div>
        <Dots n={5} from={500} tone="white" step={140} />
        <div className="slide-two-sub"><Count to={5} delay={500} label=" votes · 1 per church" /></div>
      </div>
      <div className="slide-two-plus" style={ms(1100)}>and</div>
      <div className="slide-box" style={ms(1300)}>
        <div className="slide-two-head">Weighted count</div>
        <Dots n={TOTAL_VOTES} from={1600} step={90} />
        <div className="slide-two-sub"><Count to={TOTAL_VOTES} delay={1600} label=" votes · 1 to 4 per church" /></div>
      </div>
      <div className="slide-need" style={ms(2800)}>To pass: a majority of <b>both</b></div>
    </div>
  );
}

/** An animated example: who votes Yes, then each count fills, then the verdict.
 *  Each step waits long enough to be read. */
function Example({ yes, label, start }) {
  const yesC = FIVE.filter((c) => yes.includes(c.short));
  const churchYes = yesC.length;
  const weightYes = yesC.reduce((s, c) => s + c.votes, 0);
  const cPass = churchYes * 2 > FIVE.length;
  const wPass = weightYes * 2 > TOTAL_VOTES;
  const t = { who: start + 600, church: start + 2200, churchLabel: start + 3200, weighted: start + 4400, weightedLabel: start + 5400, stamp: start + 6800 };
  return (
    <div className="slide-example" style={ms(start)}>
      <div className="slide-example-head">{label}</div>
      <div className="slide-example-who">
        {FIVE.map((c, i) => (
          <span key={c.short} className={yes.includes(c.short) ? 'yes' : 'no'} style={ms(t.who + i * 160)}>{c.short}</span>
        ))}
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

const INTRO = [
  {
    title: 'How should churches decide together?',
    body: 'ACME is a fellowship of churches of every size. Here are five of them, drawn to the size of their budgets. When they vote together, how should the votes be counted?',
    viz: () => <SlideChurches />,
  },
  {
    title: 'One church, one vote',
    body: 'The simplest answer: every church gets one vote, large or small. It is fair to every church. But it counts a church the same whether it gives a little or a lot to the work they share.',
    viz: () => <SlideOneVote />,
  },
  {
    title: 'Who gives the most?',
    body: 'Counted in dollars, the large churches give the most. But every church gives out of its own budget, and that changes the picture.',
    viz: () => <SlideDollarsToShare />,
  },
  {
    title: 'Weighted votes follow commitment',
    body: 'Under Double Majority Voting, each church also gets 1 to 4 weighted votes, set by the share of its budget it gives. Size has nothing to do with it.',
    viz: () => <SlideWeights />,
  },
  {
    title: 'Every decision is counted twice',
    body: 'Once with one vote per church, and once with the weighted votes. To pass, a decision needs a majority in both counts.',
    viz: () => <SlideBoth />,
  },
  {
    title: 'Why both?',
    body: 'Either count alone can be unfair. Counting churches alone, churches that give little can outvote those that give much. Counting weight alone, a few committed churches can outvote everyone else. Together, neither group can decide for the other.',
    viz: () => (
      <div className="slide-examples">
        <Example yes={['Emmanuel', 'Covenant', 'Hope']} label="Three churches that give less vote Yes" start={400} />
        <Example yes={['Harbor', 'Grace']} label="Two churches that give more vote Yes" start={8600} />
      </div>
    ),
  },
  {
    title: 'Now try it',
    body: 'Next, you will be the delegate for Grace, the small church that gives 4.5%, at a National Business Meeting. Five ballots, each showing a different side of Double Majority Voting.',
    viz: () => (
      <div className="slide-try">
        <Church size={churchPx(FIVE[4].budget)} delay={200} />
        <Dots n={4} from={700} step={180} />
      </div>
    ),
  },
];

// ---------------------------------------------------------------------------
// Closing slides
// ---------------------------------------------------------------------------

/** All five churches climb to 4% and 4 votes, then the weighted count collapses to one church, one vote. */
function SlideEveryone() {
  const [stage, setStage] = useState(0); // 0 start, 1-3 climbing, 4 all at four, 5 flash, 6 collapsed
  useEffect(() => {
    setStage(0);
    const times = [1800, 3400, 5000, 6600, 8600, 10600]; // climb x3, all at four, flash, collapse
    const ts = times.map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => ts.forEach(clearTimeout);
  }, []);
  const votesAt = (c) => {
    if (stage >= 6) return 1;
    const pct = pctAt(c);
    return pct < 2 ? 1 : pct < 3 ? 2 : pct < 4 ? 3 : 4; // the dots follow the share given
  };
  // each church rises from its own share toward 4% (a church already above 4% stays put)
  const pctAt = (c) => { const top = Math.max(4, c.pct); return stage >= 4 ? top : c.pct + ((top - c.pct) * Math.min(stage, 3)) / 3; };
  return (
    <div className={`slide-everyone${stage === 5 ? ' flash' : ''}${stage >= 6 ? ' collapsed' : ''}`}>
      {FIVE.map((c) => (
        <div className="slide-every-row" key={c.short}>
          <b>{c.short}</b>
          <span className="slide-weight-pct">{`${pctAt(c).toFixed(1)}%`}</span>
          <span className="slide-chips steady">
            {[0, 1, 2, 3].map((k) => <i key={k} className={k < votesAt(c) ? 'gold' : 'off'} />)}
          </span>
        </div>
      ))}
      <div className="slide-every-note">
        {stage < 4 && 'Every church gives more…'}
        {stage >= 4 && stage < 6 && 'Every church has 4 weighted votes.'}
        {stage >= 6 && 'Equal weight is one church, one vote again.'}
      </div>
    </div>
  );
}

const OUTRO = [
  {
    title: 'What you saw',
    body: 'Five ballots, four lessons.',
    viz: () => (
      <div className="slide-list">
        {[
          ['When churches agree, both counts agree.', 'The budget passed easily.'],
          ['Size does not buy votes.', 'The three largest churches wanted the office. Each had one church vote and one weighted vote, like any church that gives under 2%.'],
          ['Churches that give little cannot outvote those that give much.', 'Counting churches alone, the ad campaign would have passed. The weighted count stopped it.'],
          ['Committed churches cannot overrule everyone else.', 'Counting weight alone, the conference money would have gone to missions. The church count stopped it.'],
        ].map(([a, b], i) => (
          <div className="slide-list-item" key={a} style={ms(200 + i * 250)}>
            <span className="slide-list-check">✓</span>
            <span><b>{a}</b> {b}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Big does not mean powerful',
    body: 'Emmanuel’s budget is twelve times Grace’s. Emmanuel has 1 weighted vote. Grace has 4.',
    viz: () => (
      <div className="slide-vs">
        {[FIVE[0], FIVE[4]].map((c, i) => (
          <div className="slide-vs-side" key={c.short} style={ms(200 + i * 400)}>
            <div className="slide-vs-top">
              <Church size={churchPx(c.budget)} delay={200 + i * 400} />
              <div>
                <b>{c.short}</b>
                <span className="slide-two-sub">{money(c.budget)} budget · gives {c.pct.toFixed(1)}%</span>
              </div>
            </div>
            <Dots n={c.votes} from={900 + i * 500} step={200} />
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Commitment is a choice',
    body: 'Any church, of any size, can earn more weight. As a church gives a larger share of its budget, it moves up, one weighted vote at a time, to 4.',
    viz: () => (
      <div className="slide-gauge">
        <div className="slide-gauge-track">
          {[['under 2%', 1], ['2–3%', 2], ['3–4%', 3], ['4%+', 4]].map(([l, v], i) => (
            <span key={l} style={ms(900 + i * 1100)}><b>{v}</b>{l}</span>
          ))}
          <i className="slide-gauge-dot" />
        </div>
      </div>
    ),
  },
  {
    title: 'If every church gave 4%',
    body: 'Watch what happens if every church moves up to the most committed level.',
    viz: () => <SlideEveryone />,
  },
  {
    title: 'Double Majority Voting',
    body: 'Every church has a voice. Commitment has weight. And the more churches share in the work, the closer the two counts come to one: every church, fully committed, with an equal say. A decision needs both.',
    viz: () => (
      <div className="slide-final">
        <Dots n={5} from={200} tone="white" step={140} />
        <span className="slide-two-plus">+</span>
        <Dots n={TOTAL_VOTES} from={900} step={80} />
      </div>
    ),
  },
];

function ReplayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8.3" />
      <path d="M3 3v5.3h5.3" />
    </svg>
  );
}

function Slideshow({ slides, lastLabel, onDone, onSkip }) {
  const [i, setI] = useState(0);
  const [replay, setReplay] = useState(0); // bumping this restarts the slide's animation
  const s = slides[i];
  const last = i === slides.length - 1;
  return (
    <div className="slides">
      <div className="slides-top">
        <Logo />
        {onSkip && !last && <button className="slides-skip" onClick={onSkip}>Skip</button>}
      </div>
      <div className="slides-body" key={i}>
        <h1 className="slides-title">{s.title}</h1>
        <p className="slides-text">{s.body}</p>
        <div className="slides-viz" key={replay}>{s.viz()}</div>
        <button className="slides-replay-btn" onClick={() => setReplay(replay + 1)} aria-label="Replay the animation" title="Replay">
          <ReplayIcon />
        </button>
      </div>
      <div className="slides-bottom">
        <button className="slides-back" onClick={() => { setI(i - 1); setReplay(0); }} style={{ visibility: i > 0 ? 'visible' : 'hidden' }}>Back</button>
        <div className="slides-dots">{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <button className="btn gold slides-next" onClick={() => { if (last) onDone(); else { setI(i + 1); setReplay(0); } }}>{last ? lastLabel : 'Next'}</button>
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
