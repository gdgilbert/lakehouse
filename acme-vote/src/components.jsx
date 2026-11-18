import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as api from './server/api.js';
import { FEATURES } from './features.js';
import { editKey, removeTipEdit, saveTipEdit, useTipEdits } from './tipStore.js';
import { BALLOT_TYPES, COUNT_RULES, THRESHOLDS, fmt } from './server/rules.js';

// ---------------------------------------------------------------------------
// Navigation: a simple screen stack
// ---------------------------------------------------------------------------

export const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

// ---------------------------------------------------------------------------
// Data loading: re-runs whenever the mock server's data changes
// ---------------------------------------------------------------------------

export function useData(loader, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null });
  const ref = useRef(loader);
  ref.current = loader;
  const reload = useCallback(() => {
    ref.current().then(
      (data) => setState({ data, error: null }),
      (error) => setState((s) => ({ ...s, error }))
    );
  }, []);
  useEffect(() => {
    reload();
    return api.subscribe(reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [state.data, state.error, reload];
}

// ---------------------------------------------------------------------------
// Icons (inline, stroke style)
// ---------------------------------------------------------------------------

const paths = {
  back: 'M15 18l-6-6 6-6',
  chev: 'M9 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  ballot: 'M4 7h16v13H4zM9 3h6v6H9z M8 13h8',
  results: 'M5 20V10M12 20V4M19 20v-7',
  church: 'M12 2v5M10 4h4M5 21V11l7-4 7 4v10M9 21v-5a3 3 0 016 0v5',
  people: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M17 11a3 3 0 000-6M22 21v-1a5 5 0 00-4-4.9',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  lightbulb: 'M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z',
  x: 'M6 6l12 12M18 6L6 18',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  vote: 'M9 12l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
  gavel: 'M14 13l-7.5 7.5a2.1 2.1 0 01-3-3L11 10M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8',
  key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.5-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.7 1.1z',
};

export function Icon({ name, size = 22, stroke = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="#c9a04f" strokeWidth="1.5" />
      <path d="M20 8v24M13 15.5h14" stroke="#c9a04f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Double-tapping the ACME logo (or a screen title in the header) starts the whole
 * demo over from the opening screen: votes, results and tutorial progress are
 * cleared. Edited tip wording is kept.
 */
export function useRestartOnDoubleTap() {
  const nav = useNav();
  const last = useRef(0);
  return () => {
    const now = Date.now();
    if (now - last.current < 400) {
      last.current = 0;
      (async () => {
        await api.resetDemo({ mode: 'path' });
        await api.signOut();
        try { sessionStorage.removeItem('acme-vote-tip-page'); } catch { /* ignore */ }
        nav.reset('start');
      })();
    } else {
      last.current = now;
    }
  };
}

export function Logo({ large }) {
  const tap = useRestartOnDoubleTap();
  return (
    <div className={`logo${large ? ' large' : ''}`} onClick={tap} title="Double-tap to start over">
      <div className="logo-word">
        <b>ACME</b>
        <small>Fellowship of Churches</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------

/**
 * Shown under the header on every delegate screen while a ballot is open that the
 * delegate's church has not voted on yet, except on that ballot's own screen.
 */
function OpenBallotBar() {
  const nav = useNav();
  const [session] = useData(() => api.getSession());
  const churchId = session?.role === 'delegate' ? session.churchId : null;
  const [ballots] = useData(() => (churchId ? api.listBallots({ churchId }) : Promise.resolve([])), [churchId]);
  const here = nav.current?.props?.ballotId;
  const open = (ballots || []).find((b) => b.status === 'open' && b.eligible && !b.myVote && b.id !== here);
  if (!churchId || !open) return null;
  const go = () => {
    const name = nav.current?.name;
    if (name === 'delegateBallot' || name === 'delegateReceipt') nav.replace('delegateBallot', { ballotId: open.id });
    else nav.push('delegateBallot', { ballotId: open.id });
  };
  return (
    <button type="button" className="next-ballot open-bar" onClick={go}>
      <span>
        <span className="eyebrow-sm">Ballot open · vote now</span>
        <b>{open.title}</b>
        <span className="sub">{typeLabel(open)} · {THRESHOLDS[open.threshold].label}{open.countRule === 'church' ? ' · Church count only' : ' · Both counts'}</span>
      </span>
      <Icon name="chev" />
    </button>
  );
}

export function AppBar({ title, back, right, logo }) {
  const nav = useNav();
  const restartTap = useRestartOnDoubleTap();
  return (
    <>
    <header className="appbar">
      {back !== false && nav.canPop && (
        <button className="back" onClick={nav.pop} aria-label="Back">
          <Icon name="back" />
        </button>
      )}
      {logo ? <div style={{ flex: 1, paddingLeft: 4 }}><Logo /></div> : <h1 onClick={restartTap}>{title}</h1>}
      {right && <div className="right">{right}</div>}
    </header>
    <OpenBallotBar />
    </>
  );
}

export function TabBar({ tabs, current, onChange }) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={current === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          <span className="badge" data-count={t.count || undefined}>
            <Icon name={t.icon} />
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

// Bottom sheet. Close it by swiping down, tapping outside it, or the X button.
/**
 * The delegate's three bottom tabs, on every delegate screen. Tapping one goes
 * home and opens that tab. On the home screen itself, onChange switches tabs.
 */
export function DelegateTabs({ current, onChange }) {
  const nav = useNav();
  const [session] = useData(() => api.getSession());
  const churchId = session?.role === 'delegate' ? session.churchId : null;
  const [ballots] = useData(() => (churchId ? api.listBallots({ churchId }) : Promise.resolve([])), [churchId]);
  if (!churchId) return null;
  const toVote = (ballots || []).filter((b) => b.status === 'open' && b.eligible && !b.myVote).length;
  const go = (id) => {
    if (onChange) { onChange(id); return; }
    setStickyValue('delegate-tab', id);
    nav.reset('delegateHome', { churchId });
  };
  return (
    <TabBar current={current} onChange={go} tabs={[
      { id: 'ballots', label: 'Ballots', icon: 'ballot', count: toVote },
      { id: 'results', label: 'Results', icon: 'results' },
      { id: 'church', label: 'My church', icon: 'church' },
    ]} />
  );
}

export function Sheet({ onClose, children }) {
  const ref = useRef(null);
  const start = useRef(null);
  const [dy, setDy] = useState(0);

  const begin = (y) => {
    if (ref.current && ref.current.scrollTop <= 0) start.current = y;
  };
  const move = (y) => {
    if (start.current == null) return;
    const d = y - start.current;
    if (d > 0) setDy(d);
    else { start.current = null; setDy(0); } // swiping up scrolls the sheet instead
  };
  const end = () => {
    if (start.current == null) return;
    start.current = null;
    if (dy > 80) onClose();
    else setDy(0);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" ref={ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
        onTouchStart={(e) => begin(e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientY)}
        onTouchEnd={end} onTouchCancel={end}>
        <div className="sheet-top"
          onPointerDown={(e) => { if (e.pointerType === 'mouse') { begin(e.clientY); e.currentTarget.setPointerCapture(e.pointerId); } }}
          onPointerMove={(e) => e.pointerType === 'mouse' && move(e.clientY)}
          onPointerUp={(e) => e.pointerType === 'mouse' && end()}>
          <div className="grabber" />
          <button className="sheet-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * A button that must be held down for `ms` milliseconds. The fill grows behind the
 * finger while it is held; letting go early drains it and nothing happens.
 */
export function HoldButton({ label, holdingLabel = 'Keep holding…', doneLabel, onComplete, disabled, ms = 2000 }) {
  const [progress, setProgress] = useState(0); // 0 to 1
  const [state, setState] = useState('idle'); // idle | holding | done
  const raf = useRef(0);
  const startAt = useRef(0);
  const from = useRef(0);

  const stopAnim = () => cancelAnimationFrame(raf.current);
  useEffect(() => stopAnim, []);

  const begin = (e) => {
    if (disabled || state === 'done') return;
    if (e && e.currentTarget && e.pointerId != null) e.currentTarget.setPointerCapture(e.pointerId);
    stopAnim();
    setState('holding');
    from.current = progress;
    startAt.current = performance.now();
    const step = (now) => {
      const p = Math.min(1, from.current + (now - startAt.current) / ms);
      setProgress(p);
      if (p >= 1) {
        setState('done');
        if (navigator.vibrate) { try { navigator.vibrate(30); } catch { /* ignore */ } }
        onComplete();
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const cancel = () => {
    if (state !== 'holding') return;
    stopAnim();
    setState('idle');
    // drain back quickly
    const start = performance.now();
    const p0 = progress;
    const drain = (now) => {
      const p = Math.max(0, p0 - (now - start) / 350);
      setProgress(p);
      if (p > 0) raf.current = requestAnimationFrame(drain);
    };
    raf.current = requestAnimationFrame(drain);
  };

  return (
    <button type="button" className={`hold-btn${state === 'holding' ? ' holding' : ''}`} disabled={disabled}
      onPointerDown={begin} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); begin(); } }}
      onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') cancel(); }}
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}
      aria-label={`${label}. Press and hold.`}>
      <span className="hold-fill" style={{ transform: `scaleX(${progress})` }} />
      <span className="hold-label">{state === 'done' ? (doneLabel || label) : state === 'holding' ? holdingLabel : label}</span>
    </button>
  );
}

export function Row({ title, sub, right, onClick, chevron = true }) {
  return (
    <button className={`row${onClick ? '' : ' static'}`} onClick={onClick} type="button">
      <div className="main">
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
      {onClick && chevron && <span className="chev"><Icon name="chev" size={18} /></span>}
    </button>
  );
}

export function Empty({ icon = 'inbox', children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={36} stroke={1.5} />
      <div>{children}</div>
    </div>
  );
}

export function Banner({ tone = 'navy', icon, title, children }) {
  const ic = icon || { green: 'check', red: 'x', gold: 'alert', navy: 'info' }[tone];
  return (
    <div className={`banner ${tone}`}>
      <span className="icon"><Icon name={ic} /></span>
      <div>
        {title && <h3>{title}</h3>}
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

export function Choice({ selected, onClick, label, desc, className = '' }) {
  return (
    <button type="button" className={`choice ${className}${selected ? ' selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      <span className="dot" />
      <span>
        <span className="label">{label}</span>
        {desc && <span className="desc" style={{ display: 'block' }}>{desc}</span>}
      </span>
    </button>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="toggle">
      <span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {hint && <span className="tiny muted" style={{ display: 'block' }}>{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" />
    </label>
  );
}

export function WeightPips({ n }) {
  return (
    <div className="weight-pips" aria-label={`${n} of 4 votes`}>
      {[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ballot helpers
// ---------------------------------------------------------------------------

export function typeLabel(b) {
  if (b.commissionId) return 'Judicial Commission slate';
  return BALLOT_TYPES[b.type]?.label || b.type;
}

export function StatusChip({ status }) {
  if (status === 'open') return <span className="chip green">Open</span>;
  if (status === 'draft') return <span className="chip gray">Not open yet</span>;
  return <span className="chip">Closed</span>;
}

export function RuleChips({ ballot }) {
  return (
    <div className="chips">
      <span className="chip gold">{typeLabel(ballot)}</span>
      <span className="chip">{THRESHOLDS[ballot.threshold].label}</span>
      <span className="chip">{COUNT_RULES[ballot.countRule]}</span>
      {ballot.region && <span className="chip">{ballot.region} churches only</span>}
    </div>
  );
}

export const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const time = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function choiceLabel(ballot, choice) {
  if (choice === 'abstain') return 'Abstain';
  if (choice === 'yes') return 'Yes';
  if (choice === 'no') return 'No';
  return ballot.options.find((o) => o.id === choice)?.label || choice;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const unitFor = (n, unit) => (n === 1 ? { churches: 'church', votes: 'vote' }[unit] || unit : unit);

function BarRow({ label, value, total, unit, tone, mark }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="bar-row">
      <div className="top">
        <b>{label}</b>
        <span>
          {value} {unitFor(value, unit)} {total > 0 && <span className="muted">· {fmt(p)}%</span>}
        </span>
      </div>
      <div className="bar">
        <i className={tone} style={{ width: `${p}%` }} />
        {mark != null && <span className="mark" style={{ left: `${mark}%` }} />}
      </div>
    </div>
  );
}

const markFor = { majority: 50, twoThirds: 66.67, threeQuarters: 75 };

function MotionCount({ title, count, pass, unit, decides, threshold, ballotId }) {
  const nav = useNav();
  return (
    <div className="card count-block tappable" onClick={() => nav.push('resultDetails', { ballotId, focus: unit === 'votes' ? 'weighted' : 'church' })}
      role="link" aria-label={`${title}: see the details`}>
      <h3>
        {title}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {decides ? (
            pass ? <span className="chip green">Passed</span> : <span className="chip red">Did not pass</span>
          ) : (
            <span className="chip gray">Does not decide</span>
          )}
          <span className="chev"><Icon name="chev" size={18} /></span>
        </span>
      </h3>
      <BarRow label="Yes" value={count.by.yes} total={count.cast} unit={unit} mark={markFor[threshold]} />
      <BarRow label="No" value={count.by.no} total={count.cast} unit={unit} tone="gray" />
      <div className="legend">
        {count.cast} {unitFor(count.cast, unit)} cast. {count.abstain > 0 && `${count.abstain} abstained (not counted). `}
        Needed: {THRESHOLDS[threshold].label.toLowerCase()}. The line on the bar marks it.
      </div>
    </div>
  );
}

/** Shown under a closed result: the next open ballot this viewer can act on. */
export function NextBallot({ currentId, churchId, screen }) {
  const nav = useNav();
  const [ballots] = useData(() => api.listBallots(churchId ? { churchId } : {}), [churchId]);
  const next = (ballots || []).find((b) => b.status === 'open' && b.id !== currentId && (!churchId || (b.eligible && !b.myVote)));
  if (!next) return null;
  return (
    <button type="button" className="next-ballot" onClick={() => nav.replace(screen, { ballotId: next.id })}>
      <span>
        <span className="eyebrow-sm">Next ballot is open</span>
        <b>{next.title}</b>
        <span className="sub">{typeLabel(next)} · {THRESHOLDS[next.threshold].label} · {COUNT_RULES[next.countRule]}{next.region ? ` · ${next.region} only` : ''}</span>
      </span>
      <Icon name="chev" />
    </button>
  );
}

/**
 * The same votes counted four ways, to show why Double Majority Voting counts
 * both: each single count, votes by dollars given, and Double Majority Voting.
 */
export function CountedWays({ ballot }) {
  const r = ballot.result;
  const verdict = (ok) => <span className={`chip ${ok ? 'green' : 'red'}`}>{ok ? 'Passes' : 'Fails'}</span>;
  let lesson;
  if (r.churchPass && !r.weightedPass) {
    lesson = 'Counting churches alone, this would have passed, though the churches voting Yes give a small share of their budgets. The weighted count keeps churches that give little from outvoting the churches that give much.';
  } else if (r.weightedPass && !r.churchPass) {
    lesson = 'Counting weighted votes alone, this would have passed, though most churches voted No. The church count keeps a few committed churches from overruling everyone else.';
  } else if (ballot.story === 'size' && !r.passed) {
    lesson = 'The three largest churches backed this. Size counted for nothing: each had one church vote, and one weighted vote because each gives under 2% of its budget.';
  } else {
    lesson = r.passed
      ? 'Both counts give the same answer: it passes. When churches broadly agree, Double Majority Voting changes nothing.'
      : 'Both counts give the same answer: it fails.';
  }
  return (
    <div className="counted-ways">
      <h3>Counted different ways</h3>
      <div className="cw-row">
        <span>One church, one vote<span className="cw-sub">{fmt(r.churchYesPct)}% of churches voted Yes</span></span>
        {verdict(r.churchPass)}
      </div>
      <div className="cw-row">
        <span>Weighted votes only<span className="cw-sub">{fmt(r.weightedYesPct)}% of weighted votes were Yes</span></span>
        {verdict(r.weightedPass)}
      </div>
      <div className="cw-row dmv">
        <span><b>Double Majority Voting</b><span className="cw-sub">Needs both the church count and the weighted count</span></span>
        {verdict(r.passed)}
      </div>
      <p className="cw-lesson">{lesson}</p>
    </div>
  );
}

function ChartsLink({ ballotId, churchOnly }) {
  const nav = useNav();
  return (
    <button type="button" className="results-link" onClick={() => nav.push('resultDetails', { ballotId })}>
      <span>
        <b>Charts and details</b>
        <span className="sub">{churchOnly ? 'Votes by Region and every church\u2019s vote' : 'Both counts, votes by weight and Region, and every church\u2019s vote'}</span>
      </span>
      <Icon name="results" />
    </button>
  );
}

export function ResultView({ ballot }) {
  const r = ballot.result;
  if (!r) return null;
  if (r.kind === 'motion') {
    return (
      <>
        {r.passed ? (
          <Banner tone="green" title="Passed">{r.explanation}</Banner>
        ) : (
          <Banner tone="red" title="Did not pass">{r.explanation}</Banner>
        )}
        {ballot.countRule === 'both' && <CountedWays ballot={ballot} />}
        <ChartsLink ballotId={ballot.id} churchOnly={ballot.countRule === 'church'} />
        <MotionCount title="Church count" count={r.tally.church} pass={r.churchPass} unit="churches"
          decides threshold={ballot.threshold} ballotId={ballot.id} />
        {ballot.countRule === 'both' && (
          <MotionCount title="Weighted count" count={r.tally.weighted} pass={r.weightedPass} unit="votes"
            decides threshold={ballot.threshold} ballotId={ballot.id} />
        )}
      </>
    );
  }
  return <ElectionResult ballot={ballot} r={r} />;
}

function ElectionResult({ ballot, r }) {
  const nav = useNav();
  const name = (id) => ballot.options.find((o) => o.id === id)?.label || id;
  const { rows, tally: t } = r.standings;
  let banner;
  if (r.outcome === 'elected') banner = <Banner tone="green" title={`${name(r.winner)} is elected`}>{r.explanation}</Banner>;
  else if (r.outcome === 'disqualified') banner = <Banner tone="red" title="Candidates disqualified">{r.explanation}</Banner>;
  else banner = <Banner tone="gold" title="No one elected on this ballot">{r.explanation}</Banner>;
  return (
    <>
      {banner}
      <ChartsLink ballotId={ballot.id} />
      <div className="card tappable" onClick={() => nav.push('resultDetails', { ballotId: ballot.id })}>
        <table className="standings">
          <thead>
            <tr><th>Candidate</th><th>Church</th><th>Weighted</th><th>Combined</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={r.winner === row.id ? 'win' : ''}>{name(row.id)}</td>
                <td className={row.carriesChurch ? 'win' : ''}>{fmt(row.churchPct)}%<span className="n">{row.churchVotes} {unitFor(row.churchVotes, 'churches')}</span></td>
                <td className={row.carriesWeighted ? 'win' : ''}>{fmt(row.weightedPct)}%<span className="n">{row.weightedVotes} {unitFor(row.weightedVotes, 'votes')}</span></td>
                <td>{fmt(row.combined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="legend">
          {t.church.cast} {unitFor(t.church.cast, 'churches')} and {t.weighted.cast} weighted {unitFor(t.weighted.cast, 'votes')} cast.
          {t.church.abstain > 0 && ` ${t.church.abstain} ${unitFor(t.church.abstain, 'churches')} abstained (not counted).`} Green marks a count the
          candidate carried ({THRESHOLDS[ballot.threshold].label.toLowerCase()}). Combined score = church % + weighted %.
        </div>
      </div>
      <div className="list">
        <Row title="Church count details" sub="Each candidate's share, and by Region"
          onClick={() => nav.push('resultDetails', { ballotId: ballot.id, focus: 'church' })} />
        <Row title="Weighted count details" sub="Each candidate's share, by weight and by Region"
          onClick={() => nav.push('resultDetails', { ballotId: ballot.id, focus: 'weighted' })} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tutorial tip card
// ---------------------------------------------------------------------------

/**
 * Shows the first tip in `tips` that has not been seen. A tip has an id, pages
 * ({title, body, target?, action?}) and an optional target selector that is
 * highlighted while the tip is open.
 */
function alertSaveFailed() {
  // The viewer's frame shows no alert() dialogs, so log it; the draft stays open for another try.
  console.warn('The tip could not be saved. Try again.');
}

/**
 * Scroll the screen so `el` is centered, slowly and with gentle easing.
 * Stops if the viewer touches or scrolls. Returns a function that cancels it.
 */
function slowScrollTo(el, zoneTop, zoneBottom) {
  const box = el.closest('.content');
  if (!box) return null;
  const r = el.getBoundingClientRect();
  const max = box.scrollHeight - box.clientHeight;
  const from = box.scrollTop;
  // move the element to the middle of the visible zone (the part of the screen the tip does not cover)
  const to = Math.max(0, Math.min(max, from + (r.top + r.bottom) / 2 - (zoneTop + zoneBottom) / 2));
  const dist = Math.abs(to - from);
  if (dist < 2) return null;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    box.scrollTop = to;
    return null;
  }
  const duration = Math.min(2000, 1000 + dist * 2); // about 1 to 2 seconds; longer distances take longer
  const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2; // slow start, slow finish
  let raf = 0;
  const start = performance.now();
  const stop = () => {
    cancelAnimationFrame(raf);
    box.removeEventListener('touchstart', stop);
    box.removeEventListener('wheel', stop);
  };
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    box.scrollTop = from + (to - from) * ease(t);
    if (t < 1) raf = requestAnimationFrame(step);
    else stop();
  };
  box.addEventListener('touchstart', stop, { passive: true });
  box.addEventListener('wheel', stop, { passive: true });
  raf = requestAnimationFrame(step);
  return stop;
}

/**
 * The minimized tip. It appears where the viewer tapped (Got it or minimize).
 * Tap to reopen the tip; drag to move it out of the way.
 */
function TipChip({ label, at, onOpen }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const [pos, setPos] = useState(null); // { x, y }: top-left corner, relative to the screen area

  const clamp = (x, y) => {
    const el = ref.current;
    const box = el && el.offsetParent;
    if (!el || !box) return { x, y };
    const maxX = box.clientWidth - el.offsetWidth - 6;
    const maxY = box.clientHeight - el.offsetHeight - 6;
    return { x: Math.max(6, Math.min(maxX, x)), y: Math.max(6, Math.min(maxY, y)) };
  };

  // Place it before it is drawn: the spot it was last dragged to, else where minimize was tapped.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (at) setPos(clamp(at.cx - el.offsetWidth / 2, at.cy - el.offsetHeight / 2));
    else setPos(clamp(9999, 9999));
  }, []);

  const down = (e) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y, moved: false };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 8) return; // a tap, not a drag
    d.moved = true;
    setPos(clamp(d.x + dx, d.y + dy));
  };
  const up = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    e.preventDefault();
    if (!d.moved) onOpen(e);
  };

  return (
    <button ref={ref} type="button" className={`coach-pill${drag.current && drag.current.moved ? ' dragging' : ''}`}
      style={pos ? { left: pos.x, top: pos.y } : { visibility: 'hidden' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`${label}. Tap to open, drag to move.`} title="Tap to open. Drag to move.">
      <Icon name="lightbulb" size={18} />
      <span>{label}</span>
    </button>
  );
}

export function Coach({ tips }) {
  const [tut] = useData(() => api.getTutorial());
  const [closing, setClosing] = useState(null);
  const [collapsed, setCollapsed] = useState(null); // id of the tip that is minimized
  const [chipAt, setChipAt] = useState(null); // where the minimize button was tapped
  const [recallId, setRecallId] = useState(null); // the last tip finished on this screen, kept as a chip
  const openFrom = useRef(null); // where the chip was, so the card can grow out of it
  const [moved, setMoved] = useState({ id: null, dx: 0, dy: 0 }); // how far the viewer dragged the open card
  const cardDrag = useRef(null);
  const tipEdits = useTipEdits();
  const editing = FEATURES.editTips && tipEdits.canEdit;
  const [draft, setDraft] = useState(null); // { key, title, body } while a page is being edited
  const [saving, setSaving] = useState(false);
  // The page of the open tip is kept for this browser tab, so a reload (for example
  // when a new version is published) reopens the tip on the same page.
  const [pageState, setPageStateRaw] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('acme-vote-tip-page') || 'null') || { id: null, page: 0 }; } catch { return { id: null, page: 0 }; }
  });
  const setPageState = (v) => {
    setPageStateRaw(v);
    try { sessionStorage.setItem('acme-vote-tip-page', JSON.stringify(v)); } catch { /* ignore */ }
  };
  const [place, setPlace] = useState({ id: null, top: false });
  const cardRef = useRef(null);
  // The next unread tip; once none is left, the last one read stays available as a chip.
  const unread = tut && !tut.off ? (tips || []).find((t) => t && !tut.seen.includes(t.id) && t.id !== closing) : null;
  const rawTip = unread || (tut && !tut.off && recallId ? (tips || []).find((t) => t && t.id === recallId) : null) || null;
  // Show the edited wording where there is one.
  const tip = rawTip && FEATURES.editTips ? {
    ...rawTip,
    pages: rawTip.pages.map((x, i) => {
      const e = tipEdits.edits[editKey(rawTip.id, i)];
      return e ? { ...x, title: e.title, body: e.body, edited: true, originalTitle: x.title, originalBody: x.body }
        : { ...x, originalTitle: x.title, originalBody: x.body };
    }),
  } : rawTip;
  const page = tip && pageState.id === tip.id ? pageState.page : 0;
  const pg = tip ? tip.pages[Math.min(page, tip.pages.length - 1)] : null;
  // No highlight once a tip has been read and put away (Got it); a minimized unread tip keeps it.
  const putAway = tip && collapsed === tip.id && recallId === tip.id;
  const target = pg && !putAway ? pg.target || tip.target : null;
  const setPage = (n) => setPageState({ id: tip.id, page: n });

  // Decide once per tip, before it is drawn, whether it sits at the top or the
  // bottom of the screen: at the top when what it points to is in the lower
  // half, so the tip never covers it. It stays put while the pages change.
  // Placement: the card is first drawn invisibly so its height is known, then
  // put at the top or bottom, whichever does not cover anything the tip points
  // to. It waits briefly for those items to appear on screen.
  const firstSeen = useRef({ id: null, at: 0 });
  const [, setTick] = useState(0);
  useLayoutEffect(() => {
    if (!tip || place.id === tip.id || !cardRef.current) return;
    if (firstSeen.current.id !== tip.id) firstSeen.current = { id: tip.id, at: Date.now() };
    const sels = [...new Set([tip.target, ...tip.pages.map((x) => x.target)].filter(Boolean))];
    const els = sels.map((x) => document.querySelector(x));
    if (!tip.placement && els.some((x) => !x) && Date.now() - firstSeen.current.at < 700) {
      const t = setTimeout(() => setTick((n) => n + 1), 100);
      return () => clearTimeout(t);
    }
    let top = false;
    if (tip.placement) top = tip.placement === 'top';
    else {
      const card = cardRef.current;
      const h = card.offsetHeight;
      const fr = (card.closest('.device') || document.body).getBoundingClientRect();
      const bottomGap = parseFloat(getComputedStyle(card).bottom) || 70;
      const zones = {
        bottom: [fr.bottom - bottomGap - h, fr.bottom - bottomGap],
        top: [fr.top + 66, fr.top + 66 + h],
      };
      const overlap = ([a, b]) => els.filter(Boolean).reduce((sum, el) => {
        const r = el.getBoundingClientRect();
        return sum + Math.max(0, Math.min(b, r.bottom) - Math.max(a, r.top));
      }, 0);
      top = overlap(zones.top) < overlap(zones.bottom);
    }
    setPlace({ id: tip.id, top });
    return undefined;
  });

  // Reopening from the chip: grow the card out of the chip's position.
  useLayoutEffect(() => {
    const el = cardRef.current;
    const from = openFrom.current;
    if (!el || !from) return;
    openFrom.current = null;
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) return;
    const off = moved.id === tip?.id ? moved : { dx: 0, dy: 0 };
    el.style.transformOrigin = `${from.cx - el.offsetLeft - off.dx}px ${from.cy - el.offsetTop - off.dy}px`;
    el.classList.remove('coach-closing');
    el.classList.add('coach-opening');
    const t = setTimeout(() => el.classList.remove('coach-opening'), 420);
    return () => clearTimeout(t);
  });

  // After a card button is pressed, briefly block taps on the screen underneath,
  // so a tap cannot fall through to whatever the card was covering.
  const [shield, setShield] = useState(false);
  useEffect(() => {
    if (!shield) return undefined;
    const t = setTimeout(() => setShield(false), 450);
    return () => clearTimeout(t);
  }, [shield]);
  // Card buttons ignore taps for a moment after the card opens from the chip, so the
  // tap that opened it cannot also press the button that appears under the finger.
  const openedAt = useRef(0);
  const press = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (Date.now() - openedAt.current < 450) return;
    setShield(true);
    fn(e);
  };
  const shieldEl = shield ? <div className="coach-shield" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} /> : null;

  // Highlight what the tip points to. Scroll only if it is off screen.
  useEffect(() => {
    if (!target) return undefined;
    const el = document.querySelector(target);
    if (!el) return undefined;
    el.classList.add('coach-target');
    const box = el.closest('.content');
    const br = (box || el.closest('.device') || document.body).getBoundingClientRect();
    const card = cardRef.current ? cardRef.current.getBoundingClientRect() : null;
    // the part of the screen the tip card does not cover
    let zoneTop = br.top;
    let zoneBottom = br.bottom;
    if (card && place.top) zoneTop = Math.max(zoneTop, card.bottom + 8);
    else if (card) zoneBottom = Math.min(zoneBottom, card.top - 8);
    const r = el.getBoundingClientRect();
    let cancel = null;
    if (box && (r.top < zoneTop || r.bottom > zoneBottom)) cancel = slowScrollTo(el, zoneTop, zoneBottom);
    return () => { el.classList.remove('coach-target'); if (cancel) cancel(); };
  }, [target, tip?.id, place.id]);

  if (!tip) return shieldEl;
  const measuring = place.id !== tip.id;
  const last = page >= tip.pages.length - 1;
  if (!measuring && collapsed === tip.id) {
    return (
      <>
        {shieldEl}
        <TipChip label={`Tip${tip.pages.length > 1 ? ` ${page + 1} of ${tip.pages.length}` : ''}`}
          at={chipAt} onOpen={(e) => {
            const chip = e && e.currentTarget;
            if (chip && chip.offsetParent) {
              openFrom.current = { cx: chip.offsetLeft + chip.offsetWidth / 2, cy: chip.offsetTop + chip.offsetHeight / 2 };
            }
            openedAt.current = Date.now();
            setShield(true);
            setCollapsed(null);
            if (tip.id === recallId && !unread) setPageState({ id: tip.id, page: 0 }); // reread from the start
          }} />
      </>
    );
  }
  // Got it: the tip counts as read and shrinks to the chip, where it can be reopened while
  // the viewer stays on this screen. If another tip is waiting, that one opens instead.
  const placeChip = (e) => {
    const box = cardRef.current && cardRef.current.offsetParent;
    if (box && e && e.currentTarget && e.currentTarget.getBoundingClientRect) {
      const br = box.getBoundingClientRect();
      const r = e.currentTarget.getBoundingClientRect();
      const at = { cx: (r.left + r.right) / 2 - br.left, cy: (r.top + r.bottom) / 2 - br.top };
      setChipAt(at);
      return at;
    }
    return chipAt;
  };
  // Shrink the card into the point where the chip will appear, then run `finish`.
  const shrinkInto = (at, finish) => {
    const el = cardRef.current;
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || !at || still) { finish(); return; }
    const off = moved.id === tip.id ? moved : { dx: 0, dy: 0 };
    el.style.transformOrigin = `${at.cx - el.offsetLeft - off.dx}px ${at.cy - el.offsetTop - off.dy}px`;
    el.classList.add('coach-closing');
    setShield(true);
    setTimeout(finish, 340);
  };
  const done = (e, { now = false } = {}) => {
    const at = placeChip(e);
    const id = tip.id;
    const finish = () => {
      if (!tut.seen.includes(id)) {
        setClosing(id);
        api.markTipSeen(id);
        (tip.alsoMarks || []).forEach((x) => api.markTipSeen(x));
      }
      setRecallId(id);
      setCollapsed(id);
    };
    if (now) finish(); else shrinkInto(at, finish);
  };
  // Minimize: the chip appears where the minimize button was tapped.
  const minimize = (e) => {
    const at = placeChip(e);
    const id = tip.id;
    shrinkInto(at, () => setCollapsed(id));
  };

  const key = editKey(tip.id, Math.min(page, tip.pages.length - 1));
  const isDraft = draft && draft.key === key;
  const dynamic = /\d\.\d%/.test(pg.originalBody || '');
  const startEdit = () => setDraft({ key, title: pg.title, body: pg.body });
  const saveEdit = async () => {
    setSaving(true);
    try {
      if (draft.title === pg.originalTitle && draft.body === pg.originalBody) await removeTipEdit(key);
      else {
        await saveTipEdit(key, {
          tipId: tip.id, page, title: draft.title.trim(), body: draft.body.trim(),
          originalTitle: pg.originalTitle, originalBody: pg.originalBody, dynamic,
        });
      }
      setDraft(null);
    } catch {
      alertSaveFailed();
    } finally {
      setSaving(false);
    }
  };

  if (isDraft) {
    return (
      <>
        {shieldEl}
        <div ref={cardRef} className="coach coach-top coach-editing" role="dialog" aria-label="Edit tip">
          <div className="coach-head">
            <span className="eyebrow-sm">Editing tip{tip.pages.length > 1 ? ` · page ${page + 1} of ${tip.pages.length}` : ''}</span>
          </div>
          <label className="coach-field">
            <span>Heading</span>
            <input id="tip-edit-title" className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="coach-field">
            <span>Text</span>
            <textarea id="tip-edit-body" className="input" rows={6} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </label>
          {dynamic && (
            <p className="coach-note">
              This tip fills in numbers from each vote. Write it the way you want it to read. When you finalize the
              wording, Claude will make the numbers live again.
            </p>
          )}
          <div className="coach-actions">
            {(pg.edited || draft.title !== pg.originalTitle || draft.body !== pg.originalBody) && (
              <button className="coach-back" onClick={press(() => setDraft({ ...draft, title: pg.originalTitle, body: pg.originalBody }))}>
                Use original
              </button>
            )}
            <button className="btn small secondary coach-action" onClick={press(() => setDraft(null))} disabled={saving}>Cancel</button>
            <button className="btn small gold" onClick={press(saveEdit)} disabled={saving || !draft.title.trim() || !draft.body.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Dragging the open card by its grip bar. The card stays inside the screen.
  const off = moved.id === tip.id ? moved : { dx: 0, dy: 0 };
  const gripDown = (e) => {
    const el = cardRef.current;
    const box = el && el.offsetParent;
    if (!el || !box) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    cardDrag.current = {
      px: e.clientX, py: e.clientY, dx: off.dx, dy: off.dy,
      // limits so the card cannot leave the screen
      minX: off.dx - (r.left - br.left) + 4, maxX: off.dx + (br.right - r.right) - 4,
      minY: off.dy - (r.top - br.top) + 4, maxY: off.dy + (br.bottom - r.bottom) - 4,
    };
  };
  const gripMove = (e) => {
    const d = cardDrag.current;
    if (!d) return;
    const dx = Math.max(d.minX, Math.min(d.maxX, d.dx + e.clientX - d.px));
    const dy = Math.max(d.minY, Math.min(d.maxY, d.dy + e.clientY - d.py));
    setMoved({ id: tip.id, dx, dy });
  };
  const gripUp = () => { cardDrag.current = null; };

  return (
    <>
    {shieldEl}
    <div ref={cardRef} className={`coach${!measuring && place.top ? ' coach-top' : ''}${measuring ? ' coach-measuring' : ''}`} role="dialog" aria-label={pg.title}
      style={off.dx || off.dy ? { translate: `${off.dx}px ${off.dy}px` } : undefined}>
      <div className="coach-grip" onPointerDown={gripDown} onPointerMove={gripMove} onPointerUp={gripUp} onPointerCancel={gripUp} onLostPointerCapture={gripUp}
        title="Drag to move" aria-label="Drag to move the tip" role="separator">
        <span />
      </div>
      <div className="coach-head">
        <span className="eyebrow-sm">
          Tutorial{tip.pages.length > 1 ? ` · ${page + 1} of ${tip.pages.length}` : ''}
          {pg.edited && <span className="coach-edited">Edited</span>}
        </span>
        <span className="coach-tools">
          {editing && (
            <button className="coach-min" onClick={press(startEdit)} aria-label="Edit this tip" title="Edit">
              <Icon name="pencil" size={16} stroke={2.2} />
            </button>
          )}
          <button className="coach-hide" onClick={press(() => api.setTipsOff(true))}>Hide tips</button>
          <button className="coach-min" onClick={press((e) => minimize(e))} aria-label="Minimize the tip" title="Minimize">
            <Icon name="minus" size={18} stroke={2.5} />
          </button>
        </span>
      </div>
      {/* Every page sits in the same grid cell, so the card is as tall as its
          longest page and does not change height between pages. */}
      <div className="coach-pages">
        {tip.pages.map((x, i) => (
          <div key={`${tip.id}:${i}`} className={`coach-body${i === page ? ' on' : ''}`} aria-hidden={i !== page}>
            <h3>{x.title}</h3>
            <p>{x.body}</p>
          </div>
        ))}
      </div>
      <div className="coach-actions">
        {page > 0 && <button className="coach-back" onClick={press(() => setPage(page - 1))}>Back</button>}
        {pg.action && (
          <button className="btn small secondary coach-action" onClick={press((e) => { done(e, { now: true }); pg.action.onClick(); })}>{pg.action.label}</button>
        )}
        <button className="btn small gold" onClick={press((e) => (last ? done(e) : setPage(page + 1)))}>{last ? 'Got it' : 'Next'}</button>
      </div>
    </div>
    </>
  );
}

// State that survives a screen being unmounted and shown again (e.g. the selected tab).
const sticky = new Map();
export const resetSticky = () => {
  sticky.clear();
  try { Object.keys(sessionStorage).filter((k) => k.startsWith('acme-sticky-')).forEach((k) => sessionStorage.removeItem(k)); } catch { /* ignore */ }
};
/** Set a sticky value from outside the screen that uses it (e.g. the bottom tabs). */
export function setStickyValue(key, x) {
  sticky.set(key, x);
  try { sessionStorage.setItem(`acme-sticky-${key}`, JSON.stringify(x)); } catch { /* ignore */ }
}

export function useStickyState(key, initial) {
  const [v, setV] = useState(() => {
    if (sticky.has(key)) return sticky.get(key);
    try { const x = sessionStorage.getItem(`acme-sticky-${key}`); if (x) return JSON.parse(x); } catch { /* ignore */ }
    return initial;
  });
  const set = (x) => {
    sticky.set(key, x);
    try { sessionStorage.setItem(`acme-sticky-${key}`, JSON.stringify(x)); } catch { /* ignore */ }
    setV(x);
  };
  return [v, set];
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return [node, setMsg];
}

/** Full screen, where the browser allows it (Android Chrome, desktop browsers; not
 *  iPhone Safari, and not inside a frame that forbids it). Hidden when unavailable
 *  or already full screen. */
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsEnabled = () => {
  try { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); } catch { return false; }
};
export function FullscreenButton({ className = '' }) {
  const [on, setOn] = React.useState(() => !!fsElement());
  React.useEffect(() => {
    const f = () => setOn(!!fsElement());
    document.addEventListener('fullscreenchange', f);
    document.addEventListener('webkitfullscreenchange', f);
    return () => { document.removeEventListener('fullscreenchange', f); document.removeEventListener('webkitfullscreenchange', f); };
  }, []);
  if (on || !fsEnabled()) return null;
  const go = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    try { const r = req && req.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch { /* not allowed here */ }
  };
  return (
    <button className={`fs-btn ${className}`} onClick={go} aria-label="Full screen">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
      Full screen
    </button>
  );
}
